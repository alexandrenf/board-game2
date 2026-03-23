export type SceneActor = {
  id: string;
  name: string;
  position: number;
  targetIndex: number;
  isMoving: boolean;
  isCurrentTurn: boolean;
  isHost: boolean;
  isMe: boolean;
  characterId?: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  queue: number[];
};

export type TurnAnimationScript = {
  turnId: string;
  actorPlayerId: string;
  turnNumber: number;
  roll: {
    value: number;
    startedAt: number;
    durationMs: number;
  };
  movement: {
    fromIndex: number;
    baseToIndex: number;
    finalIndex: number;
    segments: {
      kind: 'dice' | 'effect';
      fromIndex: number;
      toIndex: number;
      value: number;
      durationMs: number;
      effectType?: 'advance' | 'retreat';
    }[];
  };
  landingTile?: {
    index: number;
    id: number;
    color?: string;
    type?: string | null;
    text?: string;
    imageKey?: string;
    meta?: Record<string, unknown>;
  };
  effect?: {
    source: 'rules' | 'tile';
    type: 'advance' | 'retreat';
    value: number;
    fromIndex: number;
    toIndex: number;
  } | null;
  nextTurn?: {
    playerId: string;
    turnNumber: number;
  } | null;
  result: {
    gameFinished: boolean;
    winnerPlayerId?: string;
    reason?: string;
  };
  deadlineAt?: number;
};
