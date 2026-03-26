import { SessionHistoryEntry, SessionParticipant, SessionPhase, SessionSnapshot } from './types';

type SoloSessionSnapshotInput = {
  playerName: string;
  playerIndex: number;
  targetIndex: number;
  isMoving: boolean;
  isRolling: boolean;
  showTileModal: boolean;
  lastMessage: string | null;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  hasFinished: boolean;
  history?: SessionHistoryEntry[];
};

type MultiplayerSessionSnapshotInput = {
  status: 'playing' | 'finished';
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
  winnerPlayerId?: string;
  winnerMessage?: string;
  resolvedTurn?: SessionSnapshot['resolvedTurn'];
};

export const buildSoloSessionSnapshot = (
  input: SoloSessionSnapshotInput
): SessionSnapshot => {
  const actor: SessionParticipant = {
    id: 'solo-player',
    name: input.playerName.trim() || 'Voce',
    position: input.playerIndex,
    targetIndex: input.targetIndex,
    isMoving: input.isMoving,
    isCurrentTurn: !input.hasFinished,
    isHost: true,
    isMe: true,
    shirtColor: input.shirtColor,
    hairColor: input.hairColor,
    skinColor: input.skinColor,
    queue: [],
  };

  const phase: SessionPhase = input.hasFinished
    ? 'finished'
    : input.showTileModal
      ? 'awaiting_ack'
      : 'awaiting_roll';

  return {
    mode: 'solo',
    status: input.hasFinished ? 'finished' : 'playing',
    phase,
    actors: [actor],
    currentTurnPlayerId: input.hasFinished ? undefined : actor.id,
    currentTurnId: undefined,
    selectedActorId: actor.id,
    canRoll: !input.hasFinished && !input.isMoving && !input.isRolling && !input.showTileModal,
    isRolling: input.isRolling,
    showTileModal: input.showTileModal,
    message: input.lastMessage,
    history: input.history ?? [],
    winnerPlayerId: input.hasFinished ? actor.id : undefined,
    winnerMessage: input.hasFinished ? 'Voce venceu a partida.' : undefined,
  };
};

export const buildMultiplayerSessionSnapshot = (
  input: MultiplayerSessionSnapshotInput
): SessionSnapshot => ({
  mode: 'multiplayer',
  status: input.status,
  phase: input.phase,
  actors: input.actors,
  currentTurnPlayerId: input.currentTurnPlayerId,
  currentTurnId: input.currentTurnId,
  selectedActorId: input.selectedActorId,
  canRoll: input.canRoll,
  isRolling: input.isRolling,
  showTileModal: input.showTileModal,
  message: input.message,
  history: input.history,
  resolvedTurn: input.resolvedTurn,
  winnerPlayerId: input.winnerPlayerId,
  winnerMessage: input.winnerMessage,
});
