import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { getOrCreateMultiplayerClientId } from '@/src/services/multiplayer/clientIdentity';
import { getConvexUrl, isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { parseTurnScript } from '@/src/services/multiplayer/turnScriptUtils';
import { theme } from '@/src/styles/theme';
import { useMutation, useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MultiplayerSession = {
  roomId: string;
  roomCode: string;
  playerId: string;
};

type RoomPlayer = {
  id: string;
  name: string;
  characterId?: string;
  ready: boolean;
  status: 'active' | 'left';
  position: number;
  isHost: boolean;
  isCurrentTurn: boolean;
  online: boolean;
};

type RoomEvent = {
  id: string;
  sequence: number;
  eventVersion?: number;
  type: string;
  actorPlayerId?: string;
  turnId?: string;
  turnNumber?: number;
  phase?: string;
  payload?: unknown;
  createdAt: number;
};

type RoomState = {
  room: {
    id: string;
    code: string;
    protocolVersion: number;
    status: 'lobby' | 'playing' | 'finished';
    turnPhase: 'lobby' | 'awaiting_roll' | 'awaiting_ack' | 'finished';
    hostPlayerId?: string;
    currentTurnPlayerId?: string;
    currentTurnId?: string;
    turnNumber: number;
    boardLength: number;
    maxPlayers: number;
    phaseStartedAt: number;
    phaseDeadlineAt?: number;
  };
  latestSequence: number;
  me?: string;
  allReady: boolean;
  activeCount: number;
  slotsAvailable: number;
  pendingTurn?: {
    turnId: string;
    actorPlayerId: string;
    turnNumber: number;
    script?: unknown;
    deadlineAt?: number;
  } | null;
  players: RoomPlayer[];
  history: RoomEvent[];
};

type SessionByClient = {
  roomId: string;
  roomCode: string;
  playerId: string;
};

type MutationResult = {
  roomId: string;
  roomCode: string;
  playerId: string;
};

type EventsDeltaResult = {
  roomMissing: boolean;
  latestSequence: number;
  hasMore: boolean;
  requiresResync: boolean;
  events: RoomEvent[];
};

const PRESENCE_INTERVAL_MS = 20_000;
const AVATAR_CHARACTER_PREFIX = 'avatar:';

const sanitizeHexToken = (color: string): string => color.replace('#', '').slice(0, 6).toLowerCase();
const buildAvatarCharacterId = (palette: { shirtColor: string; hairColor: string; skinColor: string }): string =>
  `${AVATAR_CHARACTER_PREFIX}${sanitizeHexToken(palette.shirtColor)}-${sanitizeHexToken(
    palette.hairColor
  )}-${sanitizeHexToken(palette.skinColor)}`;

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Nao foi possivel concluir esta acao.';
};

const MultiplayerOverlayConnected: React.FC = () => {
  const insets = useSafeAreaInsets();
  const boardLength = useGameStore((state) => state.path.length);
  const setGameStatus = useGameStore((state) => state.setGameStatus);
  const setShowCustomization = useGameStore((state) => state.setShowCustomization);
  const showCustomization = useGameStore((state) => state.showCustomization);
  const shirtColor = useGameStore((state) => state.shirtColor);
  const hairColor = useGameStore((state) => state.hairColor);
  const skinColor = useGameStore((state) => state.skinColor);

  const createRoomMutation = useMutation(multiplayerApi.rooms.createRoom as FunctionReference<'mutation'>);
  const joinRoomMutation = useMutation(multiplayerApi.rooms.joinRoom as FunctionReference<'mutation'>);
  const setCharacterMutation = useMutation(multiplayerApi.rooms.setCharacter as FunctionReference<'mutation'>);
  const setReadyMutation = useMutation(multiplayerApi.rooms.setReady as FunctionReference<'mutation'>);
  const startGameMutation = useMutation(multiplayerApi.rooms.startGame as FunctionReference<'mutation'>);
  const rollTurnMutation = useMutation(multiplayerApi.rooms.rollTurn as FunctionReference<'mutation'>);
  const leaveRoomMutation = useMutation(multiplayerApi.rooms.leaveRoom as FunctionReference<'mutation'>);
  const touchPresenceMutation = useMutation(multiplayerApi.rooms.touchPresence as FunctionReference<'mutation'>);
  const ackTurnMutation = useMutation(multiplayerApi.rooms.ackTurnModal as FunctionReference<'mutation'>);

  const syncFromSnapshot = useMultiplayerRuntimeStore((state) => state.syncFromSnapshot);
  const applyTurnResolved = useMultiplayerRuntimeStore((state) => state.applyTurnResolved);
  const applyTurnStarted = useMultiplayerRuntimeStore((state) => state.applyTurnStarted);
  const setProcessedSequence = useMultiplayerRuntimeStore((state) => state.setProcessedSequence);
  const clearPendingTurn = useMultiplayerRuntimeStore((state) => state.clearPendingTurn);
  const resetRuntime = useMultiplayerRuntimeStore((state) => state.reset);
  const pendingTurnForMe = useMultiplayerRuntimeStore((state) => state.pendingTurnForMe);
  // Keep a mutable cursor for dedupe while the subscription advances in batches.
  const processedSequenceRef = useRef(0);
  const actionMessage = useMultiplayerRuntimeStore((state) => state.actionMessage);

  const [clientId, setClientId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<MultiplayerSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [awaitingCharacterSetup, setAwaitingCharacterSetup] = useState(false);
  const [ackErrorMessage, setAckErrorMessage] = useState<string | null>(null);
  const [eventsAfterSequence, setEventsAfterSequence] = useState<number | null>(null);

  const didAutoResume = useRef(false);
  const activeRoomIdRef = useRef<string | null>(null);
  const draftCharacterId = useMemo(
    () =>
      buildAvatarCharacterId({
        shirtColor,
        hairColor,
        skinColor,
      }),
    [hairColor, shirtColor, skinColor]
  );

  useEffect(() => {
    let cancelled = false;

    void getOrCreateMultiplayerClientId()
      .then((id) => {
        if (!cancelled) setClientId(id);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      resetRuntime();
    };
  }, [resetRuntime]);

  const latestSession = useQuery(
    multiplayerApi.rooms.getLatestSessionForClient as FunctionReference<'query'>,
    clientId && !session ? { clientId } : 'skip'
  ) as SessionByClient | null | undefined;

  const roomState = useQuery(
    multiplayerApi.rooms.getRoomState as FunctionReference<'query'>,
    session && clientId ? { roomId: session.roomId, clientId } : 'skip'
  ) as RoomState | null | undefined;

  const eventsDelta = useQuery(
    multiplayerApi.rooms.getRoomEventsSince as FunctionReference<'query'>,
    session && eventsAfterSequence !== null
      ? { roomId: session.roomId, afterSequence: eventsAfterSequence, limit: 120 }
      : 'skip'
  ) as EventsDeltaResult | undefined;

  useEffect(() => {
    if (session || !latestSession || didAutoResume.current) return;
    didAutoResume.current = true;
    setSession({
      roomId: latestSession.roomId,
      roomCode: latestSession.roomCode,
      playerId: latestSession.playerId,
    });
    setInfoMessage(`Sessao retomada na sala ${latestSession.roomCode}.`);
  }, [latestSession, session]);

  useEffect(() => {
    const nextRoomId = session?.roomId ?? null;
    if (activeRoomIdRef.current === nextRoomId) return;

    activeRoomIdRef.current = nextRoomId;
    processedSequenceRef.current = 0;
    setEventsAfterSequence(null);
    resetRuntime();
  }, [resetRuntime, session?.roomId]);

  useEffect(() => {
    if (!roomState || !session) return;
    syncFromSnapshot(roomState);
  }, [roomState, session, syncFromSnapshot]);

  useEffect(() => {
    if (!roomState || !session || eventsAfterSequence !== null) return;

    const latestSequence = Math.max(0, roomState.latestSequence);
    processedSequenceRef.current = latestSequence;
    setProcessedSequence(latestSequence);
    setEventsAfterSequence(latestSequence);
  }, [eventsAfterSequence, roomState, session, setProcessedSequence]);

  useEffect(() => {
    if (!session) return;
    if (roomState !== null) return;

    processedSequenceRef.current = 0;
    setEventsAfterSequence(null);
    setSession(null);
    setShowCustomization(false);
    setAwaitingCharacterSetup(false);
    resetRuntime();
    setErrorMessage('A sala nao esta mais disponivel.');
  }, [resetRuntime, roomState, session, setShowCustomization]);

  useEffect(() => {
    if (!eventsDelta || !session) return;
    if (eventsDelta.roomMissing) return;

    if (eventsDelta.requiresResync && roomState?.latestSequence) {
      const resyncSequence = Math.max(processedSequenceRef.current, roomState.latestSequence);
      processedSequenceRef.current = resyncSequence;
      setProcessedSequence(resyncSequence);
      setEventsAfterSequence(resyncSequence);
      return;
    }

    let nextProcessedSequence = processedSequenceRef.current;

    for (const event of eventsDelta.events) {
      if (event.sequence <= nextProcessedSequence) continue;

      const payload = toRecord(event.payload);

      if (event.type === 'turn_resolved') {
        const script = parseTurnScript(payload);
        if (script) {
          applyTurnResolved(script);
        }
      } else if (event.type === 'turn_started') {
        if (typeof payload.playerId === 'string') {
          applyTurnStarted(payload.playerId);
        }
      } else if (event.type === 'game_finished') {
        clearPendingTurn(event.turnId);
      }

      nextProcessedSequence = event.sequence;
    }

    if (nextProcessedSequence === processedSequenceRef.current) return;

    processedSequenceRef.current = nextProcessedSequence;
    setProcessedSequence(nextProcessedSequence);
    setEventsAfterSequence(nextProcessedSequence);
  }, [
    applyTurnResolved,
    applyTurnStarted,
    clearPendingTurn,
    eventsDelta,
    roomState?.latestSequence,
    session,
    setProcessedSequence,
  ]);

  useEffect(() => {
    if (!session || !clientId) return;

    const sendHeartbeat = () =>
      touchPresenceMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
      }).catch(() => {
        // handled by next room snapshot
      });

    void sendHeartbeat();
    const interval = setInterval(sendHeartbeat, PRESENCE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [clientId, session, touchPresenceMutation]);

  const me = useMemo(() => {
    if (!roomState || !session) return null;
    return roomState.players.find((player) => player.id === session.playerId) ?? null;
  }, [roomState, session]);

  const activePlayers = useMemo(
    () => roomState?.players.filter((player) => player.status === 'active') ?? [],
    [roomState]
  );
  const canStart = Boolean(
    roomState &&
      roomState.room.status === 'lobby' &&
      me?.isHost &&
      roomState.allReady &&
      roomState.activeCount >= 2
  );
  const canMarkReady = Boolean(
    roomState && roomState.room.status === 'lobby' && me?.status === 'active' && me.characterId
  );
  const canRoll = Boolean(
    roomState &&
      roomState.room.status === 'playing' &&
      roomState.room.turnPhase === 'awaiting_roll' &&
      me?.status === 'active' &&
      me.isCurrentTurn
  );
  const isWatching = Boolean(roomState?.room.status === 'playing' && !me?.isCurrentTurn);
  const currentTurnName =
    activePlayers.find((player) => player.id === roomState?.room.currentTurnPlayerId)?.name ?? 'Jogador';

  useEffect(() => {
    if (!awaitingCharacterSetup || showCustomization) return;
    if (!session || !clientId || !me || me.characterId || roomState?.room.status !== 'lobby') {
      setAwaitingCharacterSetup(false);
      return;
    }

    let cancelled = false;
    const applyCharacter = async () => {
      try {
        setBusyAction('character');
        setErrorMessage(null);
        await setCharacterMutation({
          roomId: session.roomId,
          playerId: session.playerId,
          clientId,
          characterId: draftCharacterId,
        });
        if (!cancelled) setInfoMessage('Avatar personalizado selecionado.');
      } catch (error) {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setBusyAction(null);
          setAwaitingCharacterSetup(false);
        }
      }
    };

    void applyCharacter();
    return () => {
      cancelled = true;
    };
  }, [
    awaitingCharacterSetup,
    clientId,
    draftCharacterId,
    me,
    roomState?.room.status,
    session,
    setCharacterMutation,
    showCustomization,
  ]);

  const leaveRoomAndOptionallyBack = async (backToMenu: boolean) => {
    if (!session || !clientId) {
      if (backToMenu) setGameStatus('menu');
      return;
    }

    try {
      setBusyAction('leave');
      await leaveRoomMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
      });
      processedSequenceRef.current = 0;
      setEventsAfterSequence(null);
      setSession(null);
      setAwaitingCharacterSetup(false);
      setShowCustomization(false);
      resetRuntime();
      if (backToMenu) setGameStatus('menu');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateRoom = async () => {
    if (!clientId) return;
    try {
      setBusyAction('create');
      setErrorMessage(null);
      const result = (await createRoomMutation({
        clientId,
        name: playerName.trim() || undefined,
        boardLength,
      })) as MutationResult;
      setJoinCode('');
      setSession({
        roomId: result.roomId,
        roomCode: result.roomCode,
        playerId: result.playerId,
      });
      setInfoMessage(`Sala ${result.roomCode} criada.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinRoom = async () => {
    if (!clientId) return;
    try {
      setBusyAction('join');
      setErrorMessage(null);
      const result = (await joinRoomMutation({
        clientId,
        roomCode: joinCode.trim().toUpperCase(),
        name: playerName.trim() || undefined,
      })) as MutationResult;
      setSession({
        roomId: result.roomId,
        roomCode: result.roomCode,
        playerId: result.playerId,
      });
      setInfoMessage(`Conectado a sala ${result.roomCode}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleReady = async () => {
    if (!session || !clientId || !me) return;
    try {
      setBusyAction('ready');
      setErrorMessage(null);
      await setReadyMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
        ready: !me.ready,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartGame = async () => {
    if (!session || !clientId) return;
    try {
      setBusyAction('start');
      setErrorMessage(null);
      await startGameMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
        boardLength,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRoll = async () => {
    if (!session || !clientId) return;
    try {
      setBusyAction('roll');
      setErrorMessage(null);
      await rollTurnMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAckPendingTurn = async () => {
    if (!session || !clientId || !pendingTurnForMe) return;
    try {
      setBusyAction('ack');
      setAckErrorMessage(null);
      await ackTurnMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
        turnId: pendingTurnForMe.turnId,
      });
      clearPendingTurn(pendingTurnForMe.turnId);
      setInfoMessage('Jogada confirmada. Aguardando proximo turno...');
    } catch (error) {
      // Show error inside the pending turn modal so user can retry.
      setAckErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const openCustomizationForLobby = () => {
    if (!me || roomState?.room.status !== 'lobby' || me.characterId) return;
    if (busyAction) return;
    setAwaitingCharacterSetup(true);
    setShowCustomization(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>MULTIPLAYER</Text>
          <Text style={styles.subtitle}>{session ? `Sala ${session.roomCode}` : 'Crie ou entre em uma sala'}</Text>
        </View>

        <AnimatedButton
          onPress={() => {
            if (session) {
              void leaveRoomAndOptionallyBack(true);
              return;
            }
            setGameStatus('menu');
          }}
          style={styles.backButton}
          hapticStyle="light"
          testID="btn-back-from-multiplayer"
        >
          <View style={styles.backButtonContent}>
            <AppIcon name="arrow-left" size={14} color={COLORS.text} />
            <Text style={styles.backButtonText}>Menu</Text>
          </View>
        </AnimatedButton>
      </View>

      {!isConvexConfigured && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Convex nao configurado</Text>
          <Text style={styles.warningText}>
            Defina a variavel `EXPO_PUBLIC_CONVEX_URL` para habilitar partidas multiplayer.
          </Text>
          <Text style={styles.warningText}>URL atual: {getConvexUrl() || '(vazio)'}</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {infoMessage && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{infoMessage}</Text>
        </View>
      )}

      {!isConvexConfigured ? null : !clientId ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingLabel}>Carregando identidade...</Text>
        </View>
      ) : !session ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seu nome (opcional)</Text>
            <TextInput
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Digite seu nome"
              placeholderTextColor="#8F7A66"
              style={styles.input}
              maxLength={26}
              autoCapitalize="words"
            />
            <AnimatedButton
              onPress={handleCreateRoom}
              disabled={busyAction !== null}
              style={styles.primaryButton}
              hapticStyle="medium"
              testID="btn-create-room"
            >
              <View style={styles.buttonInner}>
                <AppIcon name="plus" size={14} color="#FFF" />
                <Text style={styles.primaryButtonText}>Criar sala</Text>
              </View>
            </AnimatedButton>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Entrar em sala</Text>
            <TextInput
              value={joinCode}
              onChangeText={(value) => setJoinCode(value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
              placeholder="ABC"
              placeholderTextColor="#8F7A66"
              style={styles.input}
              maxLength={3}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <AnimatedButton
              onPress={handleJoinRoom}
              disabled={busyAction !== null || joinCode.length !== 3}
              style={styles.secondaryButton}
              hapticStyle="medium"
              testID="btn-join-room"
            >
              <View style={styles.buttonInner}>
                <AppIcon name="right-to-bracket" size={14} color={COLORS.text} />
                <Text style={styles.secondaryButtonText}>Entrar</Text>
              </View>
            </AnimatedButton>
          </View>
        </ScrollView>
      ) : roomState === undefined ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingLabel}>Sincronizando sala...</Text>
        </View>
      ) : roomState === null ? (
        <View style={styles.centeredState}>
          <Text style={styles.loadingLabel}>Sala encerrada.</Text>
        </View>
      ) : roomState.room.status === 'lobby' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Lobby ({roomState.activeCount}/{roomState.room.maxPlayers})
            </Text>
            <Text style={styles.metaText}>Codigo da sala: {roomState.room.code}</Text>
            <Text style={styles.metaText}>Host inicia quando todos estiverem Pronto.</Text>
            {activePlayers.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.metaText}>
                  {player.characterId ? 'Avatar ok' : 'Sem avatar'} • {player.ready ? 'Pronto' : 'Aguardando'}
                </Text>
              </View>
            ))}
          </View>

          {me && !me.characterId && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Escolha seu personagem (apenas no setup)</Text>
              <Text style={styles.metaText}>Use a personalizacao para definir roupa, cabelo e pele.</Text>
              <View style={styles.palettePreviewRow}>
                <View style={[styles.paletteSwatch, { backgroundColor: shirtColor }]} />
                <View style={[styles.paletteSwatch, { backgroundColor: hairColor }]} />
                <View style={[styles.paletteSwatch, { backgroundColor: skinColor }]} />
              </View>
              <AnimatedButton
                onPress={openCustomizationForLobby}
                disabled={busyAction !== null || awaitingCharacterSetup}
                style={styles.secondaryButton}
                hapticStyle="light"
              >
                <View style={styles.buttonInner}>
                  <AppIcon name="shirt" size={14} color={COLORS.text} />
                  <Text style={styles.secondaryButtonText}>
                    {busyAction === 'character' || awaitingCharacterSetup ? 'Salvando...' : 'Abrir personalizacao'}
                  </Text>
                </View>
              </AnimatedButton>
            </View>
          )}

          <View style={styles.actionRow}>
            <AnimatedButton
              onPress={handleToggleReady}
              disabled={busyAction !== null || !canMarkReady}
              style={[styles.secondaryButton, me?.ready && styles.primaryButton]}
              hapticStyle="medium"
              testID="btn-ready"
            >
              <View style={styles.buttonInner}>
                <Text style={me?.ready ? styles.primaryButtonText : styles.secondaryButtonText}>
                  {me?.ready ? 'Cancelar pronto' : 'Pronto'}
                </Text>
              </View>
            </AnimatedButton>

            {me?.isHost && (
              <AnimatedButton
                onPress={handleStartGame}
                disabled={busyAction !== null || !canStart}
                style={styles.primaryButton}
                hapticStyle="success"
                testID="btn-start-multiplayer-game"
              >
                <View style={styles.buttonInner}>
                  <AppIcon name="play" size={14} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Iniciar partida</Text>
                </View>
              </AnimatedButton>
            )}
          </View>
        </ScrollView>
      ) : roomState.room.status === 'playing' ? (
        <View style={styles.playingHudRoot}>
          <View style={styles.playingTopCard}>
            <Text style={styles.sectionTitle}>Turno {roomState.room.turnNumber}</Text>
            <Text style={styles.metaText}>
              {roomState.room.turnPhase === 'awaiting_roll'
                ? `Vez de ${currentTurnName}`
                : `Resolucao da jogada de ${currentTurnName}`}
            </Text>
            {actionMessage ? <Text style={styles.metaText}>{actionMessage}</Text> : null}
            {isWatching && <Text style={styles.watchText}>{currentTurnName} esta jogando agora.</Text>}
          </View>

          {pendingTurnForMe && (
            <View style={styles.modalCard}>
              <Text style={styles.sectionTitle}>Resultado da jogada</Text>
              <Text style={styles.metaText}>Dado: {pendingTurnForMe.roll.value}</Text>
              <Text style={styles.metaText}>
                Casa final: {(pendingTurnForMe.movement.finalIndex ?? 0) + 1}
              </Text>
              {pendingTurnForMe.landingTile?.text ? (
                <Text style={styles.metaText}>{pendingTurnForMe.landingTile.text}</Text>
              ) : null}
              {ackErrorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{ackErrorMessage}</Text>
                </View>
              ) : null}
              <AnimatedButton
                onPress={() => { void handleAckPendingTurn(); }}
                disabled={busyAction !== null}
                style={styles.primaryButton}
                hapticStyle="success"
                testID="btn-ack-multiplayer-turn"
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.primaryButtonText}>
                    {ackErrorMessage ? 'Tentar novamente' : 'Continuar turno'}
                  </Text>
                </View>
              </AnimatedButton>
            </View>
          )}

          <View style={styles.bottomDock}>
            <AnimatedButton
              onPress={handleRoll}
              disabled={busyAction !== null || !canRoll}
              style={[styles.primaryButton, (!canRoll || busyAction) && styles.blockedButton]}
              hapticStyle="heavy"
              testID="btn-roll-multiplayer-turn"
            >
              <View style={styles.buttonInner}>
                <AppIcon name="dice" size={14} color="#FFF" />
                <Text style={styles.primaryButtonText}>
                  {canRoll ? 'Rolar dado' : roomState.room.turnPhase === 'awaiting_ack' ? 'Aguardando confirmacao' : `${currentTurnName} jogando`}
                </Text>
              </View>
            </AnimatedButton>

            <AnimatedButton
              onPress={() => {
                void leaveRoomAndOptionallyBack(false);
              }}
              disabled={busyAction !== null}
              style={styles.secondaryButton}
              hapticStyle="light"
              testID="btn-leave-multiplayer-room"
            >
              <View style={styles.buttonInner}>
                <Text style={styles.secondaryButtonText}>Sair da sala</Text>
              </View>
            </AnimatedButton>
          </View>
        </View>
      ) : (
        <View style={styles.centeredState}>
          <Text style={styles.sectionTitle}>Partida encerrada</Text>
          <AnimatedButton
            onPress={() => {
              void leaveRoomAndOptionallyBack(true);
            }}
            style={styles.secondaryButton}
            hapticStyle="light"
          >
            <View style={styles.buttonInner}>
              <Text style={styles.secondaryButtonText}>Voltar ao menu</Text>
            </View>
          </AnimatedButton>
        </View>
      )}
    </View>
  );
};

const MultiplayerOverlayUnavailable: React.FC = () => {
  const insets = useSafeAreaInsets();
  const setGameStatus = useGameStore((state) => state.setGameStatus);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>MULTIPLAYER</Text>
          <Text style={styles.subtitle}>Crie ou entre em uma sala</Text>
        </View>
        <AnimatedButton onPress={() => setGameStatus('menu')} style={styles.backButton} hapticStyle="light">
          <View style={styles.backButtonContent}>
            <AppIcon name="arrow-left" size={14} color={COLORS.text} />
            <Text style={styles.backButtonText}>Menu</Text>
          </View>
        </AnimatedButton>
      </View>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Convex nao configurado</Text>
        <Text style={styles.warningText}>Defina `EXPO_PUBLIC_CONVEX_URL` para habilitar partidas multiplayer.</Text>
        <Text style={styles.warningText}>URL atual: {getConvexUrl() || '(vazio)'}</Text>
      </View>
    </View>
  );
};

export const MultiplayerOverlay: React.FC = () => {
  if (!isConvexConfigured) {
    return <MultiplayerOverlayUnavailable />;
  }
  return <MultiplayerOverlayConnected />;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D1B0F',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#694A2D',
  },
  backButton: {
    borderWidth: 2,
    borderColor: '#4D2A16',
    borderRadius: 12,
    backgroundColor: '#FBEEDC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    color: '#3C2818',
    fontWeight: '900',
  },
  warningBox: {
    borderWidth: 2,
    borderColor: '#A66A3A',
    borderRadius: 12,
    backgroundColor: '#FFF2E8',
    padding: 10,
    gap: 4,
  },
  warningTitle: {
    color: '#6D2C00',
    fontWeight: '900',
  },
  warningText: {
    color: '#6D4F34',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    borderWidth: 1,
    borderColor: '#9A1B1B',
    backgroundColor: '#FFE9E9',
    borderRadius: 10,
    padding: 8,
  },
  errorText: {
    color: '#7A1414',
    fontWeight: '700',
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#155A8A',
    backgroundColor: '#EAF6FF',
    borderRadius: 10,
    padding: 8,
  },
  infoText: {
    color: '#0B4870',
    fontWeight: '700',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: {
    color: '#4B311B',
    fontWeight: '700',
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 16,
  },
  card: {
    borderWidth: 2,
    borderColor: '#56351F',
    borderRadius: 14,
    backgroundColor: '#FBEEDC',
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: '#2D1B0F',
    fontWeight: '900',
    fontSize: 15,
  },
  metaText: {
    color: '#6D4F34',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 2,
    borderColor: '#8F6A46',
    borderRadius: 10,
    backgroundColor: '#FFF',
    color: '#2D1B0F',
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E4C2A',
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5A3A22',
    backgroundColor: '#FFF4E8',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#3C2818',
    fontWeight: '900',
    fontSize: 13,
  },
  blockedButton: {
    opacity: 0.65,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  playerRow: {
    borderWidth: 1,
    borderColor: '#C8A884',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#FFF',
    gap: 2,
  },
  playerName: {
    color: '#2D1B0F',
    fontWeight: '900',
    fontSize: 13,
  },
  palettePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paletteSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#4B311B',
  },
  playingHudRoot: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  playingTopCard: {
    borderWidth: 2,
    borderColor: '#4D2A16',
    borderRadius: 14,
    backgroundColor: '#FBEEDC',
    padding: 12,
    gap: 4,
    maxWidth: 320,
  },
  watchText: {
    color: '#1E4C2A',
    fontWeight: '900',
    marginTop: 2,
  },
  modalCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 2,
    borderColor: '#5A3A22',
    borderRadius: 14,
    backgroundColor: '#FFF8EF',
    padding: 12,
    gap: 8,
  },
  bottomDock: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#4D2A16',
    borderRadius: theme.borderRadius.xl,
    backgroundColor: '#FBEEDC',
    padding: 12,
    gap: 8,
  },
});
