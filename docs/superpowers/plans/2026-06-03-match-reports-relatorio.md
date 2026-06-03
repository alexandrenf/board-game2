# Match Reports — `/relatorio` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/relatorio` page that lists recently-finished multiplayer matches and shows a per-match report (every quiz question, each player's pick, the correct answer), with finished matches retained for 24h.

**Architecture:** No gameplay changes. Pure data-shaping lives in a unit-tested module (`src/domain/game/matchReport.ts`); Convex queries (`convex/reports.ts`) are thin adapters; the match-finish path stamps a `finishedAt`/`reportSummary` via one helper; cleanup retains finished rooms 24h; an Expo Router nested route renders the UI.

**Tech Stack:** Expo Router, React Native (+ react-native-web), Convex, TypeScript, jest-expo (unit), Playwright (web smoke). Package manager: **bun**.

**Spec:** `docs/superpowers/specs/2026-06-03-match-reports-relatorio-design.md`

---

## File Structure

| File | Create/Modify | Responsibility |
| --- | --- | --- |
| `src/domain/game/matchReport.ts` | Create | Pure: `isFinishedMatchExpired`, `buildReportSummary`, `assembleMatchReport` + shared types |
| `src/domain/game/__tests__/matchReport.test.ts` | Create | Unit tests for the pure module |
| `convex/schema.ts` | Modify | New `rooms` fields + `by_status_finishedAt` index |
| `convex/rooms.ts` | Modify | `markRoomFinished` helper; stamp finish fields at 3 sites; 24h retention branch in cleanup |
| `convex/reports.ts` | Create | `listFinishedMatches`, `getMatchReport` queries |
| `src/components/report/format.ts` | Create | pt-BR date, result/finish-reason labels |
| `src/components/report/printWeb.ts` | Create | Web print stylesheet + `printReport()` |
| `src/components/report/MatchListRow.tsx` | Create | One match row in the list |
| `src/components/report/PlayerSummaryHeader.tsx` | Create | Per-player summary table |
| `src/components/report/QuestionReportCard.tsx` | Create | One question's full breakdown |
| `app/relatorio/index.tsx` | Create | List route `/relatorio` |
| `app/relatorio/[matchId].tsx` | Create | Detail route `/relatorio/<id>` + print |
| `app/_layout.tsx` | Modify | Register the two routes |
| `e2e/web-smoke.spec.ts` | Modify | Smoke: `/relatorio` renders |

---

## Task 1: Pure match-report module (TDD)

**Files:**
- Create: `src/domain/game/matchReport.ts`
- Test: `src/domain/game/__tests__/matchReport.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/game/__tests__/matchReport.test.ts`:

```ts
import {
  isFinishedMatchExpired,
  buildReportSummary,
  assembleMatchReport,
} from '../matchReport';

const DAY = 24 * 60 * 60 * 1000;

describe('isFinishedMatchExpired', () => {
  it('treats missing finishedAt (legacy rooms) as expired', () => {
    expect(isFinishedMatchExpired(undefined, 1000, DAY)).toBe(true);
    expect(isFinishedMatchExpired(null, 1000, DAY)).toBe(true);
  });

  it('keeps a match within the retention window', () => {
    expect(isFinishedMatchExpired(1000, 1000 + DAY, DAY)).toBe(false);
  });

  it('expires a match past the retention window', () => {
    expect(isFinishedMatchExpired(1000, 1000 + DAY + 1, DAY)).toBe(true);
  });
});

describe('buildReportSummary', () => {
  const players = [
    { playerId: 'a', name: 'Ana', quizPoints: 5, joinedAt: 1 },
    { playerId: 'b', name: 'Bia', quizPoints: 10, joinedAt: 2 },
    { playerId: 'c', name: 'Caio', quizPoints: 10, joinedAt: 3 },
  ];

  it('puts the winner first, then sorts by points desc, then joinedAt asc', () => {
    const summary = buildReportSummary({
      players,
      resolvedRoundCount: 4,
      winnerPlayerId: 'a',
      finishReason: 'reached_end',
    });
    expect(summary.questionCount).toBe(4);
    expect(summary.finishReason).toBe('reached_end');
    expect(summary.players.map((p) => p.playerId)).toEqual(['a', 'b', 'c']);
    expect(summary.players[0].isWinner).toBe(true);
    expect(summary.players[1].isWinner).toBe(false);
  });

  it('without a winner, sorts purely by points then joinedAt', () => {
    const summary = buildReportSummary({
      players,
      resolvedRoundCount: 0,
      finishReason: 'no_active_players',
    });
    expect(summary.players.map((p) => p.playerId)).toEqual(['b', 'c', 'a']);
    expect(summary.players.every((p) => !p.isWinner)).toBe(true);
  });
});

describe('assembleMatchReport', () => {
  const base = {
    matchId: 'room1',
    code: 'ABC',
    finishedAt: 123,
    finishReason: 'reached_end',
    players: [
      { playerId: 'a', name: 'Ana', quizPoints: 5 },
      { playerId: 'b', name: 'Bia', quizPoints: 0 },
    ],
    rounds: [
      {
        roundId: 'r2',
        questionId: 'q2',
        questionText: 'Segunda?',
        options: [
          { id: 'o1', text: 'Um' },
          { id: 'o2', text: 'Dois' },
        ],
        correctOptionId: 'o2',
        explanation: 'porque dois',
        tileColor: 'red',
        turnNumber: 5,
        startedAt: 200,
      },
      {
        roundId: 'r1',
        questionId: 'q1',
        questionText: 'Primeira?',
        options: [
          { id: 'o1', text: 'Sim' },
          { id: 'o2', text: 'Nao' },
        ],
        correctOptionId: 'o1',
        explanation: undefined,
        tileColor: 'green',
        turnNumber: 2,
        startedAt: 100,
      },
    ],
    answers: [
      { roundId: 'r1', playerId: 'a', selectedOptionId: 'o1', result: 'correct' as const },
      { roundId: 'r1', playerId: 'b', selectedOptionId: 'o2', result: 'incorrect' as const },
      { roundId: 'r2', playerId: 'a', selectedOptionId: undefined, result: 'timeout' as const },
      // player b has no answer row for r2 at all
    ],
  };

  it('orders questions chronologically by turnNumber then startedAt', () => {
    const report = assembleMatchReport(base);
    expect(report.questions.map((q) => q.questionId)).toEqual(['q1', 'q2']);
    expect(report.totalQuestions).toBe(2);
  });

  it('resolves correct option text and per-answer selected text', () => {
    const report = assembleMatchReport(base);
    const q1 = report.questions[0];
    expect(q1.correctOptionText).toBe('Sim');
    const ana = q1.answers.find((x) => x.playerId === 'a')!;
    expect(ana.result).toBe('correct');
    expect(ana.selectedOptionText).toBe('Sim');
  });

  it('renders timeout and missing answer rows as not-answered', () => {
    const report = assembleMatchReport(base);
    const q2 = report.questions[1];
    const ana = q2.answers.find((x) => x.playerId === 'a')!;
    const bia = q2.answers.find((x) => x.playerId === 'b')!;
    expect(ana.result).toBe('timeout');
    expect(ana.selectedOptionText).toBeNull();
    expect(bia.result).toBe('timeout');
    expect(bia.selectedOptionId).toBeNull();
  });

  it('computes per-player accuracy and sorts summary by points desc', () => {
    const report = assembleMatchReport(base);
    expect(report.players.map((p) => p.playerId)).toEqual(['a', 'b']);
    const ana = report.players[0];
    expect(ana.correctCount).toBe(1);
    expect(ana.answeredCount).toBe(1); // answered r1, timed out r2
    expect(ana.totalQuestions).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- matchReport`
Expected: FAIL — `Cannot find module '../matchReport'`.

- [ ] **Step 3: Write the implementation**

Create `src/domain/game/matchReport.ts`:

```ts
/** Pure, dependency-free helpers for building match reports. Unit-tested. */

export type QuizResultValue = 'correct' | 'incorrect' | 'timeout';

/** Returns true when a finished match is past its retention window (or never stamped). */
export function isFinishedMatchExpired(
  finishedAt: number | null | undefined,
  now: number,
  retentionMs: number
): boolean {
  if (finishedAt == null) return true;
  return now - finishedAt > retentionMs;
}

// ---- reportSummary (stored on the room at finish; powers the list) ----

export type SummaryPlayerInput = {
  playerId: string;
  name: string;
  quizPoints: number;
  joinedAt: number;
};

export type ReportSummary = {
  finishReason: string;
  questionCount: number;
  players: { playerId: string; name: string; quizPoints: number; isWinner: boolean }[];
};

export function buildReportSummary(input: {
  players: SummaryPlayerInput[];
  resolvedRoundCount: number;
  winnerPlayerId?: string;
  finishReason: string;
}): ReportSummary {
  const players = [...input.players]
    .sort((l, r) => {
      if (input.winnerPlayerId) {
        if (l.playerId === input.winnerPlayerId) return -1;
        if (r.playerId === input.winnerPlayerId) return 1;
      }
      const pointsDelta = r.quizPoints - l.quizPoints;
      if (pointsDelta !== 0) return pointsDelta;
      return l.joinedAt - r.joinedAt;
    })
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      quizPoints: p.quizPoints,
      isWinner: p.playerId === input.winnerPlayerId,
    }));
  return { finishReason: input.finishReason, questionCount: input.resolvedRoundCount, players };
}

// ---- list item (shared between query and UI) ----

export type FinishedMatchListItem = {
  matchId: string;
  code: string;
  finishedAt: number;
  questionCount: number;
  finishReason: string;
  players: { name: string; quizPoints: number; isWinner: boolean }[];
};

// ---- full report (detail view) ----

export type ReportPlayerInput = { playerId: string; name: string; quizPoints: number };

export type ReportRoundInput = {
  roundId: string;
  questionId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;
  tileColor: string;
  turnNumber: number;
  startedAt: number;
};

export type ReportAnswerInput = {
  roundId: string;
  playerId: string;
  selectedOptionId?: string;
  result: QuizResultValue;
};

export type ReportQuestionAnswer = {
  playerId: string;
  name: string;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  result: QuizResultValue;
};

export type ReportQuestion = {
  questionId: string;
  questionText: string;
  tileColor: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  correctOptionText: string;
  explanation: string | null;
  answers: ReportQuestionAnswer[];
};

export type ReportPlayerSummary = {
  playerId: string;
  name: string;
  quizPoints: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
};

export type MatchReport = {
  matchId: string;
  code: string;
  finishedAt: number;
  finishReason: string;
  totalQuestions: number;
  players: ReportPlayerSummary[];
  questions: ReportQuestion[];
};

export function assembleMatchReport(input: {
  matchId: string;
  code: string;
  finishedAt: number;
  finishReason: string;
  players: ReportPlayerInput[];
  rounds: ReportRoundInput[];
  answers: ReportAnswerInput[];
}): MatchReport {
  const playersInOrder = [...input.players];

  const sortedRounds = [...input.rounds].sort((a, b) =>
    a.turnNumber !== b.turnNumber ? a.turnNumber - b.turnNumber : a.startedAt - b.startedAt
  );

  // roundId -> (playerId -> answer)
  const answersByRound = new Map<string, Map<string, ReportAnswerInput>>();
  for (const ans of input.answers) {
    let m = answersByRound.get(ans.roundId);
    if (!m) {
      m = new Map();
      answersByRound.set(ans.roundId, m);
    }
    m.set(ans.playerId, ans);
  }

  const questions: ReportQuestion[] = sortedRounds.map((round) => {
    const optText = new Map(round.options.map((o) => [o.id, o.text] as const));
    const roundAnswers = answersByRound.get(round.roundId) ?? new Map<string, ReportAnswerInput>();
    const answers: ReportQuestionAnswer[] = playersInOrder.map((p) => {
      const a = roundAnswers.get(p.playerId);
      if (!a) {
        return {
          playerId: p.playerId,
          name: p.name,
          selectedOptionId: null,
          selectedOptionText: null,
          result: 'timeout',
        };
      }
      const selectedOptionId = a.selectedOptionId ?? null;
      return {
        playerId: p.playerId,
        name: p.name,
        selectedOptionId,
        selectedOptionText: selectedOptionId != null ? optText.get(selectedOptionId) ?? null : null,
        result: a.result,
      };
    });
    return {
      questionId: round.questionId,
      questionText: round.questionText,
      tileColor: round.tileColor,
      options: round.options,
      correctOptionId: round.correctOptionId,
      correctOptionText: optText.get(round.correctOptionId) ?? '',
      explanation: round.explanation ?? null,
      answers,
    };
  });

  const totalQuestions = sortedRounds.length;
  const players: ReportPlayerSummary[] = playersInOrder
    .map((p) => {
      let correctCount = 0;
      let answeredCount = 0;
      for (const round of sortedRounds) {
        const a = answersByRound.get(round.roundId)?.get(p.playerId);
        if (a && a.result === 'correct') correctCount += 1;
        if (a && a.result !== 'timeout') answeredCount += 1;
      }
      return {
        playerId: p.playerId,
        name: p.name,
        quizPoints: p.quizPoints,
        correctCount,
        answeredCount,
        totalQuestions,
      };
    })
    .sort((a, b) => b.quizPoints - a.quizPoints || a.name.localeCompare(b.name));

  return {
    matchId: input.matchId,
    code: input.code,
    finishedAt: input.finishedAt,
    finishReason: input.finishReason,
    totalQuestions,
    players,
    questions,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- matchReport`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/domain/game/matchReport.ts src/domain/game/__tests__/matchReport.test.ts
git commit -m "feat(report): pure match-report assembly + retention helpers"
```

---

## Task 2: Schema fields + index

**Files:**
- Modify: `convex/schema.ts:32-37`

- [ ] **Step 1: Add fields to the `rooms` table**

In `convex/schema.ts`, inside the `rooms` `defineTable({...})`, add these fields right after the `characterClaims` line (currently line 33):

```ts
    // Maps characterId (lowercase) -> playerId for atomic conflict detection in setCharacter.
    characterClaims: v.optional(v.record(v.string(), v.id('roomPlayers'))),
    // --- Match report fields (set when the match finishes) ---
    finishedAt: v.optional(v.number()),
    resolvedQuizCount: v.optional(v.number()),
    reportSummary: v.optional(
      v.object({
        finishReason: v.string(),
        questionCount: v.number(),
        players: v.array(
          v.object({
            playerId: v.id('roomPlayers'),
            name: v.string(),
            quizPoints: v.number(),
            isWinner: v.boolean(),
          })
        ),
      })
    ),
```

- [ ] **Step 2: Add the index**

Change the `rooms` index chain (currently lines 35-37) to add `by_status_finishedAt`:

```ts
    .index('by_code', ['code'])
    .index('by_last_active_at', ['lastActiveAt'])
    .index('by_status_phase_deadline', ['status', 'phaseDeadlineAt'])
    .index('by_status_finishedAt', ['status', 'finishedAt']),
```

- [ ] **Step 3: Regenerate Convex types**

Run: `bunx convex codegen`
Expected: regenerates `convex/_generated/*`; `Doc<'rooms'>` now includes `finishedAt`, `resolvedQuizCount`, `reportSummary`.
If `codegen` errors needing a deployment, run `bunx convex dev --once` instead.

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS (no usages yet; schema compiles).

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(report): add finishedAt/reportSummary fields + by_status_finishedAt index"
```

---

## Task 3: Stamp finish fields (`markRoomFinished`)

**Files:**
- Modify: `convex/rooms.ts` (imports; new helper; 3 finish sites ~L843, ~L867, ~L2778)

- [ ] **Step 1: Import the summary builder**

At the top of `convex/rooms.ts`, with the other `../src/...` imports (near line 16), add:

```ts
import { buildReportSummary } from '../src/domain/game/matchReport';
```

- [ ] **Step 2: Add the `markRoomFinished` helper**

Place it just **after** `buildQuizRankings` (which ends at line 199):

```ts
type ReportSummaryDoc = {
  finishReason: string;
  questionCount: number;
  players: { playerId: PlayerId; name: string; quizPoints: number; isWinner: boolean }[];
};

/**
 * Computes the persisted match-report fields when a room finishes:
 * `finishedAt`, `resolvedQuizCount`, and a self-contained `reportSummary`
 * (used by the /relatorio list with no joins). Reads all players (including
 * those who left) and counts resolved quiz rounds. Does not patch the room —
 * callers merge the returned fields into their roomPatch.
 */
const markRoomFinished = async (
  ctx: { db: DatabaseReader },
  roomId: RoomId,
  opts: { winnerPlayerId?: PlayerId; finishReason: string; now: number }
): Promise<{ finishedAt: number; resolvedQuizCount: number; reportSummary: ReportSummaryDoc }> => {
  const players = await getRoomPlayers(ctx, roomId);
  const resolvedRounds = await ctx.db
    .query('roomQuizRounds')
    .withIndex('by_room_status', (q) => q.eq('roomId', roomId).eq('status', 'resolved'))
    .collect();
  const resolvedQuizCount = resolvedRounds.length;
  const summary = buildReportSummary({
    players: players.map((p) => ({
      playerId: p._id,
      name: p.name,
      quizPoints: p.quizPoints ?? 0,
      joinedAt: p.joinedAt,
    })),
    resolvedRoundCount: resolvedQuizCount,
    winnerPlayerId: opts.winnerPlayerId,
    finishReason: opts.finishReason,
  });
  return {
    finishedAt: opts.now,
    resolvedQuizCount,
    reportSummary: {
      finishReason: summary.finishReason,
      questionCount: summary.questionCount,
      players: summary.players.map((p) => ({
        playerId: p.playerId as PlayerId,
        name: p.name,
        quizPoints: p.quizPoints,
        isWinner: p.isWinner,
      })),
    },
  };
};
```

- [ ] **Step 3: Stamp at finalize site #1 (gameFinished / one player left)**

In `finalizeTurnOperationCore`, the branch that begins `if (operation.gameFinished || normalizedTurnOrder.length <= 1) {` (line 837). After the four `roomPatch.status/turnPhase/currentTurnPlayerId/currentTurnIndex` assignments (lines 843-846) and **before** the `events.push({ type: 'game_finished', ... })`, insert:

```ts
    Object.assign(
      roomPatch,
      await markRoomFinished(ctx, room._id, {
        winnerPlayerId,
        finishReason: operation.finishReason ?? 'reached_end',
        now,
      })
    );
```

- [ ] **Step 4: Stamp at finalize site #2 (no next turn)**

In the same function, the `if (!nextTurn) {` branch (line 865). After its four `roomPatch.*` assignments (lines 867-870) and before its `events.push({ type: 'game_finished', ... })`, insert:

```ts
      Object.assign(
        roomPatch,
        await markRoomFinished(ctx, room._id, {
          winnerPlayerId,
          finishReason: 'only_one_player',
          now,
        })
      );
```

- [ ] **Step 5: Stamp at the `leaveRoom` finish site #3**

In `leaveRoom`, the `if (nextTurnOrder.length <= 1) {` branch (line 2777). After its `roomPatch.*` assignments (lines 2778-2784) and before the `if (nextTurnOrder[0]) { events.push(...) }`, insert:

```ts
        Object.assign(
          roomPatch,
          await markRoomFinished(ctx, room._id, {
            winnerPlayerId: nextTurnOrder[0],
            finishReason: nextTurnOrder[0] ? 'only_one_player' : 'no_active_players',
            now,
          })
        );
```

(`roomPatch` here is typed `Record<string, unknown>`, so `Object.assign` is fine. `nextTurnOrder[0]` may be `undefined` → `winnerPlayerId` undefined → all `isWinner` false, which is correct for `no_active_players`.)

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add convex/rooms.ts
git commit -m "feat(report): stamp finishedAt + reportSummary when a match finishes"
```

---

## Task 4: 24h retention in cleanup

**Files:**
- Modify: `convex/rooms.ts` (constant near line 35; `cleanupInactiveRooms` loop ~L2953)

- [ ] **Step 1: Add the retention constant + import**

Near `EMPTY_ROOM_TTL_MS` (line 35), add:

```ts
const EMPTY_ROOM_TTL_MS = 12 * 60 * 60 * 1000;
// Finished matches are kept for the /relatorio report for at least 24h.
const FINISHED_REPORT_RETENTION_MS = 24 * 60 * 60 * 1000;
```

Add to the `matchReport` import line from Task 3:

```ts
import { buildReportSummary, isFinishedMatchExpired } from '../src/domain/game/matchReport';
```

- [ ] **Step 2: Add the finished-room branch in the cleanup loop**

In `cleanupInactiveRooms`, inside `for (const room of rooms) {` (line 2953), right after `scannedCount += 1;` (line 2954) and **before** the presence-probe comment/logic, insert:

```ts
        // Finished matches power /relatorio: keep them for the retention window,
        // then delete. Bumping lastActiveAt on retained rooms moves them out of
        // the <cutoff window so the batch loop keeps making progress; they
        // reappear ~12h later and are deleted once past 24h. Legacy finished
        // rooms without finishedAt are treated as expired.
        if (room.status === 'finished') {
          if (isFinishedMatchExpired(room.finishedAt, now, FINISHED_REPORT_RETENTION_MS)) {
            await removeRoomData(ctx, room._id);
            deletedCount += 1;
          } else {
            await ctx.db.patch(room._id, { lastActiveAt: now, updatedAt: now });
          }
          continue;
        }
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Run the full unit suite (no regressions)**

Run: `bun run test`
Expected: PASS (existing suites + matchReport).

- [ ] **Step 5: Commit**

```bash
git add convex/rooms.ts
git commit -m "feat(report): retain finished matches 24h in cleanup cron"
```

---

## Task 5: Read queries (`convex/reports.ts`)

**Files:**
- Create: `convex/reports.ts`

- [ ] **Step 1: Write the queries**

Create `convex/reports.ts`:

```ts
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
```

- [ ] **Step 2: Regenerate types + typecheck**

Run: `bunx convex codegen && bun run typecheck`
Expected: PASS; `multiplayerApi.reports.listFinishedMatches` / `.getMatchReport` become callable from the app.

- [ ] **Step 3: Commit**

```bash
git add convex/reports.ts convex/_generated
git commit -m "feat(report): listFinishedMatches + getMatchReport queries"
```

---

## Task 6: Frontend helpers (format + print)

**Files:**
- Create: `src/components/report/format.ts`
- Create: `src/components/report/printWeb.ts`

- [ ] **Step 1: Write `format.ts`**

Create `src/components/report/format.ts`:

```ts
import { COLORS, TILE_COLORS } from '@/src/constants/colors';
import type { QuizResultValue } from '@/src/domain/game/matchReport';

export function formatMatchDate(ts: number): string {
  const date = new Date(ts);
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function finishReasonLabel(reason: string): string {
  switch (reason) {
    case 'reached_end':
      return 'Chegou ao fim';
    case 'only_one_player':
      return 'Restou um jogador';
    case 'no_active_players':
      return 'Sem jogadores ativos';
    default:
      return reason;
  }
}

export const RESULT_LABEL: Record<QuizResultValue, string> = {
  correct: 'Acertou',
  incorrect: 'Errou',
  timeout: 'Não respondeu',
};

export function resultColor(result: QuizResultValue): string {
  if (result === 'correct') return COLORS.success;
  if (result === 'incorrect') return COLORS.danger;
  return COLORS.textMuted;
}

export function tileColorHex(tileColor: string): string {
  return (TILE_COLORS as Record<string, string>)[tileColor] ?? COLORS.textMuted;
}
```

- [ ] **Step 2: Write `printWeb.ts`**

Create `src/components/report/printWeb.ts`:

```ts
/** Web-only print helpers. No-ops on native. */

const STYLE_ID = 'relatorio-print-styles';

/** Injects a print stylesheet once so the report prints fully (no clipping). */
export function injectReportPrintStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '@media print {',
    '  body { background: #ffffff !important; }',
    '  html, body, #root { height: auto !important; overflow: visible !important; }',
    '  #relatorio-root, #relatorio-root * { overflow: visible !important; }',
    '  #relatorio-no-print { display: none !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
}

export function printReport(): void {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/report/format.ts src/components/report/printWeb.ts
git commit -m "feat(report): formatting + web print helpers"
```

---

## Task 7: Presentational components

**Files:**
- Create: `src/components/report/MatchListRow.tsx`
- Create: `src/components/report/PlayerSummaryHeader.tsx`
- Create: `src/components/report/QuestionReportCard.tsx`

- [ ] **Step 1: `MatchListRow.tsx`**

Create `src/components/report/MatchListRow.tsx`:

```tsx
import { COLORS } from '@/src/constants/colors';
import type { FinishedMatchListItem } from '@/src/domain/game/matchReport';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMatchDate } from './format';

type Props = { match: FinishedMatchListItem; onPress: () => void };

export function MatchListRow({ match, onPress }: Props) {
  const names = match.players.map((p) => (p.isWinner ? `${p.name} 🏆` : p.name)).join(', ');
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      testID={`relatorio-match-${match.matchId}`}
      accessibilityRole="button"
    >
      <View style={styles.headerLine}>
        <Text style={styles.code}>Sala {match.code}</Text>
        <Text style={styles.date}>{formatMatchDate(match.finishedAt)}</Text>
      </View>
      <Text style={styles.players} numberOfLines={2}>
        {names || 'Sem jogadores'}
      </Text>
      <Text style={styles.meta}>
        {match.questionCount} {match.questionCount === 1 ? 'pergunta' : 'perguntas'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  headerLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  code: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.textMuted },
  players: { fontSize: 15, color: COLORS.text, marginBottom: 4 },
  meta: { fontSize: 13, color: COLORS.textMuted },
});
```

- [ ] **Step 2: `PlayerSummaryHeader.tsx`**

Create `src/components/report/PlayerSummaryHeader.tsx`:

```tsx
import { COLORS } from '@/src/constants/colors';
import type { ReportPlayerSummary } from '@/src/domain/game/matchReport';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { players: ReportPlayerSummary[] };

export function PlayerSummaryHeader({ players }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Desempenho dos jogadores</Text>
      {players.map((p) => (
        <View key={p.playerId} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.stat}>
            {p.correctCount}/{p.totalQuestions} certas
          </Text>
          <Text style={styles.points}>{p.quizPoints} pts</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '600' },
  stat: { width: 110, fontSize: 14, color: COLORS.textMuted, textAlign: 'right' },
  points: { width: 70, fontSize: 14, color: COLORS.text, fontWeight: '700', textAlign: 'right' },
});
```

- [ ] **Step 3: `QuestionReportCard.tsx`**

Create `src/components/report/QuestionReportCard.tsx`:

```tsx
import { COLORS } from '@/src/constants/colors';
import type { ReportQuestion } from '@/src/domain/game/matchReport';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RESULT_LABEL, resultColor, tileColorHex } from './format';

type Props = { question: ReportQuestion; index: number };

export function QuestionReportCard({ question, index }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerLine}>
        <View style={[styles.colorChip, { backgroundColor: tileColorHex(question.tileColor) }]} />
        <Text style={styles.qNumber}>Pergunta {index + 1}</Text>
      </View>
      <Text style={styles.questionText}>{question.questionText}</Text>

      <View style={styles.correctBox}>
        <Text style={styles.correctLabel}>Resposta correta</Text>
        <Text style={styles.correctText}>{question.correctOptionText}</Text>
      </View>

      {question.explanation ? <Text style={styles.explanation}>{question.explanation}</Text> : null}

      <Text style={styles.answersTitle}>Respostas dos jogadores</Text>
      {question.answers.map((a) => (
        <View key={a.playerId} style={styles.answerRow}>
          <Text style={styles.answerName} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={styles.answerPick} numberOfLines={2}>
            {a.selectedOptionText ?? '—'}
          </Text>
          <Text style={[styles.answerResult, { color: resultColor(a.result) }]}>
            {RESULT_LABEL[a.result]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  headerLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  colorChip: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: COLORS.cardBorder, marginRight: 8 },
  qNumber: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  questionText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  correctBox: { backgroundColor: '#E9F7EF', borderRadius: 8, padding: 10, marginBottom: 8 },
  correctLabel: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginBottom: 2 },
  correctText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  explanation: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },
  answersTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 4, marginBottom: 6 },
  answerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#EEE' },
  answerName: { width: 90, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  answerPick: { flex: 1, fontSize: 14, color: COLORS.text, paddingHorizontal: 8 },
  answerResult: { width: 110, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/report/MatchListRow.tsx src/components/report/PlayerSummaryHeader.tsx src/components/report/QuestionReportCard.tsx
git commit -m "feat(report): list row, player summary, question card components"
```

---

## Task 8: List page (`/relatorio`)

**Files:**
- Create: `app/relatorio/index.tsx`

- [ ] **Step 1: Write the list screen**

Create `app/relatorio/index.tsx`:

```tsx
import { MatchListRow } from '@/src/components/report/MatchListRow';
import { COLORS } from '@/src/constants/colors';
import type { FinishedMatchListItem } from '@/src/domain/game/matchReport';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useQuery } from 'convex/react';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RelatorioListScreen() {
  // isConvexConfigured is a stable module constant, so this early return is
  // consistent across renders (no hooks-order violation).
  if (!isConvexConfigured) {
    return (
      <View testID="screen-relatorio-list" style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notice}>Backend não configurado.</Text>
      </View>
    );
  }
  return <RelatorioListContent />;
}

function RelatorioListContent() {
  const router = useRouter();
  const matches = useQuery(multiplayerApi.reports.listFinishedMatches, {}) as
    | FinishedMatchListItem[]
    | undefined;

  return (
    <View testID="screen-relatorio-list" style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Relatório de partidas</Text>
        <Text style={styles.subtitle}>Partidas finalizadas nas últimas 24 horas</Text>

        {matches === undefined ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : matches.length === 0 ? (
          <Text style={styles.empty}>Nenhuma partida finalizada ainda.</Text>
        ) : (
          matches.map((match) => (
            <MatchListRow
              key={match.matchId}
              match={match}
              onPress={() => router.push(`/relatorio/${match.matchId}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  loader: { marginTop: 40 },
  empty: { fontSize: 15, color: COLORS.textMuted, marginTop: 24, textAlign: 'center' },
  notice: { fontSize: 15, color: COLORS.textMuted },
});
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/relatorio/index.tsx
git commit -m "feat(report): /relatorio list page"
```

---

## Task 9: Detail page (`/relatorio/[matchId]`)

**Files:**
- Create: `app/relatorio/[matchId].tsx`

- [ ] **Step 1: Write the detail screen**

Create `app/relatorio/[matchId].tsx`:

```tsx
import { PlayerSummaryHeader } from '@/src/components/report/PlayerSummaryHeader';
import { QuestionReportCard } from '@/src/components/report/QuestionReportCard';
import { finishReasonLabel, formatMatchDate } from '@/src/components/report/format';
import { injectReportPrintStyles, printReport } from '@/src/components/report/printWeb';
import { COLORS } from '@/src/constants/colors';
import type { MatchReport } from '@/src/domain/game/matchReport';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RelatorioDetailScreen() {
  if (!isConvexConfigured) {
    return (
      <View testID="screen-relatorio-detail" style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notice}>Backend não configurado.</Text>
      </View>
    );
  }
  return <RelatorioDetailContent />;
}

function RelatorioDetailContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = params.matchId;
  const report = useQuery(multiplayerApi.reports.getMatchReport, { matchId }) as
    | MatchReport
    | null
    | undefined;

  useEffect(() => {
    if (Platform.OS === 'web') injectReportPrintStyles();
  }, []);

  return (
    <View testID="screen-relatorio-detail" style={styles.container} nativeID="relatorio-root">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push('/relatorio')} nativeID="relatorio-no-print">
          <Text style={styles.back}>← Voltar</Text>
        </Pressable>

        {report === undefined ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : report === null ? (
          <Text style={styles.empty}>Partida não encontrada ou expirada.</Text>
        ) : (
          <>
            <View style={styles.titleRow}>
              <View style={styles.titleCol}>
                <Text style={styles.title}>Sala {report.code}</Text>
                <Text style={styles.subtitle}>
                  {formatMatchDate(report.finishedAt)} · {finishReasonLabel(report.finishReason)}
                </Text>
              </View>
              {Platform.OS === 'web' ? (
                <Pressable onPress={printReport} style={styles.printBtn} nativeID="relatorio-no-print">
                  <Text style={styles.printBtnText}>Imprimir / PDF</Text>
                </Pressable>
              ) : null}
            </View>

            <PlayerSummaryHeader players={report.players} />

            {report.questions.length === 0 ? (
              <Text style={styles.empty}>Esta partida não teve perguntas respondidas.</Text>
            ) : (
              report.questions.map((q, i) => (
                <QuestionReportCard key={`${q.questionId}-${i}`} question={q} index={i} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  back: { fontSize: 15, color: COLORS.info, fontWeight: '700', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  titleCol: { flex: 1, paddingRight: 12 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  printBtn: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  printBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  loader: { marginTop: 40 },
  empty: { fontSize: 15, color: COLORS.textMuted, marginTop: 24, textAlign: 'center' },
  notice: { fontSize: 15, color: COLORS.textMuted },
});
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/relatorio/[matchId].tsx
git commit -m "feat(report): /relatorio/[matchId] detail page with print"
```

---

## Task 10: Register routes

**Files:**
- Modify: `app/_layout.tsx:37-41`

- [ ] **Step 1: Add the route screens**

In `app/_layout.tsx`, inside `<Stack>`, add the two routes after the `explore` screen (line 39):

```tsx
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="relatorio/index" options={{ headerShown: false }} />
        <Stack.Screen name="relatorio/[matchId]" options={{ headerShown: false }} />
        <Stack.Screen name="launch-button" options={{ headerShown: false }} />
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(report): register /relatorio routes"
```

---

## Task 11: Web smoke test

**Files:**
- Modify: `e2e/web-smoke.spec.ts`

- [ ] **Step 1: Add the smoke test**

Append to `e2e/web-smoke.spec.ts`:

```ts
test('relatorio page renders', async ({ page }) => {
  await page.goto('/relatorio');
  await expect(page.getByTestId('screen-relatorio-list')).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke test**

Run: `bun run test:web-smoke -- --grep "relatorio"`
Expected: PASS (the screen root is visible whether or not Convex is configured — both branches render `testID="screen-relatorio-list"`).
If Playwright browsers aren't installed: `bunx playwright install chromium` first.

- [ ] **Step 3: Commit**

```bash
git add e2e/web-smoke.spec.ts
git commit -m "test(report): web smoke for /relatorio"
```

---

## Task 12: Full verification

- [ ] **Step 1: Typecheck + lint + unit tests**

Run: `bun run typecheck && bun run lint && bun run test`
Expected: all PASS.

- [ ] **Step 2: Manual end-to-end (documented, run if a Convex dev deployment is available)**

1. `bunx convex dev` in one terminal, `bun run web` in another.
2. Create a multiplayer room, join with a 2nd client, play to finish (reach the end or have a player leave) so at least one quiz question is answered.
3. Open `/relatorio` → the match appears with player names, date, question count.
4. Click it → questions show in order, each player's pick, the correct answer + explanation, per-player accuracy.
5. On web, click **Imprimir / PDF** → browser print dialog shows the full report (no clipping, button hidden).

- [ ] **Step 3: Final commit (if any docs/cleanup remain)**

```bash
git add -A
git commit -m "chore(report): finalize match reports feature" || echo "nothing to commit"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** retention (T2 field, T4 cron) ✓; finished-only-with-quiz list (T5 filter) ✓; list with names (T5 summary, T8) ✓; full report questions+picks+correct (T1 assemble, T5, T7, T9) ✓; public access (no auth task — by design) ✓; Print/PDF (T6 printWeb, T9 button) ✓; pt-BR (T6 labels, T8/T9 copy) ✓; data-only page / no 3D (separate route) ✓; testing (T1 unit, T11 smoke) ✓.
- **Placeholder scan:** none — every code step has complete code.
- **Type consistency:** `FinishedMatchListItem`, `MatchReport`, `ReportQuestion`, `ReportPlayerSummary`, `QuizResultValue` defined in T1 and imported identically in T5/T6/T7/T8/T9. `markRoomFinished` returns `{finishedAt, resolvedQuizCount, reportSummary}` matching the T2 schema fields. Query names (`listFinishedMatches`, `getMatchReport`) consistent across T5/T8/T9.
```
