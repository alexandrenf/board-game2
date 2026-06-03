import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';
import { query } from './_generated/server';
import { assembleMatchReport, FinishedMatchListItem } from '../src/domain/game/matchReport';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Most-recent finished matches that had at least one resolved quiz round. */
export const listFinishedMatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<FinishedMatchListItem[]> => {
    const limit = Math.min(Math.max(1, args.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    // Overfetch so empty/legacy finished rooms can be filtered out without
    // under-filling the page.
    const rooms = (await ctx.db
      .query('rooms')
      .withIndex('by_status_finishedAt', (q) => q.eq('status', 'finished'))
      .order('desc')
      .take(Math.min(MAX_LIMIT * 3, limit * 3 + 30))) as Doc<'rooms'>[];

    return rooms
      .filter(
        (room) => room.finishedAt != null && (room.resolvedQuizCount ?? 0) > 0 && room.reportSummary != null
      )
      .slice(0, limit)
      .map((room) => ({
        matchId: room._id,
        code: room.code,
        finishedAt: room.finishedAt as number,
        questionCount: room.reportSummary!.questionCount,
        finishReason: room.reportSummary!.finishReason,
        players: room.reportSummary!.players.map((p) => ({
          name: p.name,
          quizPoints: p.quizPoints,
          isWinner: p.isWinner,
        })),
      }));
  },
});

/** Full per-match report: questions in order, each player's pick, correct answer. */
export const getMatchReport = query({
  args: { matchId: v.id('rooms') },
  handler: async (ctx, args) => {
    const room = (await ctx.db.get(args.matchId)) as Doc<'rooms'> | null;
    if (!room || room.status !== 'finished') return null;

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
      finishedAt: room.finishedAt ?? room.updatedAt,
      finishReason: room.reportSummary?.finishReason ?? 'reached_end',
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
