import { create } from 'zustand';
import { SceneActor, TurnAnimationScript } from '@/src/game/runtime/types';
import { AVATAR_CHARACTER_PREFIX } from './avatarCharacter';
import { parseTurnScript } from './turnScriptUtils';

type MultiplayerSnapshotPlayer = {
  id: string;
  name: string;
  characterId?: string;
  position: number;
  orderRoll?: number;
  orderRank?: number;
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
  syncFromSnapshot: (snapshot: MultiplayerSnapshot) => void;
  applyTurnResolved: (script: TurnAnimationScript) => void;
  applyTurnStarted: (nextPlayerId: string) => void;
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

export const useMultiplayerRuntimeStore = create<RuntimeStore>((set, get) => ({
  ...emptyState,

  syncFromSnapshot: (snapshot) => {
    const actorMap = new Map(get().actors.map((entry) => [entry.id, entry]));

    const activePlayers = snapshot.players.filter((player) => player.status === 'active');
    const actors: SceneActor[] = activePlayers.map((player) => {
      const previous = actorMap.get(player.id);
      const colors = parseAvatarColors(player.id, player.characterId);
      const hasPendingTurnForActor = snapshot.pendingTurn?.actorPlayerId === player.id;
      const keepAnimation = Boolean(
        previous && (previous.isMoving || previous.queue.length > 0 || hasPendingTurnForActor)
      );

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
    const pendingScript = parseTurnScript(snapshot.pendingTurn?.script);

    set((state) => {
      const shouldRestorePendingTurn =
        pendingScript && pendingScript.turnId !== state.dismissedResolvedTurnId;

      return {
        enabled: snapshot.room.status === 'playing',
        roomStatus: snapshot.room.status,
        roomId: snapshot.room.id,
        mePlayerId: snapshot.me,
        currentTurnPlayerId,
        currentTurnId: snapshot.room.currentTurnId,
        turnPhase: snapshot.room.turnPhase,
        latestSequence: snapshot.latestSequence ?? state.latestSequence,
        actors,
        focusActorId:
          state.focusActorId && actors.some((entry) => entry.id === state.focusActorId)
            ? state.focusActorId
            : fallbackFocusId,
        latestResolvedTurn: shouldRestorePendingTurn ? pendingScript : state.latestResolvedTurn,
        pendingTurnDeadlineAt: snapshot.pendingTurn?.deadlineAt,
        actionMessage:
          snapshot.room.status === 'playing' && currentTurnPlayerId
            ? `${actors.find((entry) => entry.id === currentTurnPlayerId)?.name ?? 'Jogador'} em acao`
            : state.actionMessage,
      };
    });
  },

  applyTurnResolved: (script) => {
    set((state) => {
      const actors = state.actors.map((actor) => {
        if (actor.id !== script.actorPlayerId) return actor;

        const segmentQueue = script.movement.segments.map((segment) => segment.toIndex);
        const firstTarget = segmentQueue[0];
        if (typeof firstTarget !== 'number') {
          return {
            ...actor,
            position: script.movement.finalIndex,
            targetIndex: script.movement.finalIndex,
            isMoving: false,
            queue: [],
          };
        }

        return {
          ...actor,
          position: script.movement.fromIndex,
          targetIndex: firstTarget,
          isMoving: true,
          queue: segmentQueue,
        };
      });

      const actorName = actors.find((entry) => entry.id === script.actorPlayerId)?.name ?? 'Jogador';
      return {
        actors,
        currentTurnPlayerId: script.actorPlayerId,
        currentTurnId: script.turnId,
        turnPhase: 'awaiting_ack',
        focusActorId: script.actorPlayerId,
        autoFollowActorId: script.actorPlayerId,
        latestResolvedTurn:
          script.turnId === state.dismissedResolvedTurnId ? state.latestResolvedTurn : script,
        pendingTurnDeadlineAt: script.deadlineAt,
        actionMessage: `${actorName} rolou ${script.roll.value}`,
      };
    });
  },

  applyTurnStarted: (nextPlayerId) => {
    set((state) => {
      const actors = state.actors.map((actor) => ({
        ...actor,
        isCurrentTurn: actor.id === nextPlayerId,
      }));
      const actorName = actors.find((entry) => entry.id === nextPlayerId)?.name ?? 'Jogador';

      return {
        actors,
        currentTurnPlayerId: nextPlayerId,
        currentTurnId: undefined,
        turnPhase: 'awaiting_roll',
        focusActorId: nextPlayerId,
        autoFollowActorId: undefined,
        pendingTurnDeadlineAt: undefined,
        actionMessage: `Turno de ${actorName}`,
      };
    });
  },

  markActorArrived: (actorId) => {
    set((state) => {
      let shouldClearFollow = false;
      const actors = state.actors.map((actor) => {
        if (actor.id !== actorId) return actor;

        const currentQueue = actor.queue;
        if (currentQueue.length <= 1) {
          shouldClearFollow = true;
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

      return {
        actors,
        autoFollowActorId:
          shouldClearFollow && state.autoFollowActorId === actorId ? undefined : state.autoFollowActorId,
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
