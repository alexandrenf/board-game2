type PendingTurnLeaveContext = {
  leavingPlayerId: string;
  pendingActorPlayerId?: string;
  currentTurnPlayerId?: string;
  remainingActivePlayerIds: readonly string[];
};

export const getInitialEventsCursor = (latestSequence: number): number =>
  Math.max(0, latestSequence);

export const shouldCancelPendingTurnOnLeave = ({
  leavingPlayerId,
  pendingActorPlayerId,
  currentTurnPlayerId,
  remainingActivePlayerIds,
}: PendingTurnLeaveContext): boolean => {
  if (!pendingActorPlayerId) return false;
  if (pendingActorPlayerId === leavingPlayerId) return true;
  if (remainingActivePlayerIds.length <= 1) return true;
  if (!currentTurnPlayerId) return true;
  return !remainingActivePlayerIds.includes(currentTurnPlayerId);
};
