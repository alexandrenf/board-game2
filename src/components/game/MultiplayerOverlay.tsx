import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { TileContent, useGameStore } from '@/src/game/state/gameState';
import { LANDING_TILE_MODAL_OPEN_DELAY_MS } from '@/src/game/constants';
import { getTileName } from '@/src/game/tileNaming';
import { buildMultiplayerSessionSnapshot } from '@/src/game/session/snapshots';
import { getInitialEventsCursor } from '@/src/game/session/multiplayerUtils';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { getOrCreateMultiplayerClientId } from '@/src/services/multiplayer/clientIdentity';
import { getConvexUrl, isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { parseTurnScript } from '@/src/services/multiplayer/turnScriptUtils';
import { useMutation, useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CelebrationOverlay } from './CelebrationOverlay';
import { EducationalModal } from './EducationalModal';
import { GamePlayingHUD, GamePlayingHUDHistoryEntry } from './GamePlayingHUD';
import { StartSequenceOverlay } from './StartSequenceOverlay';

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

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Nao foi possivel concluir esta acao.';
};

const getPlayerDisplayName = (
  playerId: string | undefined,
  playersById: Map<string, RoomPlayer>
): string => {
  if (!playerId) return 'Sistema';
  return playersById.get(playerId)?.name ?? 'Jogador';
};

const formatRoomHistoryText = (
  event: RoomEvent,
  playersById: Map<string, RoomPlayer>
): string => {
  const payload = toRecord(event.payload);
  const actorName = getPlayerDisplayName(event.actorPlayerId, playersById);

  switch (event.type) {
    case 'player_joined':
      return `${actorName} entrou na sala.`;
    case 'player_left':
      return `${actorName} saiu da sala.`;
    case 'player_ready':
    case 'player_ready_changed':
      return payload.ready === false ? `${actorName} cancelou o pronto.` : `${actorName} marcou pronto.`;
    case 'player_profile_updated':
      return `${actorName} atualizou o perfil.`;
    case 'game_started':
      return 'Partida iniciada.';
    case 'dice_rolled':
      return typeof payload.value === 'number' ? `${actorName} tirou ${payload.value}.` : `${actorName} rolou o dado.`;
    case 'turn_started':
      return `Turno de ${getPlayerDisplayName(typeof payload.playerId === 'string' ? payload.playerId : undefined, playersById)}.`;
    case 'turn_resolved':
      return typeof payload.landingTile === 'object' &&
        payload.landingTile !== null &&
        typeof (payload.landingTile as Record<string, unknown>).text === 'string'
        ? `${actorName} caiu em ${(payload.landingTile as Record<string, unknown>).text as string}`
        : `${actorName} concluiu a jogada.`;
    case 'game_finished': {
      const winnerId =
        typeof payload.winnerPlayerId === 'string' ? payload.winnerPlayerId : event.actorPlayerId;
      return `${getPlayerDisplayName(winnerId, playersById)} venceu a partida.`;
    }
    default:
      return actorName === 'Sistema' ? 'Atualizacao da sala.' : `${actorName} realizou uma acao.`;
  }
};

const toHistoryEntries = (
  history: RoomEvent[],
  players: RoomPlayer[]
): GamePlayingHUDHistoryEntry[] => {
  const playersById = new Map(players.map((player) => [player.id, player]));
  return [...history]
    .reverse()
    .slice(0, 40)
    .map((event) => ({
      id: event.id,
      player: getPlayerDisplayName(event.actorPlayerId, playersById),
      text: formatRoomHistoryText(event, playersById),
      timestamp: event.createdAt,
    }));
};

const MultiplayerOverlayConnected: React.FC = () => {
  const insets = useSafeAreaInsets();
  const path = useGameStore((state) => state.path);
  const boardLength = path.length;
  const setGameStatus = useGameStore((state) => state.setGameStatus);
  const setShowCustomization = useGameStore((state) => state.setShowCustomization);
  const roamMode = useGameStore((state) => state.roamMode);
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const setRoamMode = useGameStore((state) => state.setRoamMode);
  const openHelpCenter = useGameStore((state) => state.openHelpCenter);
  const closeHelpCenter = useGameStore((state) => state.closeHelpCenter);
  const shirtColor = useGameStore((state) => state.shirtColor);
  const hairColor = useGameStore((state) => state.hairColor);
  const skinColor = useGameStore((state) => state.skinColor);
  const playerName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);

  const createRoomMutation = useMutation(multiplayerApi.rooms.createRoom as FunctionReference<'mutation'>);
  const joinRoomMutation = useMutation(multiplayerApi.rooms.joinRoom as FunctionReference<'mutation'>);
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
  const dismissResolvedTurn = useMultiplayerRuntimeStore((state) => state.dismissResolvedTurn);
  const resetRuntime = useMultiplayerRuntimeStore((state) => state.reset);
  const latestResolvedTurn = useMultiplayerRuntimeStore((state) => state.latestResolvedTurn);
  const actors = useMultiplayerRuntimeStore((state) => state.actors);
  const focusActorId = useMultiplayerRuntimeStore((state) => state.focusActorId);
  const autoFollowActorId = useMultiplayerRuntimeStore((state) => state.autoFollowActorId);
  // Keep a mutable cursor for dedupe while the subscription advances in batches.
  const processedSequenceRef = useRef(0);
  const actionMessage = useMultiplayerRuntimeStore((state) => state.actionMessage);

  const [clientId, setClientId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [draftPlayerName, setDraftPlayerName] = useState('');
  const [session, setSession] = useState<MultiplayerSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [ackErrorMessage, setAckErrorMessage] = useState<string | null>(null);
  const [eventsAfterSequence, setEventsAfterSequence] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedStartSequenceKeys, setCompletedStartSequenceKeys] = useState<string[]>([]);

  const didAutoResume = useRef(false);
  const activeRoomIdRef = useRef<string | null>(null);
  const syncedProfileKeyRef = useRef<string | null>(null);

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
    clientId && !session && busyAction !== 'create' && busyAction !== 'join' ? { clientId } : 'skip'
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
    if (busyAction === 'create' || busyAction === 'join') return;
    if (session || !latestSession || didAutoResume.current) return;
    didAutoResume.current = true;
    setSession({
      roomId: latestSession.roomId,
      roomCode: latestSession.roomCode,
      playerId: latestSession.playerId,
    });
    setInfoMessage(`Sessao retomada na sala ${latestSession.roomCode}.`);
  }, [busyAction, latestSession, session]);

  useEffect(() => {
    const nextRoomId = session?.roomId ?? null;
    if (activeRoomIdRef.current === nextRoomId) return;

    activeRoomIdRef.current = nextRoomId;
    syncedProfileKeyRef.current = null;
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

    const initialSequence = getInitialEventsCursor(roomState.latestSequence);
    processedSequenceRef.current = initialSequence;
    setProcessedSequence(initialSequence);
    setEventsAfterSequence(initialSequence);
  }, [eventsAfterSequence, roomState, session, setProcessedSequence]);

  useEffect(() => {
    if (!session) return;
    if (roomState !== null) return;

    processedSequenceRef.current = 0;
    setEventsAfterSequence(null);
    setSession(null);
    setShowCustomization(false);
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
    eventsDelta,
    roomState?.latestSequence,
    session,
    setProcessedSequence,
  ]);

  const activePlayerId = roomState?.me ?? session?.playerId ?? null;

  useEffect(() => {
    if (!session || !clientId || !activePlayerId) return;

    const sendHeartbeat = () =>
      touchPresenceMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
        clientId,
      }).catch(() => {
        // handled by next room snapshot
      });

    void sendHeartbeat();
    const interval = setInterval(sendHeartbeat, PRESENCE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activePlayerId, clientId, session, touchPresenceMutation]);

  const me = useMemo(() => {
    if (!roomState || !activePlayerId) return null;
    return roomState.players.find((player) => player.id === activePlayerId) ?? null;
  }, [activePlayerId, roomState]);

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
  const playersById = useMemo(
    () => new Map((roomState?.players ?? []).map((player) => [player.id, player])),
    [roomState?.players]
  );
  const historyEntries = useMemo(
    () => toHistoryEntries(roomState?.history ?? [], roomState?.players ?? []),
    [roomState?.history, roomState?.players]
  );
  const selectedActorId = autoFollowActorId ?? focusActorId ?? roomState?.room.currentTurnPlayerId;
  const selectedActor = useMemo(() => {
    if (!actors.length) return undefined;
    if (selectedActorId) {
      const matchedActor = actors.find((actor) => actor.id === selectedActorId);
      if (matchedActor) return matchedActor;
    }
    if (roomState?.room.currentTurnPlayerId) {
      const currentTurnActor = actors.find((actor) => actor.id === roomState.room.currentTurnPlayerId);
      if (currentTurnActor) return currentTurnActor;
    }
    return actors[0];
  }, [actors, roomState?.room.currentTurnPlayerId, selectedActorId]);
  const hudPlayerIndex = selectedActor?.position ?? Math.max(0, me?.position ?? 0);
  const hudFocusTileIndex = selectedActor?.targetIndex ?? hudPlayerIndex;
  const hudIsMoving = selectedActor?.isMoving ?? false;
  const hudTile = path[hudFocusTileIndex] ?? path[hudPlayerIndex];
  const latestGameFinishedEvent = useMemo(
    () => [...(roomState?.history ?? [])].reverse().find((event) => event.type === 'game_finished') ?? null,
    [roomState?.history]
  );
  const winnerPlayerId = useMemo(() => {
    if (!latestGameFinishedEvent) return undefined;
    const payload = toRecord(latestGameFinishedEvent.payload);
    if (typeof payload.winnerPlayerId === 'string') return payload.winnerPlayerId;
    return latestGameFinishedEvent.actorPlayerId;
  }, [latestGameFinishedEvent]);
  const winnerName = winnerPlayerId ? getPlayerDisplayName(winnerPlayerId, playersById) : 'Jogador';
  const winnerMessage = !winnerPlayerId
    ? 'Partida encerrada.'
    : winnerPlayerId === me?.id
      ? 'Voce venceu a partida.'
      : `${winnerName} venceu a partida.`;
  const latestResolvedTurnTileContent = useMemo<TileContent | null>(() => {
    if (!latestResolvedTurn?.landingTile) return null;
    const tileIndex = latestResolvedTurn.landingTile.index;
    const boardTile = path[tileIndex];
    return {
      name: boardTile ? getTileName(boardTile, tileIndex) : `Casa ${tileIndex + 1}`,
      step: tileIndex + 1,
      text: latestResolvedTurn.landingTile.text ?? boardTile?.text ?? '',
      color: latestResolvedTurn.landingTile.color ?? boardTile?.color ?? 'blue',
      imageKey: latestResolvedTurn.landingTile.imageKey ?? boardTile?.imageKey,
      type: latestResolvedTurn.landingTile.type ?? boardTile?.type,
      effect: boardTile?.effect ?? null,
      meta: latestResolvedTurn.landingTile.meta ?? boardTile?.meta,
    };
  }, [latestResolvedTurn, path]);
  const latestResolvedTurnEffect = useMemo(() => {
    if (!latestResolvedTurn?.effect) return null;
    return latestResolvedTurn.effect.type === 'advance'
      ? { advance: latestResolvedTurn.effect.value }
      : { retreat: latestResolvedTurn.effect.value };
  }, [latestResolvedTurn]);
  const startSequenceParticipants = useMemo(
    () =>
      activePlayers.filter((player) => typeof player.orderRoll === 'number'),
    [activePlayers]
  );
  const startSequenceKey =
    roomState?.room.status === 'playing' &&
    roomState.room.turnPhase === 'awaiting_roll' &&
    roomState.room.turnNumber === 1
      ? `${roomState.room.id}:${roomState.room.turnNumber}`
      : null;
  const shouldShowStartSequence = Boolean(
    startSequenceKey &&
      startSequenceParticipants.length >= 2 &&
      !completedStartSequenceKeys.includes(startSequenceKey)
  );
  const handleStartSequenceComplete = useCallback(() => {
    if (!startSequenceKey) return;
    setCompletedStartSequenceKeys((current) =>
      current.includes(startSequenceKey)
        ? current
        : [...current, startSequenceKey]
    );
  }, [startSequenceKey]);
  const isActiveResolvedTurn =
    Boolean(me?.isCurrentTurn) &&
    roomState?.room.turnPhase === 'awaiting_ack' &&
    roomState.room.currentTurnId === latestResolvedTurn?.turnId;
  const gameplayMessage =
    roomState?.room.status === 'finished'
      ? winnerMessage
      : shouldShowStartSequence
        ? 'Definindo a ordem inicial da partida.'
        : errorMessage ?? actionMessage ?? infoMessage ?? (isWatching ? `${currentTurnName} esta jogando agora.` : null);
  const inSceneGame = roomState?.room.status === 'playing' || roomState?.room.status === 'finished';
  const sessionSnapshot =
    inSceneGame && roomState
      ? buildMultiplayerSessionSnapshot({
          status: roomState.room.status === 'finished' ? 'finished' : 'playing',
          phase: roomState.room.turnPhase,
          actors,
          currentTurnPlayerId: roomState.room.currentTurnPlayerId,
          currentTurnId: roomState.room.currentTurnId,
          selectedActorId: selectedActor?.id,
          canRoll: Boolean(canRoll && busyAction === null && !shouldShowStartSequence),
          isRolling: busyAction === 'roll',
          showTileModal: Boolean(latestResolvedTurn),
          message: gameplayMessage,
          history: historyEntries,
          winnerPlayerId,
          winnerMessage,
          resolvedTurn: latestResolvedTurn ?? undefined,
        })
      : null;

  useEffect(() => {
    if (roomState?.room.status === 'finished') {
      setShowCelebration(true);
    }
  }, [roomState?.room.status]);

  useEffect(() => {
    if (roomState?.room.status !== 'playing') return;
    setAckErrorMessage(null);
  }, [roomState?.room.status]);

  useEffect(() => {
    if (!latestResolvedTurn) {
      setAckErrorMessage(null);
    }
  }, [latestResolvedTurn]);

  useEffect(() => {
    if (!session || !me?.name) return;

    const syncKey = `${session.roomId}:${session.playerId}:${me.name}`;
    if (syncedProfileKeyRef.current === syncKey) return;

    syncedProfileKeyRef.current = syncKey;
    if (playerName !== me.name) {
      setPlayerName(me.name);
    }
  }, [me?.name, playerName, session, setPlayerName]);

  useEffect(() => {
    if (session) return;
    setDraftPlayerName(playerName);
  }, [playerName, session]);

  const leaveRoomAndOptionallyBack = async (backToMenu: boolean) => {
    if (!session || !clientId || !activePlayerId) {
      if (backToMenu) setGameStatus('menu');
      return;
    }

    try {
      setBusyAction('leave');
      await leaveRoomMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
        clientId,
      });
      processedSequenceRef.current = 0;
      setEventsAfterSequence(null);
      setSession(null);
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
      const normalizedPlayerName = draftPlayerName.trim();
      if (draftPlayerName !== playerName) {
        setPlayerName(draftPlayerName);
      }
      const result = (await createRoomMutation({
        clientId,
        name: normalizedPlayerName || undefined,
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
      const normalizedPlayerName = draftPlayerName.trim();
      if (draftPlayerName !== playerName) {
        setPlayerName(draftPlayerName);
      }
      const result = (await joinRoomMutation({
        clientId,
        roomCode: joinCode.trim().toUpperCase(),
        name: normalizedPlayerName || undefined,
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
    if (!session || !clientId || !activePlayerId || !me) return;
    try {
      setBusyAction('ready');
      setErrorMessage(null);
      await setReadyMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
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
    if (!session || !clientId || !activePlayerId) return;
    try {
      setBusyAction('start');
      setErrorMessage(null);
      await startGameMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
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
    if (!session || !clientId || !activePlayerId) return;
    try {
      setBusyAction('roll');
      setErrorMessage(null);
      await rollTurnMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
        clientId,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDismissResolvedTurn = async () => {
    if (!latestResolvedTurn) return;

    if (!isActiveResolvedTurn) {
      dismissResolvedTurn(latestResolvedTurn.turnId);
      setAckErrorMessage(null);
      return;
    }

    if (!session || !clientId) return;
    try {
      setBusyAction('ack');
      setAckErrorMessage(null);
      await ackTurnMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
        clientId,
        turnId: latestResolvedTurn.turnId,
      });
      dismissResolvedTurn(latestResolvedTurn.turnId);
      setInfoMessage('Jogada confirmada. Aguardando proximo turno...');
    } catch (error) {
      setAckErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const openCustomizationForLobby = () => {
    if (!me || roomState?.room.status !== 'lobby') return;
    if (busyAction) return;
    setShowCustomization(true);
  };

  if (inSceneGame && roomState && session) {
    return (
      <>
        <GamePlayingHUD
          playerIndex={hudPlayerIndex}
          focusTileIndex={hudFocusTileIndex}
          totalSteps={Math.max(path.length, 1)}
          tile={hudTile}
          isMoving={hudIsMoving}
          lastMessage={sessionSnapshot?.message ?? gameplayMessage}
          roamMode={roamMode}
          hapticsEnabled={hapticsEnabled}
          showEducationalModal={Boolean(sessionSnapshot?.showTileModal)}
          canRoll={sessionSnapshot?.canRoll}
          isRolling={sessionSnapshot?.isRolling}
          onRoll={() => {
            void handleRoll();
          }}
          rollIdleLabel="JOGAR"
          rollRollingLabel="ROLANDO"
          rollDisabledLabel={
            roomState.room.status === 'finished'
              ? 'FIM'
              : roomState.room.turnPhase === 'awaiting_ack'
                ? 'AGUARDE'
                : 'ESPERA'
          }
          rollTestID="btn-roll-multiplayer-turn"
          historyEntries={sessionSnapshot?.history}
          onMenuPress={() => {
            void leaveRoomAndOptionallyBack(true);
          }}
          onHelpPress={() => {
            openHelpCenter('como-jogar');
          }}
          onSettingsPress={() => {
            openHelpCenter('qualidade');
          }}
          onToggleCamera={() => {
            setRoamMode(!roamMode);
          }}
          characterButtonLabel="Personagem"
          characterButtonDisabled
          onEducationalModalShown={closeHelpCenter}
        />

        <StartSequenceOverlay
          visible={shouldShowStartSequence}
          players={startSequenceParticipants}
          onComplete={handleStartSequenceComplete}
        />

        <EducationalModal
          visible={Boolean(sessionSnapshot?.showTileModal)}
          content={latestResolvedTurnTileContent}
          pendingEffect={latestResolvedTurnEffect}
          openDelayMs={LANDING_TILE_MODAL_OPEN_DELAY_MS}
          onDismiss={() => {
            void handleDismissResolvedTurn();
          }}
          dismissLabel={
            isActiveResolvedTurn
              ? busyAction === 'ack'
                ? 'Confirmando...'
                : ackErrorMessage
                  ? 'Tentar novamente'
                  : 'Continuar turno'
              : 'Voltar ao tabuleiro'
          }
          dismissDisabled={isActiveResolvedTurn && busyAction === 'ack'}
          errorMessage={isActiveResolvedTurn ? ackErrorMessage : null}
        />

        <CelebrationOverlay
          visible={showCelebration && roomState.room.status === 'finished'}
          onDismiss={() => {
            setShowCelebration(false);
            void leaveRoomAndOptionallyBack(true);
          }}
          title={sessionSnapshot?.winnerPlayerId === me?.id ? 'VITORIA!' : 'PARTIDA FINALIZADA'}
          subtitle={sessionSnapshot?.winnerMessage}
          buttonLabel="Voltar ao menu"
        />
      </>
    );
  }

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
              value={draftPlayerName}
              onChangeText={setDraftPlayerName}
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

          {me && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Perfil do jogador</Text>
              <Text style={styles.metaText}>
                Edite nome, roupa, cabelo e pele antes da partida começar.
              </Text>
              <View style={styles.palettePreviewRow}>
                <View style={[styles.paletteSwatch, { backgroundColor: shirtColor }]} />
                <View style={[styles.paletteSwatch, { backgroundColor: hairColor }]} />
                <View style={[styles.paletteSwatch, { backgroundColor: skinColor }]} />
              </View>
              <AnimatedButton
                onPress={openCustomizationForLobby}
                disabled={busyAction !== null}
                style={styles.secondaryButton}
                hapticStyle="light"
              >
                <View style={styles.buttonInner}>
                  <AppIcon name="shirt" size={14} color={COLORS.text} />
                  <Text style={styles.secondaryButtonText}>Abrir personalizacao</Text>
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
});
