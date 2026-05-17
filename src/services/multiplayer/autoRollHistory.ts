type CountableEvent = {
  type: string;
  payload?: unknown;
};

/**
 * Counts how many trailing `dice_rolled` events have `cause: 'auto'`.
 *
 * Scans newest-first; stops at the first non-auto roll. Non-`dice_rolled`
 * events (e.g. `turn_started`, `quiz_started`) are ignored so they don't
 * mask an auto-roll streak. A count of >= 2 means the server is running
 * the dice-freeze recovery loop: events keep arriving (so the room's
 * `phaseDeadlineAt` stays fresh) but no human is actually playing.
 *
 * Kept as a standalone function so the same client-side detection that
 * surfaces `StuckRoomBanner` can be unit-tested cheaply, and so payload-
 * shape regressions in `dice_rolled.payload.cause` fail loudly rather
 * than silently defeating the unstick UI.
 */
export const countTrailingAutoRolls = (events: readonly CountableEvent[]): number => {
  let count = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type !== 'dice_rolled') continue;
    const cause = (event.payload as { cause?: unknown } | undefined)?.cause;
    if (cause === 'auto') {
      count += 1;
      continue;
    }
    break;
  }
  return count;
};
