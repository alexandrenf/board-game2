import { create } from 'zustand';
import { SceneActor, TurnAnimationScript } from '@/src/game/runtime/types';
import { MovementSegment } from '@/src/domain/game/types';
import { QuizOption, QuizResult } from '@/src/domain/game/quizTypes';
import { AVATAR_CHARACTER_PREFIX } from './avatarCharacter';
import { parseTurnScript } from './turnScriptUtils';

type MultiplayerSnapshotPlayer = {
  id: string;
  name: string;
  characterId?: string;
  position: number;
  orderRoll?: number;
  orderRank?: number;
  quizPoints?: number;
  isCurrentTurn: boolean;
  isHost: boolean;
  status: 'active' | 'left';
};

type MultiplayerSnapshot = {
  room: {
    id: string;
    status: 'lobby' | 'playing' | 'finished';
    turnPhase?: string;
    currentTurnPlayerId?: string;
    currentTurnId?: string;
  };
  me?: string;
  latestSequence?: number;
  players: MultiplayerSnapshotPlayer[];
  pendingTurn?: {
    turnId: string;
    actorPlayerId: string;
    turnNumber: number;
    script?: unknown;
    deadlineAt?: number;
  } | null;
  quizRound?: MultiplayerQuizRoundSnapshot | null;
};

type MultiplayerQuizAnswer = {
  playerId: string;
  selectedOptionId: string | null;
  result: QuizResult;
  pointsAwarded: number;
  answeredAt?: number;
  timeElapsedMs?: number;
};

type MultiplayerQuizRoundSnapshot = {
  roundId: string;
  turnId: string;
  turnNumber: number;
  status: 'active' | 'resolved' | 'cancelled';
  questionId: string;
  questionText: string;
  options: QuizOption[];
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

type MultiplayerQuizRound = {
  roundId: string;
  turnId: string;
  turnNumber: number;
  question: {
    id: string;
    themeId: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionText: string;
    options: QuizOption[];
    correctOptionId?: string;
    explanation?: string;
  };
  tileIndex: number;
  tileColor: string;
  startedAt: number;
  deadlineAt: number;
  myAnswer?: MultiplayerQuizAnswer | null;
};

type MultiplayerQuizResolvedData = {
  roundId: string;
  correctOptionId: string;
  explanation?: string;
  answers: MultiplayerQuizAnswer[];
  effect?: unknown;
};

type RuntimeStore = {
  enabled: boolean;
  roomStatus: 'idle' | 'lobby' | 'playing' | 'finished';
  roomId?: string;
  mePlayerId?: string;
  currentTurnPlayerId?: string;
  currentTurnId?: string;
  turnPhase?: string;
  latestSequence: number;
  processedSequence: number;
  actors: SceneActor[];
  focusActorId?: string;
  autoFollowActorId?: string;
  actionMessage?: string;
  latestResolvedTurn?: TurnAnimationScript;
  pendingTurnDeadlineAt?: number;
  dismissedResolvedTurnId?: string;
  /** Actor that has deferred effect segments (advance/retreat) waiting to play after modal dismiss. */
  pendingEffectActorId?: string;
  /** toIndex values for the deferred effect segments. */
  pendingEffectQueue?: number[];
  /** True while the effect segments are actively animating. */
  effectAnimationActive?: boolean;
  currentQuizRound?: MultiplayerQuizRound;
  quizSubmitted: boolean;
  quizResolvedData?: MultiplayerQuizResolvedData;
  quizPointsByPlayer: Record<string, number>;
  syncFromSnapshot: (snapshot: MultiplayerSnapshot) => void;
  applyTurnResolved: (script: TurnAnimationScript, options?: { awaitingQuiz?: boolean }) => void;
  applyTurnStarted: (nextPlayerId: string) => void;
  applyQuizStarted: (payload: unknown) => void;
  applyQuizResolved: (payload: unknown) => void;
  markQuizSubmitted: (answer?: { selectedOptionId: string | null; result: QuizResult; pointsAwarded: number }) => void;
  dismissQuizFeedback: () => void;
  markActorArrived: (actorId: string) => void;
  setProcessedSequence: (sequence: number) => void;
  dismissResolvedTurn: (turnId?: string) => void;
  reset: () => void;
};

const fallbackPalette = [
  { shirtColor: '#FF6B6B', hairColor: '#4A3B2A', skinColor: '#FFD5B8' },
  { shirtColor: '#4ECDC4', hairColor: '#1A1A2E', skinColor: '#E6B8A2' },
  { shirtColor: '#95E1D3', hairColor: '#8B4513', skinColor: '#C68642' },
  { shirtColor: '#FFE66D', hairColor: '#6B5B95', skinColor: '#3C2E28' },
];

const emptyState = {
  enabled: false,
  roomStatus: 'idle' as const,
  roomId: undefined,
  mePlayerId: undefined,
  currentTurnPlayerId: undefined,
  currentTurnId: undefined,
  turnPhase: undefined,
  latestSequence: 0,
  processedSequence: 0,
  actors: [] as SceneActor[],
  focusActorId: undefined,
  autoFollowActorId: undefined,
  actionMessage: undefined,
  latestResolvedTurn: undefined,
  pendingTurnDeadlineAt: undefined,
  dismissedResolvedTurnId: undefined,
  pendingEffectActorId: undefined,
  pendingEffectQueue: undefined,
  effectAnimationActive: undefined,
  currentQuizRound: undefined,
  quizSubmitted: false,
  quizResolvedData: undefined,
  quizPointsByPlayer: {},
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const toHexColor = (token: string | undefined, fallback: string): string => {
  if (!token) return fallback;
  const normalized = token.replace('#', '').trim().toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(normalized)) return fallback;
  return `#${normalized}`;
};

const parseAvatarColors = (playerId: string, characterId?: string) => {
  if (characterId && characterId.startsWith(AVATAR_CHARACTER_PREFIX)) {
    const raw = characterId.slice(AVATAR_CHARACTER_PREFIX.length);
    const [shirt, hair, skin] = raw.split('-');
    return {
      shirtColor: toHexColor(shirt, '#FF6B6B'),
      hairColor: toHexColor(hair, '#4A3B2A'),
      skinColor: toHexColor(skin, '#FFD5B8'),
    };
  }

  const fallback = fallbackPalette[hashString(playerId) % fallbackPalette.length]!;
  return fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const toQuizOptions = (value: unknown): QuizOption[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      const record = toRecord(option);
      return typeof record.id === 'string' && typeof record.text === 'string'
        ? { id: record.id, text: record.text }
        : null;
    })
    .filter((option): option is QuizOption => option !== null);
};

const toQuizAnswers = (value: unknown): MultiplayerQuizAnswer[] => {
  if (!Array.isArray(value)) return [];
  const answers: MultiplayerQuizAnswer[] = [];

  for (const answer of value) {
    const record = toRecord(answer);
    if (typeof record.playerId !== 'string') continue;
    const result = record.result;
    if (result !== 'correct' && result !== 'incorrect' && result !== 'timeout') continue;

    answers.push({
      playerId: record.playerId,
      selectedOptionId:
        typeof record.selectedOptionId === 'string' ? record.selectedOptionId : null,
      result,
      pointsAwarded: typeof record.pointsAwarded === 'number' ? record.pointsAwarded : 0,
      answeredAt: typeof record.answeredAt === 'number' ? record.answeredAt : undefined,
      timeElapsedMs: typeof record.timeElapsedMs === 'number' ? record.timeElapsedMs : undefined,
    });
  }

  return answers;
};

const quizRoundFromSnapshot = (
  snapshot: MultiplayerQuizRoundSnapshot | null | undefined
): MultiplayerQuizRound | undefined => {
  if (!snapshot || snapshot.status === 'cancelled') return undefined;
  return {
    roundId: snapshot.roundId,
    turnId: snapshot.turnId,
    turnNumber: snapshot.turnNumber,
    question: {
      id: snapshot.questionId,
      themeId: '',
      difficulty: 'medium',
      questionText: snapshot.questionText,
      options: snapshot.options,
      correctOptionId: snapshot.correctOptionId,
      explanation: snapshot.explanation,
    },
    tileIndex: snapshot.tileIndex,
    tileColor: snapshot.tileColor,
    startedAt: snapshot.startedAt,
    deadlineAt: snapshot.deadlineAt,
    myAnswer: snapshot.myAnswer ?? null,
  };
};

/** Split segments into immediate (dice) and deferred (effect) groups. */
const splitSegments = (segments: MovementSegment[]) => {
  const dice: MovementSegment[] = [];
  const effect: MovementSegment[] = [];
  for (const seg of segments) {
    (seg.kind === 'effect' ? effect : dice).push(seg);
  }
  return { dice, effect };
};

export const useMultiplayerRuntimeStore = create<RuntimeStore>((set, get) => ({
  ...emptyState,

  syncFromSnapshot: (snapshot) => {
    const actorMap = new Map(get().actors.map((entry) => [entry.id, entry]));
    const pendingScript = parseTurnScript(snapshot.pendingTurn?.script);
    const quizPointsByPlayer = Object.fromEntries(
      snapshot.players.map((player) => [player.id, player.quizPoints ?? 0])
    );
    const snapshotQuizRound = quizRoundFromSnapshot(snapshot.quizRound);
    const snapshotQuizResolvedData =
      snapshot.quizRound?.status === 'resolved' && snapshot.quizRound.correctOptionId
        ? {
            roundId: snapshot.quizRound.roundId,
            correctOptionId: snapshot.quizRound.correctOptionId,
            explanation: snapshot.quizRound.explanation,
            answers: snapshot.quizRound.answers ?? [],
            effect: pendingScript?.effect,
          }
        : undefined;

    const activePlayers = snapshot.players.filter((player) => player.status === 'active');
    const actors: SceneActor[] = activePlayers.map((player) => {
      const previous = actorMap.get(player.id);
      const colors = parseAvatarColors(player.id, player.characterId);
      const isPendingActor = pendingScript?.actorPlayerId === player.id;
      const keepAnimation = Boolean(
        previous && (previous.isMoving || previous.queue.length > 0 || isPendingActor)
      );

      if (!keepAnimation && isPendingActor && pendingScript) {
        // Only queue dice segments; effect segments are deferred (same as applyTurnResolved).
        const { dice } = splitSegments(pendingScript.movement.segments);
        const diceQueue = dice.map((seg) => seg.toIndex);
        const firstTarget = diceQueue[0];

        if (typeof firstTarget === 'number') {
          return {
            id: player.id,
            name: player.name,
            position: pendingScript.movement.fromIndex,
            targetIndex: firstTarget,
            isMoving: true,
            isCurrentTurn: player.isCurrentTurn,
            isHost: player.isHost,
            isMe: snapshot.me === player.id,
            characterId: player.characterId,
            shirtColor: colors.shirtColor,
            hairColor: colors.hairColor,
            skinColor: colors.skinColor,
            queue: diceQueue,
          };
        }
      }

      return {
        id: player.id,
        name: player.name,
        position: keepAnimation ? previous!.position : player.position,
        targetIndex: keepAnimation ? previous!.targetIndex : player.position,
        isMoving: keepAnimation ? previous!.isMoving : false,
        isCurrentTurn: player.isCurrentTurn,
        isHost: player.isHost,
        isMe: snapshot.me === player.id,
        characterId: player.characterId,
        shirtColor: colors.shirtColor,
        hairColor: colors.hairColor,
        skinColor: colors.skinColor,
        queue: keepAnimation ? previous!.queue : [],
      };
    });

    const currentTurnPlayerId = snapshot.room.currentTurnPlayerId;
    const fallbackFocusId = currentTurnPlayerId ?? actors[0]?.id;

    // Compute deferred effect segments for the pending turn (if any).
    const pendingEffectInfo = (() => {
      if (!pendingScript) return undefined;
      const { effect } = splitSegments(pendingScript.movement.segments);
      if (effect.length === 0) return undefined;
      return {
        actorId: pendingScript.actorPlayerId,
        queue: effect.map((seg) => seg.toIndex),
      };
    })();

    set((state) => {
      const shouldRestorePendingTurn =
        pendingScript && pendingScript.turnId !== state.dismissedResolvedTurnId;

      return {
        enabled: snapshot.room.status === 'playing' || snapshot.room.status === 'finished',
        roomStatus: snapshot.room.status,
        roomId: snapshot.room.id,
        mePlayerId: snapshot.me,
        currentTurnPlayerId,
        currentTurnId: snapshot.room.currentTurnId,
        turnPhase: snapshot.room.turnPhase,
        latestSequence: snapshot.latestSequence ?? state.latestSequence,
        quizPointsByPlayer,
        currentQuizRound:
          snapshotQuizRound ??
          (snapshot.room.turnPhase === 'awaiting_quiz' || snapshot.room.turnPhase === 'awaiting_ack'
            ? state.currentQuizRound
            : undefined),
        quizSubmitted: snapshotQuizRound
          ? snapshotQuizRound.roundId === state.currentQuizRound?.roundId
            ? Boolean(snapshot.quizRound?.myAnswer) || state.quizSubmitted
            : Boolean(snapshot.quizRound?.myAnswer)
          : state.currentQuizRound
            ? state.quizSubmitted
            : false,
        quizResolvedData:
          snapshotQuizResolvedData ??
          (snapshotQuizRound
            ? snapshotQuizRound.roundId === state.currentQuizRound?.roundId
              ? state.quizResolvedData
              : undefined
            : snapshot.room.turnPhase === 'awaiting_quiz' || snapshot.room.turnPhase === 'awaiting_ack'
              ? state.quizResolvedData
              : undefined),
        actors,
        focusActorId:
          state.focusActorId && actors.some((entry) => entry.id === state.focusActorId)
            ? state.focusActorId
            : fallbackFocusId,
        latestResolvedTurn: shouldRestorePendingTurn ? pendingScript : state.latestResolvedTurn,
        pendingTurnDeadlineAt: snapshot.pendingTurn?.deadlineAt,
        // Restore deferred effect state only when the pending turn is still active.
        pendingEffectActorId:
          shouldRestorePendingTurn && pendingEffectInfo
            ? pendingEffectInfo.actorId
            : state.pendingEffectActorId,
        pendingEffectQueue:
          shouldRestorePendingTurn && pendingEffectInfo
            ? pendingEffectInfo.queue
            : state.pendingEffectQueue,
        actionMessage:
          snapshot.room.status === 'playing' && currentTurnPlayerId
            ? `${actors.find((entry) => entry.id === currentTurnPlayerId)?.name ?? 'Jogador'} em acao`
            : state.actionMessage,
      };
    });
  },

  applyTurnResolved: (script, options) => {
    set((state) => {
      const { dice, effect } = splitSegments(script.movement.segments);
      const effectQueue = effect.map((seg) => seg.toIndex);

      // Only queue dice segments for immediate animation; effect segments
      // are deferred until the active player acknowledges (turn_started).
      const diceQueue = dice.map((seg) => seg.toIndex);
      const firstTarget = diceQueue[0];

      const actors = state.actors.map((actor) => {
        if (actor.id !== script.actorPlayerId) return actor;

        if (typeof firstTarget !== 'number') {
          // No dice movement (e.g. rolled 0 or already at target).
          // Land directly at baseToIndex (the pre-effect position).
          const landAt = script.movement.baseToIndex;
          return {
            ...actor,
            position: landAt,
            targetIndex: landAt,
            isMoving: false,
            queue: [],
          };
        }

        return {
          ...actor,
          position: script.movement.fromIndex,
          targetIndex: firstTarget,
          isMoving: true,
          queue: diceQueue,
        };
      });

      const actorName = actors.find((entry) => entry.id === script.actorPlayerId)?.name ?? 'Jogador';
      return {
        actors,
        currentTurnPlayerId: script.actorPlayerId,
        currentTurnId: script.turnId,
        turnPhase: options?.awaitingQuiz ? 'awaiting_quiz' : 'awaiting_ack',
        focusActorId: script.actorPlayerId,
        autoFollowActorId: script.actorPlayerId,
        latestResolvedTurn:
          script.turnId === state.dismissedResolvedTurnId ? state.latestResolvedTurn : script,
        pendingTurnDeadlineAt: script.deadlineAt,
        actionMessage: `${actorName} rolou ${script.roll.value}`,
        // Deferred effect segments (advance/retreat after landing tile modal).
        pendingEffectActorId: options?.awaitingQuiz
          ? undefined
          : effectQueue.length > 0
            ? script.actorPlayerId
            : undefined,
        pendingEffectQueue: options?.awaitingQuiz
          ? undefined
          : effectQueue.length > 0
            ? effectQueue
            : undefined,
        effectAnimationActive: false,
      };
    });
  },

  applyTurnStarted: (nextPlayerId) => {
    set((state) => {
      const hasEffect =
        state.pendingEffectActorId &&
        state.pendingEffectQueue &&
        state.pendingEffectQueue.length > 0;

      const actors = state.actors.map((actor) => {
        const base = { ...actor, isCurrentTurn: actor.id === nextPlayerId };

        // Queue deferred effect segments for the actor that just finished.
        if (hasEffect && actor.id === state.pendingEffectActorId) {
          const firstTarget = state.pendingEffectQueue![0]!;
          return {
            ...base,
            targetIndex: firstTarget,
            isMoving: true,
            queue: state.pendingEffectQueue!,
          };
        }
        return base;
      });

      const actorName = actors.find((entry) => entry.id === nextPlayerId)?.name ?? 'Jogador';

      return {
        actors,
        currentTurnPlayerId: nextPlayerId,
        currentTurnId: undefined,
        turnPhase: 'awaiting_roll',
        focusActorId: nextPlayerId,
        // Keep camera on the effect actor until its animation finishes.
        autoFollowActorId: hasEffect ? state.pendingEffectActorId : undefined,
        pendingTurnDeadlineAt: undefined,
        // Clear modal for ALL clients (server-authoritative dismiss).
        latestResolvedTurn: undefined,
        currentQuizRound: undefined,
        quizSubmitted: false,
        quizResolvedData: undefined,
        actionMessage: hasEffect
          ? `${actors.find((a) => a.id === state.pendingEffectActorId)?.name ?? 'Jogador'} movendo...`
          : `Turno de ${actorName}`,
        // Mark effect animation as active; segments consumed from queue.
        pendingEffectQueue: hasEffect ? state.pendingEffectQueue : undefined,
        pendingEffectActorId: hasEffect ? state.pendingEffectActorId : undefined,
        effectAnimationActive: hasEffect ? true : false,
      };
    });
  },

  applyQuizStarted: (payload) => {
    const record = toRecord(payload);
    if (
      typeof record.roundId !== 'string' ||
      typeof record.turnId !== 'string' ||
      typeof record.turnNumber !== 'number' ||
      typeof record.questionId !== 'string' ||
      typeof record.questionText !== 'string' ||
      typeof record.tileIndex !== 'number' ||
      typeof record.tileColor !== 'string' ||
      typeof record.startedAt !== 'number' ||
      typeof record.deadlineAt !== 'number'
    ) {
      return;
    }

    if (record.turnId !== get().currentTurnId) {
      return;
    }

    const difficulty =
      record.difficulty === 'easy' || record.difficulty === 'hard' || record.difficulty === 'medium'
        ? record.difficulty
        : 'medium';

    set({
      currentQuizRound: {
        roundId: record.roundId,
        turnId: record.turnId,
        turnNumber: record.turnNumber,
        question: {
          id: record.questionId,
          themeId: typeof record.themeId === 'string' ? record.themeId : '',
          difficulty,
          questionText: record.questionText,
          options: toQuizOptions(record.options),
        },
        tileIndex: record.tileIndex,
        tileColor: record.tileColor,
        startedAt: record.startedAt,
        deadlineAt: record.deadlineAt,
        myAnswer: null,
      },
      quizSubmitted: false,
      quizResolvedData: undefined,
      turnPhase: 'awaiting_quiz',
      pendingTurnDeadlineAt: record.deadlineAt,
      actionMessage: 'Quiz em andamento',
    });
  },

  applyQuizResolved: (payload) => {
    const record = toRecord(payload);
    if (typeof record.roundId !== 'string' || typeof record.correctOptionId !== 'string') {
      return;
    }

    const script = parseTurnScript(record.script);
    const answers = toQuizAnswers(record.answers);
    const resolvedRoundId = record.roundId;
    const resolvedCorrectOptionId = record.correctOptionId;
    const resolvedExplanation = typeof record.explanation === 'string' ? record.explanation : undefined;
    const effectQueue = script
      ? splitSegments(script.movement.segments).effect.map((segment) => segment.toIndex)
      : [];
    const pointsPatch = Array.isArray(record.allPlayersPoints)
      ? Object.fromEntries(
          record.allPlayersPoints
            .map((entry) => {
              const pointRecord = toRecord(entry);
              return typeof pointRecord.playerId === 'string' && typeof pointRecord.points === 'number'
                ? [pointRecord.playerId, pointRecord.points]
                : null;
            })
            .filter((entry): entry is [string, number] => entry !== null)
        )
      : {};

    set((state) => {
      const matches = resolvedRoundId === state.currentQuizRound?.roundId;
      return {
        currentQuizRound:
          matches && state.currentQuizRound
            ? {
                ...state.currentQuizRound,
                question: {
                  ...state.currentQuizRound.question,
                  correctOptionId: resolvedCorrectOptionId,
                  explanation: resolvedExplanation ?? state.currentQuizRound.question.explanation,
                },
              }
            : state.currentQuizRound,
        quizResolvedData: matches
          ? {
              roundId: resolvedRoundId,
              correctOptionId: resolvedCorrectOptionId,
              explanation: resolvedExplanation,
              answers,
              effect: record.effect,
            }
          : state.quizResolvedData,
        latestResolvedTurn: script ?? state.latestResolvedTurn,
        turnPhase: 'awaiting_ack',
        pendingTurnDeadlineAt: script?.deadlineAt ?? state.pendingTurnDeadlineAt,
        pendingEffectActorId: script && effectQueue.length > 0 ? script.actorPlayerId : undefined,
        pendingEffectQueue: effectQueue.length > 0 ? effectQueue : undefined,
        effectAnimationActive: false,
        quizPointsByPlayer: {
          ...state.quizPointsByPlayer,
          ...pointsPatch,
        },
        actionMessage: 'Quiz resolvido',
      };
    });
  },

  markQuizSubmitted: (answer) => {
    set((state) => {
      if (!state.currentQuizRound || Date.now() >= state.currentQuizRound.deadlineAt) {
        return {};
      }
      return {
        quizSubmitted: true,
        currentQuizRound:
          state.currentQuizRound && answer && state.mePlayerId
            ? {
                ...state.currentQuizRound,
                myAnswer: {
                  playerId: state.mePlayerId,
                  selectedOptionId: answer.selectedOptionId,
                  result: answer.result,
                  pointsAwarded: answer.pointsAwarded,
                },
              }
            : state.currentQuizRound,
      };
    });
  },

  dismissQuizFeedback: () => {
    set({
      currentQuizRound: undefined,
      quizSubmitted: false,
      quizResolvedData: undefined,
    });
  },

  markActorArrived: (actorId) => {
    set((state) => {
      let queueDepleted = false;
      const actors = state.actors.map((actor) => {
        if (actor.id !== actorId) return actor;

        const currentQueue = actor.queue;
        if (currentQueue.length <= 1) {
          queueDepleted = true;
          return {
            ...actor,
            position: actor.targetIndex,
            targetIndex: actor.targetIndex,
            isMoving: false,
            queue: [],
          };
        }

        const nextQueue = currentQueue.slice(1);
        const nextTarget = nextQueue[0]!;

        return {
          ...actor,
          position: actor.targetIndex,
          targetIndex: nextTarget,
          isMoving: true,
          queue: nextQueue,
        };
      });

      if (!queueDepleted) {
        return { actors };
      }

      // Queue is empty. Decide what to clear based on the movement phase.
      const hasPendingEffect =
        state.pendingEffectActorId === actorId &&
        !state.effectAnimationActive &&
        state.pendingEffectQueue &&
        state.pendingEffectQueue.length > 0;

      if (hasPendingEffect) {
        // Dice segments just finished. Keep camera on actor while modal shows;
        // effect segments will be queued when turn_started arrives.
        return { actors };
      }

      const wasEffectAnimation = state.effectAnimationActive && state.pendingEffectActorId === actorId;
      return {
        actors,
        autoFollowActorId:
          state.autoFollowActorId === actorId ? undefined : state.autoFollowActorId,
        // Clean up effect state when effect animation finishes.
        ...(wasEffectAnimation && {
          pendingEffectActorId: undefined,
          pendingEffectQueue: undefined,
          effectAnimationActive: false,
        }),
      };
    });
  },

  setProcessedSequence: (sequence) => {
    set((state) => ({
      processedSequence: Math.max(state.processedSequence, sequence),
      latestSequence: Math.max(state.latestSequence, sequence),
    }));
  },

  dismissResolvedTurn: (turnId) => {
    set((state) => {
      const activeTurnId = state.latestResolvedTurn?.turnId;
      const dismissedTurnId = turnId ?? activeTurnId;

      if (!dismissedTurnId) {
        return {};
      }

      return {
        latestResolvedTurn: activeTurnId === dismissedTurnId ? undefined : state.latestResolvedTurn,
        pendingTurnDeadlineAt: activeTurnId === dismissedTurnId ? undefined : state.pendingTurnDeadlineAt,
        dismissedResolvedTurnId: dismissedTurnId,
      };
    });
  },

  reset: () => {
    set({ ...emptyState });
  },
}));
