import { ResolvedTurn } from '@/src/domain/game/types';

export type SessionMode = 'solo' | 'multiplayer';
export type SessionStatus = 'idle' | 'playing' | 'finished';
export type SessionPhase = 'lobby' | 'awaiting_roll' | 'awaiting_quiz' | 'awaiting_ack' | 'finished';

export type SessionHistoryEntry = {
  id: string | number;
  text: string;
  player: string;
  timestamp: number;
};

export type SessionParticipant = {
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

export type SessionSnapshot = {
  mode: SessionMode;
  status: SessionStatus;
  phase: SessionPhase;
  actors: SessionParticipant[];
  currentTurnPlayerId?: string;
  currentTurnId?: string;
  selectedActorId?: string;
  canRoll: boolean;
  isRolling: boolean;
  showTileModal: boolean;
  message: string | null;
  history: SessionHistoryEntry[];
  resolvedTurn?: ResolvedTurn;
  winnerPlayerId?: string;
  winnerMessage?: string;
};

export interface SessionAdapter {
  hydrate?: () => void | Promise<void>;
  roll?: () => void | Promise<void>;
  ackOrCommit?: (turnId?: string) => void | Promise<void>;
  leave?: () => void | Promise<void>;
}
