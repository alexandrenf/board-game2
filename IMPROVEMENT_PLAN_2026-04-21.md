# Improvement Plan — 2026-04-21

**Based on:** AUDIT_REPORT_2026-04-21.md  
**Priority order:** Critical → Moderate → Minor → Enhancements  
**Target branch:** master

---

## FIX-01 — Persist `quizAnswer` in solo mode  
**Priority:** CRITICAL  
**References:** BUG-01  
**Files:** `src/game/state/gameState.ts`

### Problem
`saveProgress` does not persist `quizAnswer`. On app restart from a `'feedback'` quiz phase, the UI incorrectly shows "Incorreto" regardless of the player's actual answer.

### Fix

**Step 1 — Add `quizAnswer` to `saveProgress`:**

```ts
// src/game/state/gameState.ts — saveProgress()
const progress = {
  playerIndex: state.playerIndex,
  targetIndex: state.targetIndex,
  focusTileIndex: state.focusTileIndex,
  lastMessage: state.lastMessage,
  updatedAt: new Date().toISOString(),
  pendingEffect: state.pendingEffect,
  quizPhase: state.quizPhase,
  usedQuestionIds: state.usedQuestionIds,
  quizPoints: state.quizPoints,
  currentQuiz: state.currentQuiz,
  quizAnswer: state.quizAnswer,   // ← ADD THIS
};
```

**Step 2 — Restore `quizAnswer` in `hydrateFromPersistence`:**

```ts
// In the savedProgress hydration block:
if (savedProgress.quizAnswer !== undefined) {
  nextState.quizAnswer = savedProgress.quizAnswer;
}
```

**Step 3 — Extend the cast type:**

```ts
const savedProgress = savedProgressRaw as (typeof savedProgressRaw & {
  pendingEffect?: TileEffect | null;
  quizPhase?: QuizPhase;
  usedQuestionIds?: string[];
  quizPoints?: number;
  currentQuiz?: { question: QuizQuestion; startedAt: number; tileColor: string } | null;
  quizAnswer?: { selectedOptionId: string | null; result: QuizResult } | null;  // ← ADD
});
```

**Step 4 — Handle edge case: `quizPhase === 'feedback'` without `quizAnswer`**

Add a guard in `hydrateFromPersistence`: if the restored phase is `'feedback'` but `quizAnswer` is null (data from before this fix), reset to `'idle'` to avoid a broken state:

```ts
if (nextState.quizPhase === 'feedback' && !nextState.quizAnswer) {
  nextState.quizPhase = 'idle';
  nextState.currentQuiz = null;
}
```

---

## FIX-02 — Emit `quiz_cancelled` event from `leaveRoom`  
**Priority:** CRITICAL  
**References:** BUG-02, BUG-10  
**Files:** `convex/rooms.ts`

### Problem
When a player leaves mid-quiz, the round is marked `cancelled` in the DB but no event is broadcast. The event processor handler for `quiz_cancelled` in the client is dead code. Other players' quiz UI clears only when the snapshot syncs.

### Fix

In `convex/rooms.ts`, inside the `leaveRoom` mutation, after cancelling the quiz round, add a `quiz_cancelled` event to the existing `insertRoomEvents` call:

```ts
// Find the block that patches activeQuizRound._id to 'cancelled'
if (activeQuizRound?.status === 'active') {
  await ctx.db.patch(activeQuizRound._id, {
    status: 'cancelled',
    resolvedAt: now,
  });

  // ADD: emit event so clients clear the modal immediately
  await insertRoomEvents(ctx, room._id, roomPatch.nextEventSequence ?? room.nextEventSequence, now, [
    {
      type: 'quiz_cancelled',
      actorPlayerId: player._id,
      turnId: room.currentTurnId ?? '',
      turnNumber: room.turnNumber,
      phase: 'awaiting_roll',
      payload: {
        roundId: activeQuizRound._id,
        reason: 'player_left',
      },
    },
  ]);
}
```

Ensure `roomPatch.nextEventSequence` is updated after this insertion (same pattern as other event insertions in `leaveRoom`).

---

## FIX-03 — Allow quiz feedback dismissal when `latestResolvedTurn` is absent  
**Priority:** MODERATE  
**References:** BUG-03  
**Files:** `src/components/game/MultiplayerOverlay.tsx`

### Problem
`handleDismissQuizFeedback` calls `handleDismissResolvedTurn()` which returns `false` if `latestResolvedTurn` is null, causing the player to be permanently stuck on the feedback screen.

### Fix

Separate quiz dismissal from turn acknowledgement. The turn ACK must happen, but the local quiz UI can be cleared optimistically:

```ts
const handleDismissQuizFeedback = useCallback(async () => {
  // Always clear quiz UI immediately — don't wait for ACK
  dismissQuizFeedback();

  // Then attempt turn acknowledgement
  await handleDismissResolvedTurn();
}, [handleDismissResolvedTurn, dismissQuizFeedback]);
```

**Why this is safe:** The quiz modal's visibility is driven by `currentQuizRound` and `quizResolvedData` (runtime store), not by `latestResolvedTurn`. Clearing the quiz state locally does not affect the ACK flow. If the ACK fails, the HUD will still show the turn pending state (via `latestResolvedTurn`) and the player can retry.

---

## FIX-04 — Remove `assets/questions.json` (stale file)  
**Priority:** MODERATE  
**References:** BUG-05  
**Files:** `assets/questions.json`

### Problem
This 24-question file is in a deprecated format (`themeId: 'tema-1'`) and is not imported anywhere. It was added in the initial commit and superseded by `src/content/quizQuestions.ts` in the refactor commit.

### Fix

Delete the file:
```
git rm assets/questions.json
```

If it is needed as a historical reference, move it to `textos/` (where other reference documents live) and add a comment at the top explaining it is unused.

---

## FIX-05 — Clarify yellow theme question status  
**Priority:** MODERATE  
**References:** BUG-04  
**Files:** `src/content/quizQuestions.ts`, `src/content/quizQuestionAdapter.ts`

### Problem
12 yellow-theme questions are fully written, cited, and tested, but `isQuizEligibleTile` excludes yellow tiles — making them permanently unreachable.

### Option A — Activate yellow tiles for quizzes (recommended if there is content)
Add `'yellow'` to `QUIZ_TILE_COLORS` in `gameState.ts` and to the `isQuizEligibleTile` color check in `convex/quiz.ts`. Add effect behavior for yellow tiles in `quizEffectResolver.ts` (e.g., `default` case currently returns `stay` — which is acceptable). Update `effectLabel` in `constants.ts` for yellow.

### Option B — Remove yellow questions until yellow tiles are planned
Remove `...QUIZ_QUESTION_BANK.yellow` from the `QUIZ_QUESTIONS` array and remove the yellow theme from the `it.each(themes)` test. Add a code comment in `quizQuestions.ts` marking yellow as "reserved for future use."

**Choose Option A** if yellow tiles are part of the current game design. Choose Option B to reduce dead code. Either way, the current state (questions written but unreachable) should not remain.

---

## FIX-06 — Fix `myAnswer.playerId` type inconsistency  
**Priority:** MINOR  
**References:** BUG-06  
**Files:** `src/services/multiplayer/runtimeStore.ts`

### Fix

Make `playerId` optional in `MultiplayerQuizAnswer`:

```ts
type MultiplayerQuizAnswer = {
  playerId?: string;   // optional — not present in server snapshot's myAnswer
  selectedOptionId: string | null;
  result: QuizResult;
  pointsAwarded: number;
  answeredAt?: number;
  timeElapsedMs?: number;
};
```

Alternatively, add `playerId` to the server's `myAnswer` response in `getRoomState`:

```ts
myAnswer: myQuizAnswer
  ? {
      playerId: myPlayer._id,   // ← ADD
      selectedOptionId: ...,
      ...
    }
  : null,
```

The second approach is preferred because it makes the snapshot fully self-describing.

---

## FIX-07 — Show quiz points in solo mode  
**Priority:** MINOR  
**References:** BUG-08  
**Files:** `src/components/game/GameOverlay.tsx`

### Problem
`quizPoints` is tracked in solo state but never displayed to the player.

### Fix

Pass a single-element `scoreboardPlayers` array to `GamePlayingHUD`:

```ts
// In GameOverlay.tsx
const scoreboardPlayers = useMemo(
  () => quizPoints > 0
    ? [{ id: 'solo', name: playerName || 'Você', points: quizPoints, isMe: true }]
    : [],
  [playerName, quizPoints]
);

// In the JSX:
<GamePlayingHUD
  ...
  scoreboardPlayers={scoreboardPlayers}
  ...
/>
```

This shows the score pill only after the first correct answer, avoiding clutter at game start.

---

## FIX-08 — Restore educational modal after solo quiz  
**Priority:** MINOR  
**References:** BUG-09  
**Files:** `src/game/state/gameState.ts`

### Problem
After dismissing quiz feedback in solo mode, the standalone educational modal is never shown. The quiz modal's feedback panel already displays tile content, so this is partially mitigated — but the dedicated educational modal provides a larger, more focused reading experience.

### Decision Required
Two valid approaches:

**Option A — Always show educational modal after quiz (recommended)**  
In `dismissQuizFeedback`, after setting `quizPhase: 'idle'`, trigger the educational modal:
```ts
set({
  quizPhase: 'idle',
  currentQuiz: null,
  quizAnswer: null,
  // DON'T clear currentTileContent and showEducationalModal here
  showEducationalModal: true,            // ← re-enable after quiz
  educationalModalDelayMs: 200,          // short delay for animation
});
```

**Option B — Keep current behavior, enrich quiz feedback panel**  
Accept that the quiz modal is the educational experience and ensure the educational text in the feedback panel is large and readable. No code change needed.

---

## FIX-09 — Add `quizSelector` unit tests  
**Priority:** MINOR  
**Files:** `src/domain/game/__tests__/quizSelector.test.ts` (new file)

### Why
`quizSelector.ts` has no tests. It is used in both solo and multiplayer modes to pick questions. Edge cases (empty bank, all questions used, themeId not found) should be tested.

### Tests to add

```ts
describe('quizSelector', () => {
  const bank: QuizQuestion[] = [
    { id: 'q1', themeId: 'green', ... },
    { id: 'q2', themeId: 'green', ... },
    { id: 'q3', themeId: 'red', ...   },
  ];

  it('returns a question matching the themeId', () => {
    const q = selectQuestion('green', [], bank);
    expect(q?.themeId).toBe('green');
  });

  it('avoids already-used question IDs', () => {
    const q = selectQuestion('green', ['q1'], bank);
    expect(q?.id).toBe('q2');
  });

  it('falls back to any theme question when all are used', () => {
    const q = selectQuestion('green', ['q1', 'q2'], bank);
    expect(q?.themeId).toBe('green'); // fallback still respects theme
  });

  it('returns null when no questions exist for the theme', () => {
    expect(selectQuestion('blue', [], bank)).toBeNull();
  });

  it('returns null on empty bank', () => {
    expect(selectQuestion('green', [], [])).toBeNull();
  });
});
```

---

## FIX-10 — Convert `usedQuestionIds` to a `Set` in `quizSelector`  
**Priority:** MINOR (Performance)  
**Files:** `src/domain/game/quizSelector.ts`

### Fix

```ts
export function selectQuestion(
  themeId: string,
  usedQuestionIds: string[],
  questionBank: QuizQuestion[]
): QuizQuestion | null {
  const usedSet = new Set(usedQuestionIds);   // ← convert once, O(n)
  const candidates = questionBank.filter(
    (q) => q.themeId === themeId && !usedSet.has(q.id)   // ← O(1) per check
  );
  ...
}
```

This changes the overall filter from O(n×m) to O(n+m).

---

## FIX-11 — Remove duplicate `RoomQuizAnswer`/`RoomQuizRound` types  
**Priority:** MINOR (Maintainability)  
**Files:** `src/components/game/MultiplayerOverlay.tsx`, `src/services/multiplayer/runtimeStore.ts`

### Problem
`MultiplayerOverlay.tsx` defines `RoomQuizAnswer` and `RoomQuizRound` locally. `runtimeStore.ts` defines `MultiplayerQuizAnswer` and `MultiplayerQuizRound` for the same data. Two separate type definitions for the same shape create divergence risk.

### Fix
Export the types from `runtimeStore.ts` and import them in `MultiplayerOverlay.tsx`:

```ts
// runtimeStore.ts — add exports
export type { MultiplayerQuizAnswer, MultiplayerQuizRound };

// MultiplayerOverlay.tsx — remove local types, import shared ones
import type { MultiplayerQuizAnswer as RoomQuizAnswer } from '@/src/services/multiplayer/runtimeStore';
```

---

## FIX-12 — Harden multiplayer quiz feedback for missing `script` in `quiz_resolved`  
**Priority:** MODERATE  
**Files:** `src/services/multiplayer/runtimeStore.ts`, `src/components/game/MultiplayerOverlay.tsx`

### Problem
If the `quiz_resolved` event payload contains a malformed `script`, `parseTurnScript` returns `null`. `applyQuizResolved` sets `latestResolvedTurn: null ?? state.latestResolvedTurn`. In a fresh session this is `undefined`, causing `handleDismissQuizFeedback` to stall (see FIX-03). This is a separate hardening beyond FIX-03.

### Fix in `applyQuizResolved`
When `script` is null (event did not include it or it is malformed), synthesize a minimal turn script from the current state to allow the dismiss flow to proceed:

```ts
// After parsing script from payload:
const effectiveScript = script ?? (get().latestResolvedTurn) ?? null;
// Use effectiveScript for latestResolvedTurn assignment
```

This avoids regressing to `undefined` even when the event payload is incomplete.

---

## Content Recommendations (Non-code)

### CR-01 — Medical / Public Health Review  
**Priority:** HIGH before production

All 48 questions should be reviewed by a qualified HIV/AIDS public health specialist or infectious disease clinician before the game is used by real students. Specific areas to validate:
- Transmission risk quantification in red tile questions
- PrEP / PEP efficacy claims
- Statements about undetectable = untransmittable (U=U)
- Condom effectiveness percentages
- Vertical transmission prevention claims

### CR-02 — Add source links to UI  
**Priority:** LOW

`QUIZ_SOURCES` in `quizQuestions.ts` includes full URLs to Ministério da Saúde, CDC, WHO, and PAHO. These are not surfaced to the player anywhere. Consider showing a "Saiba mais" (Learn more) link in the quiz feedback panel pointing to the relevant source for each question. This deepens learning and cites credible authorities.

### CR-03 — Accessibility of accented characters  
**Priority:** LOW

Several UI strings use Portuguese with accented characters but display with a font that may not support them consistently on all Android devices. Audit `QuizModal.tsx` strings (e.g., "Explicacao", "Conteudo educativo") and restore proper accents where stripped.

### CR-04 — Review `textos/` content alignment with question bank  
The `textos/TEXTOS PARA O JOGO.txt` and `textos/textos-jogo-temas.json` files contain educational content. Verify that the educational text on each tile (`board.json` → `tile.text`) is consistent with the quiz questions assigned to that tile's theme. A red tile whose text discusses one topic should not have a quiz question about a different topic.

---

## Implementation Priority Order

| # | Fix | Priority | Effort | Risk |
|---|---|---|---|---|
| 1 | FIX-01 — Persist `quizAnswer` | Critical | Low | Low |
| 2 | FIX-03 — Feedback dismiss hardening | Moderate | Low | Low |
| 3 | FIX-02 — Emit `quiz_cancelled` event | Critical | Low | Medium |
| 4 | FIX-04 — Remove stale `questions.json` | Moderate | Trivial | None |
| 5 | FIX-05 — Clarify yellow questions | Moderate | Low | Low |
| 6 | FIX-12 — Harden missing script in quiz_resolved | Moderate | Low | Low |
| 7 | FIX-07 — Solo scoreboard display | Minor | Low | None |
| 8 | FIX-09 — `quizSelector` tests | Minor | Low | None |
| 9 | FIX-08 — Educational modal after quiz | Minor | Low | Low |
| 10 | FIX-06 — `playerId` type fix | Minor | Trivial | None |
| 11 | FIX-10 — `Set` for usedQuestionIds | Minor | Trivial | None |
| 12 | FIX-11 — Deduplicate quiz types | Minor | Low | None |
| 13 | CR-01 — Medical review | HIGH | External | N/A |
| 14 | CR-02 — Source links in UI | Low | Medium | None |
| 15 | CR-03 — Accented chars audit | Low | Low | None |
| 16 | CR-04 — Text/question alignment | Medium | Medium | None |
