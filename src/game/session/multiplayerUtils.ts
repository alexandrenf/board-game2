export const getInitialEventsCursor = (
  latestSequence: number,
  hasPendingTurn: boolean
): number => {
  const normalizedLatestSequence = Math.max(0, latestSequence);
  return hasPendingTurn
    ? Math.max(0, normalizedLatestSequence - 1)
    : normalizedLatestSequence;
};

export const shouldCancelPendingTurnOnLeave = (
  leavingPlayerId: string,
  pendingActorPlayerId?: string
): boolean => pendingActorPlayerId === leavingPlayerId;
