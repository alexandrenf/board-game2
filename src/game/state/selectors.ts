import { GameState } from './gameState';

export const selectGameProgress = (state: GameState) => {
  const totalSteps = Math.max(state.path.length, 1);
  const progressIndex = state.isMoving ? state.focusTileIndex : state.playerIndex;
  const progress = totalSteps > 1 ? (progressIndex / (totalSteps - 1)) * 100 : 0;

  return {
    progress,
    progressIndex,
    totalSteps,
  };
};

export const selectCurrentTile = (state: GameState) => {
  return state.path[state.focusTileIndex] ?? state.path[state.playerIndex];
};

export const selectInteractionLocked = (state: GameState) => {
  return state.isMoving || state.isRolling || state.showEducationalModal;
};
