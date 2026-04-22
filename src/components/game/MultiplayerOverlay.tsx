import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { QUIZ_SOURCES, QuizSourceId } from '@/src/content/quizQuestions';
import { QuizResult } from '@/src/domain/game/quizTypes';
import { TileContent, useGameStore } from '@/src/game/state/gameState';
import { LANDING_TILE_MODAL_OPEN_DELAY_MS } from '@/src/game/constants';
import { getTileName } from '@/src/game/tileNaming';
import { buildMultiplayerSessionSnapshot } from '@/src/game/session/snapshots';
import { getInitialEventsCursor } from '@/src/game/session/multiplayerUtils';
import { useMultiplayerEventProcessor } from '@/src/hooks/useMultiplayerEventProcessor';
import { usePresenceHeartbeat } from '@/src/hooks/usePresenceHeartbeat';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { getOrCreateMultiplayerClientId } from '@/src/services/multiplayer/clientIdentity';
import { getConvexUrl, isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useMultiplayerRuntimeStore, MultiplayerQuizAnswer } from '@/src/services/multiplayer/runtimeStore';
import { useMutation, useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CelebrationOverlay } from './CelebrationOverlay';
import { EducationalModal } from './EducationalModal';
import { GamePlayingHUD, GamePlayingHUDHistoryEntry } from './GamePlayingHUD';
import { QuizModal, RevealedQuizAnswer } from './QuizModal';
import { StartSequenceOverlay } from './StartSequenceOverlay';

/** Active multiplayer session identifiers. */
type MultiplayerSession = {
  roomId: string;
  roomCode: string;
  playerId: string;
};

/** Snapshot of a player inside a multiplayer room. */
type RoomPlayer = {
  id: string;
  name: string;
  characterId?: string;
  ready: boolean;
  status: 'active' | 'left';
  position: number;
  quizPoints?: number;
  orderRoll?: number;
  orderRank?: number;
  isHost: boolean;
  isCurrentTurn: boolean;
};

/** Server-sent event delivered to clients. */
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

/** Quiz round data as returned by the multiplayer room query. */
type RoomQuizRound = {
  roundId: string;
  turnId: string;
  turnNumber: number;
  status: 'active' | 'resolved' | 'cancelled';
  questionId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId?: string;
  explanation?: string;
  tileIndex: number;
  tileColor: string;
  previousIndex: number;
  startedAt: number;
  deadlineAt: number;
  myAnswer?: MultiplayerQuizAnswer | null;
  answers?: MultiplayerQuizAnswer[];
};

/** Full room state snapshot used by the multiplayer overlay. */
type RoomState = {
  room: {
    id: string;
    code: string;
    protocolVersion: number;
    status: 'lobby' | 'playing' | 'finished';
    turnPhase: 'lobby' | 'awaiting_roll' | 'awaiting_quiz' | 'awaiting_ack' | 'finished';
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
  quizRound?: RoomQuizRound | null;
  history: RoomEvent[];
};

type SessionByClient = {
  roomId: string;
  roomCode: string;
  playerId: string;
  needsRejoin?: boolean;
};

type MutationResult = {
  roomId: string;
  roomCode: string;
  playerId: string;
};

type SubmitQuizAnswerResult = {
  result: QuizResult;
  points: number;
  alreadyAnswered?: boolean;
};

type EventsDeltaResult = {
  roomMissing: boolean;
  latestSequence: number;
  hasMore: boolean;
  requiresResync: boolean;
  events: RoomEvent[];
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Não foi possível concluir esta ação.';
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
    case 'quiz_started':
      return `Quiz iniciado para ${actorName}.`;
    case 'quiz_resolved':
      return 'Quiz resolvido. Respostas reveladas.';
    case 'game_finished': {
      const winnerId =
        typeof payload.winnerPlayerId === 'string' ? payload.winnerPlayerId : event.actorPlayerId;
      return `${getPlayerDisplayName(winnerId, playersById)} venceu a partida.`;
    }
    default:
      return actorName === 'Sistema' ? 'Atualização da sala.' : `${actorName} realizou uma ação.`;
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

const formatQuizEffectDescription = (effect: unknown): string => {
  const effectRecord = toRecord(effect);
  if (effectRecord.type === 'advance' && typeof effectRecord.value === 'number') {
    return `Avance ${effectRecord.value} casa${effectRecord.value > 1 ? 's' : ''}!`;
  }
  if (effectRecord.type === 'retreat' && typeof effectRecord.value === 'number') {
    return `Recue ${effectRecord.value} casa${effectRecord.value > 1 ? 's' : ''}.`;
  }
  return 'Permanece na mesma casa.';
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
  const submitQuizAnswerMutation = useMutation(multiplayerApi.rooms.submitQuizAnswer as FunctionReference<'mutation'>);

  const syncFromSnapshot = useMultiplayerRuntimeStore((state) => state.syncFromSnapshot);
  const applyTurnResolved = useMultiplayerRuntimeStore((state) => state.applyTurnResolved);
  const applyTurnStarted = useMultiplayerRuntimeStore((state) => state.applyTurnStarted);
  const applyQuizStarted = useMultiplayerRuntimeStore((state) => state.applyQuizStarted);
  const applyQuizResolved = useMultiplayerRuntimeStore((state) => state.applyQuizResolved);
  const setProcessedSequence = useMultiplayerRuntimeStore((state) => state.setProcessedSequence);
  const dismissResolvedTurn = useMultiplayerRuntimeStore((state) => state.dismissResolvedTurn);
  const dismissQuizFeedback = useMultiplayerRuntimeStore((state) => state.dismissQuizFeedback);
  const markQuizSubmitted = useMultiplayerRuntimeStore((state) => state.markQuizSubmitted);
  const resetRuntime = useMultiplayerRuntimeStore((state) => state.reset);
  const latestResolvedTurn = useMultiplayerRuntimeStore((state) => state.latestResolvedTurn);
  const currentQuizRound = useMultiplayerRuntimeStore((state) => state.currentQuizRound);
  const quizSubmitted = useMultiplayerRuntimeStore((state) => state.quizSubmitted);
  const quizActorArrived = useMultiplayerRuntimeStore((state) => state.quizActorArrived);
  const quizResolvedData = useMultiplayerRuntimeStore((state) => state.quizResolvedData);
  const quizPointsByPlayer = useMultiplayerRuntimeStore((state) => state.quizPointsByPlayer);
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
  // Track when roomState first became null to debounce transient network drops.
  const roomStateNullSinceRef = useRef<number | null>(null);

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

    if (latestSession.needsRejoin) {
      // Player left mid-game — attempt a re-join via the mutation so the server
      // restores their active status and turn order slot.
      if (!clientId) return;
      setBusyAction('join');
      joinRoomMutation({
        clientId,
        roomCode: latestSession.roomCode,
        name: undefined,
      })
        .then((result) => {
          const r = result as MutationResult;
          setSession({ roomId: r.roomId, roomCode: r.roomCode, playerId: r.playerId });
          setInfoMessage(`Sessão retomada na sala ${r.roomCode}.`);
        })
        .catch((error) => {
          setErrorMessage(getErrorMessage(error));
        })
        .finally(() => {
          setBusyAction(null);
        });
      return;
    }

    setSession({
      roomId: latestSession.roomId,
      roomCode: latestSession.roomCode,
      playerId: latestSession.playerId,
    });
    setInfoMessage(`Sessão retomada na sala ${latestSession.roomCode}.`);
  }, [busyAction, clientId, joinRoomMutation, latestSession, session]);

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
    if (!session) {
      roomStateNullSinceRef.current = null;
      return;
    }

    // `undefined` means still loading; reset the debounce timer.
    if (roomState === undefined) {
      roomStateNullSinceRef.current = null;
      return;
    }

    // A valid room — reset the debounce timer.
    if (roomState !== null) {
      roomStateNullSinceRef.current = null;
      return;
    }

    // roomState is null (confirmed missing by Convex). Debounce for 3 seconds
    // to avoid kicking the player on transient network glitches.
    if (roomStateNullSinceRef.current === null) {
      roomStateNullSinceRef.current = Date.now();
    }

    const elapsed = Date.now() - roomStateNullSinceRef.current;
    if (elapsed < 3000) {
      const remaining = 3000 - elapsed;
      const timeout = setTimeout(() => {
        // Re-check: if still null after the delay, kick the player.
        processedSequenceRef.current = 0;
        setEventsAfterSequence(null);
        setSession(null);
        setShowCustomization(false);
        resetRuntime();
        setErrorMessage('A sala não está mais disponível.');
        roomStateNullSinceRef.current = null;
      }, remaining);
      return () => clearTimeout(timeout);
    }

    // Already waited 3+ seconds, act immediately.
    processedSequenceRef.current = 0;
    setEventsAfterSequence(null);
    setSession(null);
    setShowCustomization(false);
    resetRuntime();
    setErrorMessage('A sala não está mais disponível.');
    roomStateNullSinceRef.current = null;
  }, [resetRuntime, roomState, session, setShowCustomization]);

  const activePlayerId = roomState?.me ?? session?.playerId ?? null;

  useMultiplayerEventProcessor({
    session,
    eventsDelta,
    roomStateLatestSequence: roomState?.latestSequence,
    processedSequenceRef,
    setProcessedSequence,
    setEventsAfterSequence,
    applyTurnResolved,
    applyTurnStarted,
    applyQuizStarted,
    applyQuizResolved,
    dismissQuizFeedback,
  });

  usePresenceHeartbeat({
    session,
    clientId,
    activePlayerId,
    touchPresence: touchPresenceMutation,
  });

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
  const scoreboardPlayers = useMemo(
    () =>
      activePlayers.map((player) => ({
        id: player.id,
        name: player.name,
        points: quizPointsByPlayer[player.id] ?? player.quizPoints ?? 0,
        isMe: player.id === me?.id,
      })),
    [activePlayers, me?.id, quizPointsByPlayer]
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
      ? 'Você venceu a partida.'
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
  const quizModalVisible = Boolean(
    currentQuizRound &&
      quizActorArrived &&
      roomState?.room.status === 'playing' &&
      (roomState.room.turnPhase === 'awaiting_quiz' || quizResolvedData)
  );
  const currentQuizTileContent = useMemo<TileContent | null>(() => {
    if (!currentQuizRound) return null;
    const tileIndex = currentQuizRound.tileIndex;
    const boardTile = path[tileIndex];
    if (!boardTile) return null;
    return {
      name: getTileName(boardTile, tileIndex),
      step: tileIndex + 1,
      text: boardTile.text ?? '',
      color: boardTile.color ?? currentQuizRound.tileColor,
      imageKey: boardTile.imageKey,
      type: boardTile.type,
      effect: boardTile.effect ?? null,
      meta: boardTile.meta,
    };
  }, [currentQuizRound, path]);
  const quizSourceLinks = useMemo(
    () =>
      (currentQuizRound?.question.sourceIds ?? []).map((id) => QUIZ_SOURCES[id as QuizSourceId]).filter(Boolean),
    [currentQuizRound?.question.sourceIds]
  );
  const currentPlayerQuizAnswer = useMemo(() => {
    if (quizResolvedData) {
      const answer = quizResolvedData?.answers?.find((entry) => entry.playerId === activePlayerId);
      if (answer) {
        return {
          selectedOptionId: answer.selectedOptionId,
          result: answer.result,
        };
      }
      return { selectedOptionId: null, result: 'timeout' as QuizResult };
    }
    if (currentQuizRound?.myAnswer) {
      return {
        selectedOptionId: currentQuizRound.myAnswer.selectedOptionId,
        result: currentQuizRound.myAnswer.result,
      };
    }
    return null;
  }, [activePlayerId, currentQuizRound?.myAnswer, quizResolvedData]);
  const revealedQuizAnswers = useMemo<RevealedQuizAnswer[]>(
    () =>
      quizResolvedData?.answers?.map((answer) => ({
        playerId: answer.playerId,
        playerName: playersById.get(answer.playerId)?.name,
        selectedOptionId: answer.selectedOptionId,
        result: answer.result,
        pointsAwarded: answer.pointsAwarded,
      })) ?? [],
    [playersById, quizResolvedData?.answers]
  );
  const quizPhase = quizResolvedData ? 'feedback' : currentQuizRound ? 'answering' : 'idle';
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
        : roomState?.room.turnPhase === 'awaiting_quiz'
          ? 'Quiz em andamento.'
        : errorMessage ?? actionMessage ?? infoMessage ?? (isWatching ? `${currentTurnName} está jogando agora.` : null);
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
          showTileModal:
            Boolean(latestResolvedTurn) &&
            !quizModalVisible &&
            !actors.find((a) => a.id === latestResolvedTurn?.actorPlayerId)?.isMoving,
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

  const handleSubmitQuizAnswer = useCallback(async (optionId: string | null) => {
    if (!session || !clientId || !activePlayerId || !currentQuizRound || quizSubmitted) return;
    try {
      setBusyAction('quiz');
      setErrorMessage(null);
      const result = (await submitQuizAnswerMutation({
        roomId: session.roomId,
        playerId: activePlayerId,
        clientId,
        roundId: currentQuizRound.roundId,
        selectedOptionId: optionId,
      })) as SubmitQuizAnswerResult;
      markQuizSubmitted({
        selectedOptionId: optionId,
        result: result.result,
        pointsAwarded: result.points,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }, [session, clientId, activePlayerId, currentQuizRound, quizSubmitted, submitQuizAnswerMutation, markQuizSubmitted, setBusyAction, setErrorMessage]);

  const handleDismissResolvedTurn = useCallback(async () => {
    if (!latestResolvedTurn) return false;

    if (!isActiveResolvedTurn) {
      dismissResolvedTurn(latestResolvedTurn.turnId);
      setAckErrorMessage(null);
      return true;
    }

    if (!session || !clientId) return false;
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
      setInfoMessage('Jogada confirmada. Aguardando próximo turno...');
      return true;
    } catch (error) {
      setAckErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setBusyAction(null);
    }
  }, [latestResolvedTurn, isActiveResolvedTurn, session, clientId, activePlayerId, ackTurnMutation, dismissResolvedTurn, setAckErrorMessage, setBusyAction, setInfoMessage]);

  const handleDismissQuizFeedback = useCallback(async () => {
    // Always clear the local quiz UI immediately — never leave the player stuck.
    dismissQuizFeedback();
    // Then attempt the turn ACK (non-blocking; errors surface via ackErrorMessage).
    await handleDismissResolvedTurn();
  }, [handleDismissResolvedTurn, dismissQuizFeedback]);

  const handleQuizSubmitAnswer = useCallback((optionId: string | null) => {
    void handleSubmitQuizAnswer(optionId);
  }, [handleSubmitQuizAnswer]);

  const handleQuizDismissFeedback = useCallback(() => {
    void handleDismissQuizFeedback();
  }, [handleDismissQuizFeedback]);

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
          showEducationalModal={Boolean(sessionSnapshot?.showTileModal) || quizModalVisible}
          quizPhase={quizPhase}
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
              : roomState.room.turnPhase === 'awaiting_quiz'
                ? 'QUIZ'
                : roomState.room.turnPhase === 'awaiting_ack'
                  ? 'AGUARDE'
                  : 'ESPERA'
          }
          rollTestID="btn-roll-multiplayer-turn"
          historyEntries={sessionSnapshot?.history}
          scoreboardPlayers={scoreboardPlayers}
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

        <QuizModal
          visible={quizModalVisible}
          tileContent={currentQuizTileContent}
          quiz={
            currentQuizRound
              ? {
                  question: currentQuizRound.question,
                  startedAt: currentQuizRound.startedAt,
                  tileColor: currentQuizRound.tileColor,
                  deadlineAt: currentQuizRound.deadlineAt,
                }
              : null
          }
          quizAnswer={currentPlayerQuizAnswer}
          quizPhase={quizResolvedData ? 'feedback' : 'answering'}
          path={path}
          focusTileIndex={currentQuizRound?.tileIndex ?? hudFocusTileIndex}
          onSubmitAnswer={handleQuizSubmitAnswer}
          onDismissFeedback={handleQuizDismissFeedback}
          answerLocked={quizSubmitted || busyAction === 'quiz' || Boolean(quizResolvedData)}
          correctOptionId={quizResolvedData?.correctOptionId ?? currentQuizRound?.question.correctOptionId}
          effectDescription={formatQuizEffectDescription(quizResolvedData?.effect)}
          footerMessage={
            busyAction === 'quiz'
              ? 'Enviando resposta...'
              : quizSubmitted && !quizResolvedData
                ? 'Resposta enviada. Aguardando os outros jogadores.'
                : null
          }
          revealedAnswers={revealedQuizAnswers}
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
          sourceLinks={quizSourceLinks}
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
          <Text style={styles.warningTitle}>Convex não configurado</Text>
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
            <Text style={styles.metaText}>Código da sala: {roomState.room.code}</Text>
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
        <Text style={styles.warningTitle}>Convex não configurado</Text>
        <Text style={styles.warningText}>Defina `EXPO_PUBLIC_CONVEX_URL` para habilitar partidas multiplayer.</Text>
        <Text style={styles.warningText}>URL atual: {getConvexUrl() || '(vazio)'}</Text>
      </View>
    </View>
  );
};

/** Root multiplayer overlay. Renders the connected UI or an unavailable placeholder. */
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
