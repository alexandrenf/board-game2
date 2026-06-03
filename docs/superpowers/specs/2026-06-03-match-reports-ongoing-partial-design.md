# Match Reports — Ongoing Matches & Partial Results — Design (Addendum)

**Date:** 2026-06-03
**Status:** Approved (design), pending implementation
**Branch:** `feature/match-reports-relatorio` (extends PR #35)
**Base spec:** `2026-06-03-match-reports-relatorio-design.md`

## Goal

Extend `/relatorio` so it also covers matches that are **still in progress**, and
fix a gap where some legitimately-finished matches never showed up.

1. **Every finished match counts** — including matches that end because a player
   leaves / goes inactive and the remaining player is declared the winner.
2. **Ongoing matches appear** in the list once they have ≥1 answered question.
3. **Partial reports**: an ongoing match's report shows the questions answered so far.

## Problem found (part of this work)

The original feature stamped `reportSummary` / `finishedAt` at only 3 of the ~6
places a room transitions to `status: 'finished'`. The uncovered paths are:

- `advanceSkippedRoll` (watchdog/recovery) — `finished_solo` (`only_one_player`,
  a real declared-winner finish), `finished_no_players`, and a defensive `!nextTurn`.
- A defensive fallback branch in `leaveRoom`.

Consequences for matches finished via these paths:
- **Missing from the list** — the list filters on `reportSummary != null`.
- **Deleted too early** — `cleanupInactiveRooms` keys 24h retention off
  `finishedAt`; with no `finishedAt`, `isFinishedMatchExpired(undefined)` is `true`,
  so the match is deleted at the 12h-inactive mark instead of being kept 24h.

Fix: stamp via `markRoomFinished` at **all** finish sites.

## Decisions (confirmed with user)

- **Ongoing visibility:** an ongoing match appears once it has **≥1 resolved quiz
  round** (consistent with the finished-match rule). Lobbies and just-started
  matches with nothing answered stay hidden.
- **Layout:** a **single merged list**, recency-ordered, with a per-row status
  badge — 🔴 **Ao vivo** (ongoing) vs **Finalizada** (finished).
- **Answer-leak safety:** reports include **only resolved rounds**. The in-flight
  `active` round is excluded, so a player browsing `/relatorio` mid-match cannot
  see the current question's correct answer.

## Architecture

### Backend

**Finish coverage (`convex/rooms.ts`).** Add `markRoomFinished` (already exists)
to the uncovered finish sites:
- `advanceSkippedRoll`: spread its result into the three `ctx.db.patch(room._id, …)`
  finish calls (`finished_no_players` → `no_active_players`; `finished_solo` →
  `only_one_player` with winner; defensive `!nextTurn` → `no_active_players`).
- `leaveRoom` defensive fallback: `Object.assign(roomPatch, await markRoomFinished(…))`.

No gameplay logic changes — only the persisted report/retention fields are added.

**List query (`convex/reports.ts`).** Rename `listFinishedMatches` →
`listRecentMatches`. It returns finished **and** ongoing matches:
- Finished: fast path from stored `reportSummary` (zero joins), `resolvedQuizCount > 0`.
- Ongoing (`status: 'playing'`): query via the existing `by_status_phase_deadline`
  index (`eq('status','playing')`, capped), live-compute each — players + resolved
  round count via `buildReportSummary` (no winner yet) — include only if ≥1 resolved.
- Merge, attach `status` + a `timestamp` (`finishedAt` for finished, `lastActiveAt`
  for ongoing), sort by `timestamp` desc, take `limit`.

Reactive by default → the list updates live as matches progress.

**Report query (`convex/reports.ts`).** `getMatchReport` accepts `playing` and
`finished` (rejects lobby / missing → `null`). Already filters to resolved rounds
(partial + leak-safe). Adds `status: 'finished' | 'ongoing'` to the result;
`finishReason` becomes optional (none while ongoing).

### Pure module (`src/domain/game/matchReport.ts`)

- `MatchListItem` (rename of `FinishedMatchListItem`): add `status: 'finished' |
  'ongoing'` and `timestamp: number` (replaces `finishedAt`).
- `MatchReport`: add `status: 'finished' | 'ongoing'`; `finishReason?: string`.
- `assembleMatchReport`: accept + pass through `status`; `finishReason` optional.

### Frontend

- `MatchListRow`: status badge (Ao vivo / Finalizada) + adaptive timestamp label.
- `app/relatorio/index.tsx`: use `listRecentMatches`; single merged list (unchanged
  structure — one `.map`); heading/subtitle copy reflects ongoing + finished.
- `app/relatorio/[matchId].tsx`: "Em andamento — resultados parciais" banner when
  `report.status === 'ongoing'`; reactive query already auto-updates.

## Testing

- **Unit (jest-expo)** — extend `matchReport.test.ts`: `assembleMatchReport`
  passes `status` through and tolerates absent `finishReason`; `buildReportSummary`
  with `finishReason: 'in_progress'` and no winner yields standings (already covered
  by the no-winner case).
- **Finish-coverage** — verified by typecheck + the existing `convex dev --once` +
  `convex run` check (no Convex unit harness in repo).
- **Web smoke** — `/relatorio` still renders (unchanged).

## Out of scope (YAGNI)

- Showing ongoing matches with 0 answered questions.
- Revealing the in-flight question before it resolves.
- Separate live-section layout (chose merged list with badges).
- Any auth/visibility change (still fully public).
