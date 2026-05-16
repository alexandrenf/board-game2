import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Twice a day: delete rooms that stayed empty/inactive long enough.
crons.interval('cleanup-empty-rooms', { hours: 12 }, internal.rooms.cleanupInactiveRooms);

// Every 30s: detect rooms whose phase deadline has passed + grace window and
// drive recovery (auto-roll, quiz resolve, or turn finalize). Catches cases
// where the per-phase scheduled function dropped or didn't fire.
crons.interval('recover-stuck-rooms', { seconds: 30 }, internal.rooms.recoverStuckRooms);

export default crons;
