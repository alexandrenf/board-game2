import { ResolvedTurn } from '@/src/domain/game/types';

/** Whether the session is a local solo game or an online multiplayer match. */
export type SessionMode = 'solo' | 'multiplayer';

/** High-level lifecycle status of a game session. */
export type SessionStatus = 'idle' | 'playing' | 'finished';

/** Fine-grained phase within an active multiplayer turn. */
export type SessionPhase = 'lobby' | 'awaiting_roll' | 'awaiting_quiz' | 'awaiting_ack' | 'finished';

/** Single line item in the session activity history log. */
export type SessionHistoryEntry = {
  id: string | number;
  text: string;
  player: string;
  timestamp: number;
};

/** Represents a player (local or remote) inside a session snapshot. */
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

/** Normalized snapshot of the entire game session used by UI overlays. */
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

/** Optional adapter interface for bridging session state to external services. */
export interface SessionAdapter {
  hydrate?: () => void | Promise<void>;
  roll?: () => void | Promise<void>;
  ackOrCommit?: (turnId?: string) => void | Promise<void>;
  leave?: () => void | Promise<void>;
}
