import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { getOrCreateMultiplayerClientId } from '@/src/services/multiplayer/clientIdentity';
import { getConvexUrl, isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { theme } from '@/src/styles/theme';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  orderRoll?: number;
  orderRank?: number;
  isHost: boolean;
  isCurrentTurn: boolean;
  online: boolean;
};

type RoomEvent = {
  id: string;
  type: string;
  actorPlayerId?: string;
  payload?: unknown;
  createdAt: number;
};

type RoomState = {
  room: {
    id: string;
    code: string;
    status: 'lobby' | 'playing' | 'finished';
    hostPlayerId?: string;
    currentTurnPlayerId?: string;
    turnNumber: number;
    boardLength: number;
    maxPlayers: number;
  };
  me?: string;
  allReady: boolean;
  activeCount: number;
  slotsAvailable: number;
  players: RoomPlayer[];
  history: RoomEvent[];
};

type PositionCluster = {
  position: number;
  visiblePlayers: RoomPlayer[];
  hiddenCount: number;
  hasMe: boolean;
  isFocusCluster: boolean;
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

const CHARACTER_OPTIONS = [
  { id: 'agente', label: 'Agente' },
  { id: 'atleta', label: 'Atleta' },
  { id: 'artista', label: 'Artista' },
  { id: 'cientista', label: 'Cientista' },
];

const PRESENCE_INTERVAL_MS = 20_000;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Nao foi possivel concluir esta acao.';
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const getPlayerName = (playersById: Record<string, string>, playerId: unknown): string => {
  if (typeof playerId !== 'string') return 'Sistema';
  return playersById[playerId] ?? 'Jogador';
};

const formatHistoryEvent = (event: RoomEvent, playersById: Record<string, string>): string => {
  const payload = toRecord(event.payload);

  if (event.type === 'player_joined') {
    return `${getPlayerName(playersById, payload.playerId)} entrou na sala.`;
  }

  if (event.type === 'player_rejoined') {
    return `${getPlayerName(playersById, payload.playerId)} retornou para a sala.`;
  }

  if (event.type === 'player_left') {
    return `${getPlayerName(playersById, payload.playerId)} saiu da sala.`;
  }

  if (event.type === 'character_selected') {
    const character = typeof payload.characterId === 'string' ? payload.characterId : 'personagem';
    return `${getPlayerName(playersById, payload.playerId)} escolheu ${character}.`;
  }

  if (event.type === 'player_ready_changed') {
    const ready = Boolean(payload.ready);
    return `${getPlayerName(playersById, payload.playerId)} ${ready ? 'marcou Pronto' : 'desmarcou Pronto'}.`;
  }

  if (event.type === 'turn_order_defined') {
    return 'Ordem inicial definida pelo dado (sem valores repetidos).';
  }

  if (event.type === 'turn_started') {
    return `Turno de ${getPlayerName(playersById, payload.playerId)}.`;
  }

  if (event.type === 'dice_rolled') {
    const value = typeof payload.value === 'number' ? payload.value : '?';
    const toIndex = typeof payload.toIndex === 'number' ? payload.toIndex : 0;
    return `${getPlayerName(playersById, payload.playerId)} rolou ${value} e foi para a casa ${toIndex + 1}.`;
  }

  if (event.type === 'game_finished') {
    return `${getPlayerName(playersById, payload.winnerPlayerId)} venceu a partida.`;
  }

  if (event.type === 'host_changed') {
    return `${getPlayerName(playersById, payload.hostPlayerId)} agora e o host.`;
  }

  if (event.type === 'game_started') {
    return 'Partida iniciada pelo host.';
  }

  if (event.type === 'room_created') {
    return 'Sala criada.';
  }

  return event.type;
};

export const MultiplayerOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const setGameStatus = useGameStore((state) => state.setGameStatus);
  const boardLength = useGameStore((state) => state.path.length);

  const createRoomMutation = useMutation(multiplayerApi.rooms.createRoom as any);
  const joinRoomMutation = useMutation(multiplayerApi.rooms.joinRoom as any);
  const setCharacterMutation = useMutation(multiplayerApi.rooms.setCharacter as any);
  const setReadyMutation = useMutation(multiplayerApi.rooms.setReady as any);
  const startGameMutation = useMutation(multiplayerApi.rooms.startGame as any);
  const rollTurnMutation = useMutation(multiplayerApi.rooms.rollTurn as any);
  const leaveRoomMutation = useMutation(multiplayerApi.rooms.leaveRoom as any);
  const touchPresenceMutation = useMutation(multiplayerApi.rooms.touchPresence as any);

  const [clientId, setClientId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<MultiplayerSession | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const didAutoResume = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void getOrCreateMultiplayerClientId()
      .then((id) => {
        if (cancelled) return;
        setClientId(id);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestSession = useQuery(
    multiplayerApi.rooms.getLatestSessionForClient as any,
    clientId && !session ? { clientId } : 'skip'
  ) as SessionByClient | null | undefined;

  const roomState = useQuery(
    multiplayerApi.rooms.getRoomState as any,
    session && clientId
      ? {
          roomId: session.roomId,
          clientId,
        }
      : 'skip'
  ) as RoomState | null | undefined;

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
    if (!session) return;
    if (roomState !== null) return;

    setSession(null);
    setSelectedCharacter(null);
    setErrorMessage('A sala nao esta mais disponivel.');
  }, [roomState, session]);

  useEffect(() => {
    if (!session || !clientId) return;

    const sendHeartbeat = () =>
      touchPresenceMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
      }).catch(() => {
        // Keep the current UI; eventual mutations/queries will expose disconnect issues.
      });

    void sendHeartbeat();
    const interval = setInterval(sendHeartbeat, PRESENCE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [clientId, session, touchPresenceMutation]);

  const me = useMemo(() => {
    if (!roomState || !session) return null;
    return roomState.players.find((player) => player.id === session.playerId) ?? null;
  }, [roomState, session]);

  useEffect(() => {
    if (!me?.characterId) return;
    setSelectedCharacter(me.characterId);
  }, [me?.characterId]);

  const playersById = useMemo(() => {
    if (!roomState) return {} as Record<string, string>;

    return roomState.players.reduce<Record<string, string>>((acc, player) => {
      acc[player.id] = player.name;
      return acc;
    }, {});
  }, [roomState]);

  const winnerName = useMemo(() => {
    if (!roomState || roomState.room.status !== 'finished') return null;

    const event = [...roomState.history]
      .reverse()
      .find((entry) => entry.type === 'game_finished');

    if (!event) return null;
    const payload = toRecord(event.payload);
    return getPlayerName(playersById, payload.winnerPlayerId);
  }, [playersById, roomState]);

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

  const canRollTurn = Boolean(
    roomState && roomState.room.status === 'playing' && me?.status === 'active' && me.isCurrentTurn
  );

  const activePlayers = useMemo(
    () => roomState?.players.filter((player) => player.status === 'active') ?? [],
    [roomState]
  );

  const allPlayersAtStart = activePlayers.length > 0 && activePlayers.every((player) => player.position === 0);

  const focusedActionPlayerId = useMemo(() => {
    if (!roomState) return me?.id ?? null;
    if (roomState.room.status !== 'playing') return me?.id ?? null;

    if (roomState.room.currentTurnPlayerId && roomState.room.currentTurnPlayerId !== me?.id) {
      return roomState.room.currentTurnPlayerId;
    }

    return me?.id ?? roomState.room.currentTurnPlayerId ?? null;
  }, [me?.id, roomState]);

  const actionPlayerName = getPlayerName(
    playersById,
    focusedActionPlayerId ?? roomState?.room.currentTurnPlayerId
  );

  const positionClusters = useMemo<PositionCluster[]>(() => {
    if (!roomState || activePlayers.length === 0) {
      return [];
    }

    const grouped = new Map<number, RoomPlayer[]>();
    for (const player of activePlayers) {
      const bucket = grouped.get(player.position) ?? [];
      bucket.push(player);
      grouped.set(player.position, bucket);
    }

    return Array.from(grouped.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([position, players]) => {
        const hasMe = Boolean(me && players.some((player) => player.id === me.id));
        let visiblePlayers = players;
        let hiddenCount = 0;

        if (hasMe && players.length > 1) {
          const preferredVisiblePlayerId =
            roomState.room.currentTurnPlayerId &&
            roomState.room.currentTurnPlayerId !== me?.id &&
            players.some((player) => player.id === roomState.room.currentTurnPlayerId)
              ? roomState.room.currentTurnPlayerId
              : me?.id;

          if (preferredVisiblePlayerId) {
            visiblePlayers = players.filter((player) => player.id === preferredVisiblePlayerId);
            hiddenCount = players.length - visiblePlayers.length;
          }
        }

        return {
          position,
          visiblePlayers,
          hiddenCount,
          hasMe,
          isFocusCluster: Boolean(
            focusedActionPlayerId && visiblePlayers.some((player) => player.id === focusedActionPlayerId)
          ),
        };
      });
  }, [activePlayers, focusedActionPlayerId, me, roomState]);

  const roomStatus = roomState?.room.status;
  const jumpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (roomStatus !== 'playing') {
      jumpAnim.stopAnimation();
      jumpAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(jumpAnim, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(jumpAnim, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [jumpAnim, roomStatus, focusedActionPlayerId]);

  const clearFeedback = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleCreateRoom = async () => {
    if (!clientId) return;

    try {
      clearFeedback();
      setBusyAction('create');

      const result = (await createRoomMutation({
        clientId,
        name: playerName.trim() || undefined,
        boardLength,
      })) as MutationResult;

      setSession({
        roomId: result.roomId,
        roomCode: result.roomCode,
        playerId: result.playerId,
      });
      setJoinCode('');
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
      clearFeedback();
      setBusyAction('join');

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

  const handleSelectCharacter = async (characterId: string) => {
    if (!session || !clientId || !me || me.characterId) return;

    try {
      clearFeedback();
      setBusyAction('character');

      await setCharacterMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
        characterId,
      });

      setSelectedCharacter(characterId);
      setInfoMessage(`Personagem ${characterId} selecionado.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleReady = async () => {
    if (!session || !clientId || !me) return;

    try {
      clearFeedback();
      setBusyAction('ready');

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
      clearFeedback();
      setBusyAction('start');

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

  const handleRollTurn = async () => {
    if (!session || !clientId) return;

    try {
      clearFeedback();
      setBusyAction('roll');

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

  const handleLeaveRoom = async (backToMenu: boolean) => {
    if (!session || !clientId) {
      if (backToMenu) setGameStatus('menu');
      return;
    }

    try {
      clearFeedback();
      setBusyAction('leave');

      await leaveRoomMutation({
        roomId: session.roomId,
        playerId: session.playerId,
        clientId,
      });

      setSession(null);
      setSelectedCharacter(null);
      if (backToMenu) {
        setGameStatus('menu');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const historyRows = roomState?.history.slice(-24) ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>MULTIPLAYER</Text>
          {session ? (
            <Text style={styles.subtitle}>Sala {session.roomCode}</Text>
          ) : (
            <Text style={styles.subtitle}>Crie ou entre em uma sala</Text>
          )}
        </View>

        <AnimatedButton
          onPress={() => {
            if (session) {
              void handleLeaveRoom(true);
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
          <Text style={styles.loadingLabel}>Carregando identidade do jogador...</Text>
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
              testID="input-multiplayer-name"
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
              testID="input-room-code"
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

          <Text style={styles.hintText}>
            Partidas suportam ate 4 jogadores por sala. O host inicia quando todos estiverem Pronto.
          </Text>
        </ScrollView>
      ) : roomState === undefined ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingLabel}>Sincronizando sala...</Text>
        </View>
      ) : roomState === null ? (
        <View style={styles.centeredState}>
          <Text style={styles.loadingLabel}>Sala encerrada.</Text>
          <AnimatedButton
            onPress={() => setGameStatus('menu')}
            style={styles.secondaryButton}
            hapticStyle="light"
          >
            <View style={styles.buttonInner}>
              <Text style={styles.secondaryButtonText}>Voltar ao menu</Text>
            </View>
          </AnimatedButton>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.roomMetaCard}>
            <Text style={styles.roomCodeLabel}>CODIGO DA SALA</Text>
            <Text style={styles.roomCodeValue}>{roomState.room.code}</Text>
            <Text style={styles.roomCodeHint}>Compartilhe este codigo de 3 letras para convidar outros jogadores.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Palco da rodada</Text>
            <Text style={styles.metaText}>
              {roomState.room.status === 'lobby'
                ? 'Jogadores alinhados lado a lado antes da primeira casa.'
                : focusedActionPlayerId === me?.id
                ? 'Outros jogadores em fade enquanto voce joga.'
                : `${actionPlayerName} esta jogando agora.`}
            </Text>

            {(roomState.room.status === 'lobby' || allPlayersAtStart) && (
              <View style={styles.startLineRow}>
                {activePlayers.map((player) => {
                  const shouldFade =
                    roomState.room.status === 'playing' &&
                    Boolean(focusedActionPlayerId) &&
                    player.id !== focusedActionPlayerId;

                  const isFocused = Boolean(
                    roomState.room.status === 'playing' &&
                      focusedActionPlayerId &&
                      player.id === focusedActionPlayerId
                  );

                  return (
                    <Animated.View
                      key={`line-${player.id}`}
                      style={[
                        styles.startLineToken,
                        player.isHost && styles.startLineTokenHost,
                        shouldFade && styles.stageFadeToken,
                        isFocused && {
                          transform: [
                            {
                              translateY: jumpAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -8],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.startLineTokenName}>{player.name}</Text>
                      <Text style={styles.startLineTokenMeta}>{player.characterId ?? 'sem personagem'}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {roomState.room.status === 'playing' && (
              <View style={styles.trackRow}>
                {positionClusters.map((cluster) => (
                  <View
                    key={`cluster-${cluster.position}`}
                    style={[styles.trackCluster, cluster.isFocusCluster && styles.trackClusterFocused]}
                  >
                    <Text style={styles.trackClusterLabel}>
                      {cluster.position === 0 ? 'Largada' : `Casa ${cluster.position + 1}`}
                    </Text>

                    <View style={styles.trackClusterTokens}>
                      {cluster.visiblePlayers.map((player) => {
                        const shouldFade =
                          focusedActionPlayerId && roomState.room.currentTurnPlayerId
                            ? player.id !== focusedActionPlayerId
                            : false;
                        const isFocused = player.id === focusedActionPlayerId;

                        return (
                          <Animated.View
                            key={`cluster-player-${player.id}`}
                            style={[
                              styles.trackToken,
                              player.id === me?.id && styles.trackTokenMe,
                              shouldFade && styles.stageFadeToken,
                              isFocused && {
                                transform: [
                                  {
                                    translateY: jumpAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, -8],
                                    }),
                                  },
                                ],
                              },
                            ]}
                          >
                            <Text style={styles.trackTokenName}>{player.name}</Text>
                          </Animated.View>
                        );
                      })}

                      {cluster.hiddenCount > 0 && (
                        <View style={styles.trackBubble}>
                          <Text style={styles.trackBubbleText}>+{cluster.hiddenCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {roomState.room.status === 'playing' && !me?.isCurrentTurn && (
              <View style={styles.turnWatchBanner}>
                <AppIcon name="hourglass-half" size={12} color="#FFF" />
                <Text style={styles.turnWatchBannerText}>{actionPlayerName} esta jogando...</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Jogadores ({roomState.activeCount}/{roomState.room.maxPlayers})</Text>
              <Text style={styles.metaText}>{roomState.room.status === 'lobby' ? 'Lobby' : roomState.room.status === 'playing' ? 'Em jogo' : 'Finalizado'}</Text>
            </View>

            <View style={styles.playerGrid}>
              {roomState.players.map((player) => {
                const shouldFadeInAction =
                  roomState.room.status === 'playing' &&
                  Boolean(focusedActionPlayerId) &&
                  player.id !== focusedActionPlayerId;
                const isActionFocus = roomState.room.status === 'playing' && focusedActionPlayerId === player.id;

                return (
                  <View
                    key={player.id}
                    style={[
                      styles.playerCard,
                      shouldFadeInAction && styles.stageFadeToken,
                      isActionFocus && styles.playerCardFocused,
                    ]}
                  >
                    <View style={styles.playerHeadWrap}>
                      <View style={[styles.playerHead, player.isHost && styles.playerHeadHost]} />
                      {typeof player.orderRoll === 'number' && (
                        <View style={styles.rollBadge}>
                          <AppIcon name="dice" size={10} color="#FFF" />
                          <Text style={styles.rollBadgeText}>{player.orderRoll}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerStatusLine}>
                      {player.isHost ? 'Host' : 'Jogador'} {player.online ? '• Online' : '• Offline'}
                    </Text>
                    <Text style={styles.playerStatusLine}>
                      {player.characterId ? `Personagem: ${player.characterId}` : 'Sem personagem'}
                    </Text>
                    <Text style={styles.playerStatusLine}>
                      {player.status === 'active'
                        ? roomState.room.status === 'lobby'
                          ? player.ready
                            ? 'Pronto'
                            : 'Aguardando'
                          : `Casa ${player.position + 1}`
                        : 'Saiu'}
                    </Text>
                    {player.isCurrentTurn && roomState.room.status === 'playing' && (
                      <Text style={styles.turnBadge}>Turno atual</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {roomState.room.status === 'lobby' && (
              <>
                <View style={styles.readyInfoRow}>
                  <Text style={styles.metaText}>
                    {roomState.allReady ? 'Todos estao prontos.' : 'Aguardando jogadores ficarem prontos.'}
                  </Text>
                  {me?.isHost && (
                    <Text style={styles.metaText}>
                      {canStart ? 'Host pode iniciar.' : 'Host aguarda todos.'}
                    </Text>
                  )}
                </View>

                {me && !me.characterId && (
                  <View style={styles.characterBlock}>
                    <Text style={styles.sectionTitle}>Escolha seu personagem (apenas no setup)</Text>
                    <View style={styles.characterRow}>
                      {CHARACTER_OPTIONS.map((option) => (
                        <AnimatedButton
                          key={option.id}
                          onPress={() => {
                            void handleSelectCharacter(option.id);
                          }}
                          disabled={busyAction !== null || Boolean(me.characterId)}
                          style={[
                            styles.characterButton,
                            selectedCharacter === option.id && styles.characterButtonSelected,
                          ]}
                          hapticStyle="light"
                        >
                          <View style={styles.buttonInner}>
                            <Text
                              style={[
                                styles.characterButtonText,
                                selectedCharacter === option.id && styles.characterButtonTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </View>
                        </AnimatedButton>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.actionsRow}>
                  <AnimatedButton
                    onPress={() => {
                      void handleToggleReady();
                    }}
                    disabled={busyAction !== null || !canMarkReady}
                    style={[
                      styles.secondaryButton,
                      me?.ready && styles.primaryButton,
                      busyAction !== null || !canMarkReady ? styles.blockedActionButton : null,
                    ]}
                    hapticStyle="medium"
                    testID="btn-ready"
                  >
                    <View style={styles.buttonInner}>
                      <Text
                        style={
                          me?.ready
                            ? styles.primaryButtonText
                            : busyAction !== null || !canMarkReady
                            ? styles.blockedActionText
                            : styles.secondaryButtonText
                        }
                      >
                        {me?.ready ? 'Cancelar pronto' : 'Pronto'}
                      </Text>
                    </View>
                  </AnimatedButton>

                  {me?.isHost && (
                    <AnimatedButton
                      onPress={() => {
                        void handleStartGame();
                      }}
                      disabled={busyAction !== null || !canStart}
                      style={[
                        styles.primaryButton,
                        busyAction !== null || !canStart ? styles.blockedActionButton : null,
                      ]}
                      hapticStyle="success"
                      testID="btn-start-multiplayer-game"
                    >
                      <View style={styles.buttonInner}>
                        <AppIcon
                          name="play"
                          size={14}
                          color={busyAction !== null || !canStart ? '#6E5442' : '#FFF'}
                        />
                        <Text
                          style={
                            busyAction !== null || !canStart
                              ? styles.blockedActionText
                              : styles.primaryButtonText
                          }
                        >
                          Iniciar partida
                        </Text>
                      </View>
                    </AnimatedButton>
                  )}
                </View>
              </>
            )}

            {roomState.room.status === 'playing' && (
              <View style={styles.playingBlock}>
                <Text style={styles.sectionTitle}>
                  Turno {roomState.room.turnNumber} • {getPlayerName(playersById, roomState.room.currentTurnPlayerId)}
                </Text>

                <AnimatedButton
                  onPress={() => {
                    void handleRollTurn();
                  }}
                  disabled={busyAction !== null || !canRollTurn}
                  style={[
                    styles.primaryButton,
                    busyAction !== null || !canRollTurn ? styles.blockedActionButton : null,
                  ]}
                  hapticStyle="heavy"
                  testID="btn-roll-multiplayer-turn"
                >
                  <View style={styles.buttonInner}>
                    <AppIcon
                      name="dice"
                      size={14}
                      color={busyAction !== null || !canRollTurn ? '#6E5442' : '#FFF'}
                    />
                    <Text
                      style={
                        busyAction !== null || !canRollTurn
                          ? styles.blockedActionText
                          : styles.primaryButtonText
                      }
                    >
                      {canRollTurn ? 'Rolar dado' : `${actionPlayerName} jogando`}
                    </Text>
                  </View>
                </AnimatedButton>
              </View>
            )}

            {roomState.room.status === 'finished' && (
              <View style={styles.finishedBlock}>
                <Text style={styles.sectionTitle}>Partida encerrada</Text>
                <Text style={styles.metaText}>Vencedor: {winnerName ?? 'Indefinido'}</Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <AnimatedButton
                onPress={() => {
                  void handleLeaveRoom(roomState.room.status === 'finished');
                }}
                disabled={busyAction !== null}
                style={styles.dangerButton}
                hapticStyle="light"
                testID="btn-leave-multiplayer-room"
              >
                <View style={styles.buttonInner}>
                  <AppIcon name="door-open" size={14} color="#FFF" />
                  <Text style={styles.dangerButtonText}>
                    {roomState.room.status === 'finished' ? 'Sair e voltar ao menu' : 'Sair da sala'}
                  </Text>
                </View>
              </AnimatedButton>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historico sincronizado</Text>
            <Text style={styles.metaText}>
              Eventos persistidos para recuperar o estado apos lag/conexao instavel.
            </Text>

            <View style={styles.historyList}>
              {historyRows.length === 0 ? (
                <Text style={styles.metaText}>Sem eventos ainda.</Text>
              ) : (
                historyRows.map((event) => (
                  <View key={event.id} style={styles.historyRow}>
                    <Text style={styles.historyText}>{formatHistoryEvent(event, playersById)}</Text>
                    <Text style={styles.historyTimestamp}>
                      {new Date(event.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const FRAME_BORDER = '#4E2C17';
const PANEL_BACKGROUND = '#F7EBD9';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2F1A0C',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#6F5137',
    fontSize: 13,
    fontWeight: '700',
  },
  backButton: {
    borderWidth: 2,
    borderColor: FRAME_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  warningBox: {
    borderWidth: 2,
    borderColor: '#AA5A00',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  warningTitle: {
    fontWeight: '900',
    color: '#8A3D00',
    fontSize: 13,
  },
  warningText: {
    color: '#6E3A12',
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: '#AE1E1E',
    backgroundColor: '#FFECEC',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: '#8A1616',
    fontWeight: '700',
    fontSize: 12,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#0C6E3A',
    backgroundColor: '#E9FFF3',
    borderRadius: 10,
    padding: 10,
  },
  infoText: {
    color: '#0E5A31',
    fontWeight: '700',
    fontSize: 12,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingLabel: {
    color: '#5D4431',
    fontWeight: '700',
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 2,
    borderColor: FRAME_BORDER,
    borderRadius: 16,
    backgroundColor: PANEL_BACKGROUND,
    padding: 12,
    gap: 10,
    ...theme.shadows.sm,
  },
  roomMetaCard: {
    borderWidth: 2,
    borderColor: FRAME_BORDER,
    borderRadius: 16,
    backgroundColor: '#FFF4E6',
    padding: 14,
    alignItems: 'center',
    gap: 4,
    ...theme.shadows.sm,
  },
  roomCodeLabel: {
    fontSize: 11,
    color: '#7A5736',
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  roomCodeValue: {
    fontSize: 36,
    color: '#2F1A0C',
    fontWeight: '900',
    letterSpacing: 4,
  },
  roomCodeHint: {
    fontSize: 12,
    color: '#6F5137',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#2F1A0C',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6D4F34',
    fontWeight: '600',
  },
  startLineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  startLineToken: {
    borderWidth: 1,
    borderColor: '#B58B61',
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 120,
  },
  startLineTokenHost: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFF8EB',
  },
  stageFadeToken: {
    opacity: 0.36,
  },
  startLineTokenName: {
    color: '#3C2818',
    fontSize: 12,
    fontWeight: '900',
  },
  startLineTokenMeta: {
    color: '#7B5C40',
    fontSize: 11,
    fontWeight: '600',
  },
  trackRow: {
    gap: 8,
  },
  trackCluster: {
    borderWidth: 1,
    borderColor: '#C9A880',
    borderRadius: 12,
    backgroundColor: '#FFF',
    padding: 10,
    gap: 8,
  },
  trackClusterFocused: {
    borderColor: '#1E4E2A',
    backgroundColor: '#F1FFF5',
  },
  trackClusterLabel: {
    color: '#5C3F27',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  trackClusterTokens: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  trackToken: {
    borderWidth: 1,
    borderColor: '#7D5B3E',
    borderRadius: 999,
    backgroundColor: '#FDF0E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trackTokenMe: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EAF1FF',
  },
  trackTokenName: {
    color: '#3C2818',
    fontSize: 11,
    fontWeight: '900',
  },
  trackBubble: {
    minWidth: 28,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#24435F',
    backgroundColor: '#2B5B84',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  trackBubbleText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  turnWatchBanner: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#243C5A',
    borderRadius: 10,
    backgroundColor: '#31557D',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnWatchBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    borderWidth: 2,
    borderColor: '#B58B61',
    borderRadius: 12,
    backgroundColor: '#FFF',
    minHeight: 44,
    paddingHorizontal: 12,
    color: '#2F1A0C',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    borderWidth: 2,
    borderColor: FRAME_BORDER,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.35,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: FRAME_BORDER,
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.35,
  },
  blockedActionButton: {
    backgroundColor: '#D7C5AF',
    borderColor: '#A88E72',
  },
  blockedActionText: {
    color: '#6E5442',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.35,
  },
  dangerButton: {
    borderWidth: 2,
    borderColor: '#7E1E1E',
    borderRadius: 12,
    backgroundColor: '#B92D2D',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flex: 1,
  },
  dangerButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.35,
    textAlign: 'center',
  },
  hintText: {
    color: '#6A4B30',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 145,
    borderWidth: 1,
    borderColor: '#B58B61',
    borderRadius: 12,
    backgroundColor: '#FFF',
    padding: 10,
    gap: 4,
  },
  playerCardFocused: {
    borderColor: '#1E4E2A',
    backgroundColor: '#F1FFF5',
  },
  playerHeadWrap: {
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  playerHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6A4526',
    backgroundColor: '#F2BE88',
  },
  playerHeadHost: {
    backgroundColor: '#F59E0B',
  },
  rollBadge: {
    position: 'absolute',
    top: -8,
    right: -20,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2D1B0F',
    backgroundColor: '#4C2A16',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 4,
  },
  rollBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  playerName: {
    color: '#2D1B0F',
    fontWeight: '900',
    fontSize: 13,
  },
  playerStatusLine: {
    color: '#6D4F34',
    fontSize: 11,
    fontWeight: '600',
  },
  turnBadge: {
    color: '#1E4E2A',
    fontWeight: '900',
    fontSize: 11,
    marginTop: 2,
  },
  readyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  characterBlock: {
    gap: 8,
  },
  characterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterButton: {
    borderWidth: 2,
    borderColor: '#8F6A46',
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  characterButtonSelected: {
    backgroundColor: '#253A68',
    borderColor: '#192A4B',
  },
  characterButtonText: {
    color: '#4B311B',
    fontWeight: '900',
    fontSize: 12,
  },
  characterButtonTextSelected: {
    color: '#FFF',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playingBlock: {
    gap: 8,
  },
  finishedBlock: {
    borderWidth: 1,
    borderColor: '#0E5A31',
    borderRadius: 12,
    backgroundColor: '#ECFFF4',
    padding: 10,
    gap: 4,
  },
  historyList: {
    gap: 8,
    marginTop: 2,
  },
  historyRow: {
    borderWidth: 1,
    borderColor: '#CCB69C',
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  historyText: {
    color: '#3C2818',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  historyTimestamp: {
    color: '#8A6B4E',
    fontSize: 11,
    fontWeight: '700',
  },
});
