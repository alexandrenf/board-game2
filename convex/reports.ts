import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { query, QueryCtx } from './_generated/server';
import { assembleMatchReport, buildReportSummary, MatchListItem } from '../src/domain/game/matchReport';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
// Concurrently-playing rooms are naturally few; cap the live scan defensively.
const ONGOING_SCAN_CAP = 100;

async function countResolvedRounds(ctx: QueryCtx, roomId: Id<'rooms'>): Promise<number> {
  const rounds = await ctx.db
    .query('roomQuizRounds')
    .withIndex('by_room_status', (q) => q.eq('roomId', roomId).eq('status', 'resolved'))
    .collect();
  return rounds.length;
}

/** Live-computes a list row for an in-progress room. Returns null if it has no
 *  resolved quiz rounds yet (nothing to report). */
async function buildOngoingListItem(ctx: QueryCtx, room: Doc<'rooms'>): Promise<MatchListItem | null> {
  const resolvedCount = await countResolvedRounds(ctx, room._id);
  if (resolvedCount < 1) return null;

  const players = (await ctx.db
    .query('roomPlayers')
    .withIndex('by_room', (q) => q.eq('roomId', room._id))
    .collect()) as Doc<'roomPlayers'>[];
  players.sort((a, b) =>
    a.joinedAt !== b.joinedAt ? a.joinedAt - b.joinedAt : a._creationTime - b._creationTime
  );

  const summary = buildReportSummary({
    players: players.map((p) => ({
      playerId: p._id,
      name: p.name,
      quizPoints: p.quizPoints ?? 0,
      joinedAt: p.joinedAt,
    })),
    resolvedRoundCount: resolvedCount,
    finishReason: 'in_progress',
  });

  return {
    matchId: room._id,
    code: room.code,
    status: 'ongoing',
    timestamp: room.lastActiveAt,
    questionCount: resolvedCount,
    players: summary.players.map((p) => ({
      name: p.name,
      quizPoints: p.quizPoints,
      isWinner: p.isWinner,
    })),
  };
}

/** Most-recent matches — finished and in-progress — that have ≥1 answered question. */
export const listRecentMatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<MatchListItem[]> => {
    const limit = Math.min(Math.max(1, args.limit ?? DEFAULT_LIMIT), MAX_LIMIT);

    // Finished: fast path from the stored summary (zero joins). Overfetch so
    // empty/legacy finished rooms can be filtered out without under-filling.
    const finishedRooms = (await ctx.db
      .query('rooms')
      .withIndex('by_status_finishedAt', (q) => q.eq('status', 'finished'))
      .order('desc')
      .take(Math.min(MAX_LIMIT * 3, limit * 3 + 30))) as Doc<'rooms'>[];

    const finishedItems: MatchListItem[] = finishedRooms
      .filter(
        (room) => room.finishedAt != null && (room.resolvedQuizCount ?? 0) > 0 && room.reportSummary != null
      )
      .map((room) => ({
        matchId: room._id,
        code: room.code,
        status: 'finished',
        timestamp: room.finishedAt as number,
        questionCount: room.reportSummary!.questionCount,
        finishReason: room.reportSummary!.finishReason,
        players: room.reportSummary!.players.map((p) => ({
          name: p.name,
          quizPoints: p.quizPoints,
          isWinner: p.isWinner,
        })),
      }));

    // Ongoing: live-compute (few active rooms). Include only those with answers.
    const playingRooms = (await ctx.db
      .query('rooms')
      .withIndex('by_status_phase_deadline', (q) => q.eq('status', 'playing'))
      .take(ONGOING_SCAN_CAP)) as Doc<'rooms'>[];
    const ongoingItems = (
      await Promise.all(playingRooms.map((room) => buildOngoingListItem(ctx, room)))
    ).filter((item): item is MatchListItem => item != null);

    return [...ongoingItems, ...finishedItems]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

/** Full per-match report. Works for finished matches and for in-progress matches
 *  (partial results: only already-resolved questions, so the live question's
 *  answer is never leaked). */
export const getMatchReport = query({
  args: { matchId: v.id('rooms') },
  handler: async (ctx, args) => {
    const room = (await ctx.db.get(args.matchId)) as Doc<'rooms'> | null;
    if (!room || (room.status !== 'finished' && room.status !== 'playing')) return null;
    const isOngoing = room.status === 'playing';

    const players = (await ctx.db
      .query('roomPlayers')
      .withIndex('by_room', (q) => q.eq('roomId', room._id))
      .collect()) as Doc<'roomPlayers'>[];
    players.sort((a, b) =>
      a.joinedAt !== b.joinedAt ? a.joinedAt - b.joinedAt : a._creationTime - b._creationTime
    );

    const allRounds = (await ctx.db
      .query('roomQuizRounds')
      .withIndex('by_room', (q) => q.eq('roomId', room._id))
      .collect()) as Doc<'roomQuizRounds'>[];
    const rounds = allRounds.filter((r) => r.status === 'resolved');
    const roundIds = new Set(rounds.map((r) => r._id));

    const allAnswers = (await ctx.db
      .query('roomQuizAnswers')
      .withIndex('by_room', (q) => q.eq('roomId', room._id))
      .collect()) as Doc<'roomQuizAnswers'>[];

    return assembleMatchReport({
      matchId: room._id,
      code: room.code,
      status: isOngoing ? 'ongoing' : 'finished',
      finishedAt: room.finishedAt ?? room.lastActiveAt,
      finishReason: isOngoing ? undefined : room.reportSummary?.finishReason ?? 'reached_end',
      players: players.map((p) => ({ playerId: p._id, name: p.name, quizPoints: p.quizPoints ?? 0 })),
      rounds: rounds.map((r) => ({
        roundId: r._id,
        questionId: r.questionId,
        questionText: r.questionText,
        options: r.options,
        correctOptionId: r.correctOptionId,
        explanation: r.explanation,
        tileColor: r.tileColor,
        turnNumber: r.turnNumber,
        startedAt: r.startedAt,
      })),
      answers: allAnswers
        .filter((a) => roundIds.has(a.roundId))
        .map((a) => ({
          roundId: a.roundId,
          playerId: a.playerId,
          selectedOptionId: a.selectedOptionId,
          result: a.result,
        })),
    });
  },
});
