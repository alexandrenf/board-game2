import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Twice a day: delete rooms that stayed empty/inactive long enough.
crons.interval('cleanup-empty-rooms', { hours: 12 }, internal.rooms.cleanupInactiveRooms);

export default crons;
