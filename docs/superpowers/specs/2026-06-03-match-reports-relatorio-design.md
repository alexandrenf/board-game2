# Match Reports — `/relatorio` — Design

**Date:** 2026-06-03
**Status:** Approved (design), pending implementation
**Branch:** `feature/match-reports-relatorio`

## Goal

Let our teaching workgroup review what happened in recently-finished multiplayer
matches, so they know what content to focus on teaching. At
`jogo.juventude.pro/relatorio`:

1. See the most recent **finished** matches, each with its player names.
2. Open any match to see a **full report**: every quiz question that was asked,
   what **each player selected**, and the **correct answer** (plus explanation).
3. Finished matches stay available for **24 hours** after they end, then are
   cleaned up.

## Key insight

No gameplay changes are required. The data already exists and is persisted:

- `rooms.status === 'finished'` marks a finished match.
- `roomPlayers` holds each player's `name` and `quizPoints`.
- `roomQuizRounds` holds every question shown: `questionText`, `options`,
  `correctOptionId`, `explanation`, `tileColor`, `tileIndex`, `turnNumber`,
  `status` (`resolved` once answered), `startedAt`.
- `roomQuizAnswers` holds, **per player per question**: `selectedOptionId`,
  `result` (`correct` | `incorrect` | `timeout`), `pointsAwarded`,
  `timeElapsedMs` (indexed `by_round` and `by_round_player`).

So the work is: (1) retain finished matches 24h, (2) add two read-only queries,
(3) build the `/relatorio` UI.

## Decisions (confirmed with user)

- **Access:** Fully public. No password/auth gate. Matches the app's existing
  no-login design.
- **Export:** Print / PDF only (browser print). No CSV, no copy-to-text.
- **List scope:** Only finished matches that had **≥1 resolved quiz round**
  (`resolvedQuizCount > 0`). Abandoned/empty rooms are hidden.
- **Retention:** 24h measured from when the match finished (`finishedAt`).
- **Language:** All UI text in Brazilian Portuguese.

## Architecture

Chosen approach: **read from the existing live tables + add 24h retention.**
Rejected alternatives: a snapshot table (duplicates data, adds assembly logic in
the hot, heavily-guarded finish path) and a zero-schema on-demand scan (fragile —
`lastActiveAt` is not the finish time, so ordering and retention would be wrong).

### Component boundaries

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `src/domain/game/matchReport.ts` (new, pure) | Assemble the report view-model from plain rows (rounds + answers + players). Build the per-match `reportSummary`. Decide retention (`isFinishedMatchExpired`). | nothing (pure data in → data out) |
| `convex/reports.ts` (new) | Two queries (`listFinishedMatches`, `getMatchReport`). Thin adapters: read rows, delegate shaping to `matchReport.ts`. | `matchReport.ts`, generated server |
| `convex/rooms.ts` (edit) | `markRoomFinished` helper stamps `finishedAt` + `resolvedQuizCount` + `reportSummary` at the 3 finish sites. Cleanup branches on status for 24h retention. | `matchReport.ts` for summary build |
| `convex/schema.ts` (edit) | New `rooms` fields + `by_status_finishedAt` index. | — |
| `app/relatorio/index.tsx` (new) | List page (route `/relatorio`). | `useQuery(listFinishedMatches)` |
| `app/relatorio/[matchId].tsx` (new) | Detail/report page + print button. | `useQuery(getMatchReport)` |
| `src/components/report/*` (new) | Presentational pieces (`MatchListRow`, `MatchReportView`, `QuestionReportCard`, `PlayerSummaryHeader`). | design tokens only |

Putting the data-shaping logic in a **pure module** keeps it unit-testable with
the repo's existing jest-expo setup (there is no Convex test harness; pure
domain logic in `src/domain/game/__tests__` is the established pattern).

## Data model changes (`convex/schema.ts`)

Add to the `rooms` table:

```ts
finishedAt: v.optional(v.number()),          // ms epoch when status became 'finished'
resolvedQuizCount: v.optional(v.number()),   // # of resolved quiz rounds at finish
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

Add index: `.index('by_status_finishedAt', ['status', 'finishedAt'])` — lets the
list query fetch `status === 'finished'` ordered by `finishedAt` desc with no
table scan and no joins.

All fields optional → existing documents validate without migration. Matches
that finished **before** this ships lack `finishedAt`/`reportSummary` and so do
not appear in the list; they are cleaned up under the existing rule. No backfill.

## Finish path (`convex/rooms.ts`)

Add a self-contained helper:

```ts
const markRoomFinished = async (
  ctx: MutationCtx,
  roomId: RoomId,
  opts: { winnerPlayerId?: PlayerId; finishReason: string; now: number }
): Promise<{ finishedAt: number; resolvedQuizCount: number; reportSummary: ... }>
```

It reads all players (`getRoomPlayers`, including `left` participants), counts
`roomQuizRounds` with `status === 'resolved'`, builds `reportSummary` via the
pure `buildReportSummary` in `matchReport.ts`, and returns the three new fields.

Refactor the **3 existing places** a room becomes finished to merge these fields
into their `roomPatch`:

1. `finalizeTurnOperationCore` — `operation.gameFinished || normalizedTurnOrder.length <= 1` branch (~L843).
2. `finalizeTurnOperationCore` — `!nextTurn` branch (~L867).
3. `leaveRoom` — `nextTurnOrder.length <= 1` branch (~L2778).

No gameplay logic changes — the existing `game_finished` event (with `rankings`)
is untouched; we only add the persisted summary fields used by the report.

## Retention (`convex/rooms.ts` → `cleanupInactiveRooms`)

Add `const FINISHED_REPORT_RETENTION_MS = 24 * 60 * 60 * 1000;`

Inside the existing per-room loop (which scans `by_last_active_at < 12h cutoff`),
branch **before** the presence-probe logic:

```ts
if (room.status === 'finished') {
  const expired =
    room.finishedAt == null /* legacy: no finish stamp */
      ? true
      : now - room.finishedAt > FINISHED_REPORT_RETENTION_MS;
  if (expired) {
    await removeRoomData(ctx, room._id);
    deletedCount += 1;
  } else {
    // Retained: bump lastActiveAt so it leaves the <cutoff window and the
    // loop makes progress; it reappears ~12h later and is deleted once 24h old.
    await ctx.db.patch(room._id, { lastActiveAt: now, updatedAt: now });
  }
  continue;
}
// ...existing lobby/playing presence-probe logic unchanged...
```

This keeps a single cleanup pass, reuses the existing index, and guarantees a
finished match is retained **at least 24h** (deleted within ~24–36h depending on
cron timing — the cron runs every 12h, unchanged). Legacy finished rooms without
`finishedAt` keep the old behavior.

## Read queries (`convex/reports.ts`)

### `listFinishedMatches({ limit?: number })` (default 50, max 100)

- Query `rooms.by_status_finishedAt` where `status === 'finished'`, `order('desc')`.
- Skip rooms where `reportSummary == null` or `resolvedQuizCount` falsy/0.
- Take `limit`.
- Return: `[{ matchId, code, finishedAt, questionCount, players: [{ name, quizPoints, isWinner }], finishReason }]`.
- Pure index scan, **zero joins** (everything comes from `reportSummary`).

### `getMatchReport({ matchId })`

- Get room; if missing or not finished → return `null` (page shows "expired/not found").
- Read `roomPlayers by_room` → `playerId → { name, status }` map.
- Read `roomQuizRounds by_room`, keep `status === 'resolved'`, sort chronologically
  (`turnNumber` then `startedAt`).
- For each round, read `roomQuizAnswers by_round`.
- Delegate to pure `assembleMatchReport(...)`, returning:

```ts
{
  matchId, code, finishedAt, finishReason,
  players: [{ playerId, name, quizPoints, correctCount, answeredCount, totalQuestions }],
  questions: [{
    questionId, questionText, tileColor, options: [{ id, text }],
    correctOptionId, correctOptionText, explanation,
    answers: [{ playerId, name, selectedOptionId, selectedOptionText | null, result }],
  }],
}
```

Players who left mid-match still appear (their name comes from `roomPlayers`).
A player with no answer row for a round, or `result === 'timeout'`, renders as
"Não respondeu / tempo esgotado".

## Frontend (`/relatorio`)

Nested Expo Router routes (clean, shareable, printable per-match URLs):

- `app/relatorio/index.tsx` → `/relatorio`: list of recent finished matches.
  Each row: finish date/time (pt-BR), player names, winner highlighted, score,
  question count. Tapping a row navigates to the detail route.
- `app/relatorio/[matchId].tsx` → `/relatorio/<id>`: full report.
  - `PlayerSummaryHeader`: per-player name, points, accuracy (correct/total).
  - `QuestionReportCard` per question: color chip (`TILE_COLORS`), question text,
    options with the correct one marked, explanation, and a row per player showing
    their pick color-coded correct (green) / incorrect (red) / timeout (grey).
  - **"Imprimir / PDF"** button: web only (`Platform.OS === 'web'` →
    `window.print()`), with print-friendly styles (hide nav chrome, expand cards).
    No new dependency (no `expo-print`).

Register both routes in `app/_layout.tsx` (`relatorio/index`, `relatorio/[matchId]`).
Reuse `COLORS` / `TILE_COLORS` design tokens and the neobrutalism look
(`#EBE6E0` bg, black borders/shadows). The page is data-only — it does **not**
mount the 3D game engine, so it stays lightweight.

States to handle on both pages: loading, empty
("Nenhuma partida finalizada ainda."), and (detail) not-found/expired.

## Error handling & edge cases

- Convex not configured (`convexClient == null`): show a friendly notice instead
  of crashing (queries are skipped).
- Invalid/expired `matchId`: query returns `null` → "Partida não encontrada ou
  expirada."
- Left players: included in report from `roomPlayers`.
- Unanswered / timed-out questions: shown explicitly as not answered.
- Matches with 0 resolved quiz rounds: excluded from the list by design.

## Testing

- **Unit (jest-expo)** — `src/domain/game/__tests__/matchReport.test.ts`:
  - `assembleMatchReport`: correct/incorrect/timeout mapping; option-id → text
    resolution; per-player accuracy; chronological question order; left/absent
    players; missing answer rows.
  - `buildReportSummary`: winner flag, points sort, question count.
  - `isFinishedMatchExpired`: boundary at 24h; legacy `finishedAt == null` ⇒ expired.
- **Web smoke (Playwright)** — extend `e2e/web-smoke.spec.ts` (or add one): load
  `/relatorio`, assert the page renders (heading + empty-state or list).
- **Manual:** play a short multiplayer match to finish, confirm it appears at
  `/relatorio` and the report shows questions + each player's pick + right answer;
  confirm Print produces a clean PDF.

Built test-first (write failing unit tests for `matchReport.ts` before the impl),
per the repo's TDD practice.

## Out of scope (YAGNI)

- Auth / password gating (chose fully public).
- CSV / clipboard export (chose Print/PDF only).
- In-app navigation link to `/relatorio` (workgroup types the URL; can add later).
- Cross-match analytics/aggregation (per-match reports only).
- Retaining or reporting on non-finished (abandoned) matches.
