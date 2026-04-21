# Audit Report — 2026-04-21

**Project:** board-game2 — HIV Prevention Educational Board Game  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Date:** 2026-04-21  
**Branch audited:** master (HEAD at `c2b0345`)  
**Commits covered:** `60e047e` → `c2b0345` (11 commits / 4 merged PRs)

---

## 1. Overview of Changes

Today's work introduced a complete **Quiz Mode** feature — the largest single-day change in the project's history. The feature adds interactive multiple-choice questions triggered when a player lands on a colored tile (green, red, or blue), with quiz results affecting the player's position on the board. The system works in both solo and multiplayer modes.

### Commits Chronology

| Time (BRT) | SHA | Description |
|---|---|---|
| 09:56 | `60e047e` | Quiz mode was added (initial implementation) |
| 10:18 | `3d48d38` | QuizModal.tsx update |
| 10:18 | `5f75488` | constants.ts update (tile effect labels) |
| 10:24 | `01827e8` | Fix: quiz selector fallback, modal animation reset, explanation exposure |
| 10:25 | `618dfaf` | Fix: quiz state leaks, stale data, accessibility, title duplication |
| 10:28 | `c9034ba` | Merge PR #13 (quiz bugfixes) |
| 10:30 | `151bd04` | Merge PR #14 (quiz round bugfixes) |
| 11:20 | `6001676` | Feat: enhance quiz functionality and accessibility |
| 11:20 | `8d5e074` | Merge PR #12 |
| 11:33 | `c2bfe46` | Feat: refactor quiz question handling and improve data structure |
| 11:36 | `c2b0345` | Merge PR #17 |

---

## 2. Files Changed (25 files, +4,290 −155 lines net)

### New files
- `assets/questions.json` — Legacy question bank (24 questions, old format, unused)
- `convex/quiz.ts` — Server-side quiz helpers: question selection, tile eligibility, rule values
- `src/components/game/QuizModal.tsx` — Main quiz UI modal (691 lines)
- `src/components/game/QuizOption.tsx` — Individual answer option card component
- `src/components/game/QuizTimer.tsx` — Countdown timer component
- `src/domain/game/quizEffectResolver.ts` — Pure function resolving board effect from quiz result
- `src/domain/game/quizSelector.ts` — Pure function selecting a question from the bank
- `src/domain/game/quizTypes.ts` — Shared types: `QuizQuestion`, `QuizResult`, `QuizAnswer`, etc.
- `src/domain/game/__tests__/quizEffectResolver.test.ts` — Unit tests for effect resolver
- `src/content/quizQuestions.ts` — Authoritative question bank (48 questions, 4 themes)
- `src/content/quizQuestionAdapter.ts` — Adapter from content format to domain format
- `src/content/__tests__/quizQuestions.test.ts` — Integrity tests for the question bank
- `textos/TEXTOS PARA O JOGO.txt` — Raw text content (educational, in Portuguese)
- `textos/textos-jogo-temas.json` — Structured educational content by theme

### Modified files
- `assets/board.json` — Tiles enriched with `meta.themeId`, `meta.label`, `meta.themeTitle`
- `convex/schema.ts` — New `roomQuizRounds`, `roomQuizAnswers` tables; `awaiting_quiz` phase; `quizPoints` on players
- `convex/rooms.ts` — ~700 lines added: quiz flow mutations (`submitQuizAnswer`, `resolveQuizRound`), quiz-aware `rollTurn`, snapshot enrichment
- `src/game/state/gameState.ts` — Solo quiz state fields and actions (`submitQuizAnswer`, `dismissQuizFeedback`)
- `src/services/multiplayer/runtimeStore.ts` — Multiplayer quiz runtime state and actions
- `src/hooks/useMultiplayerEventProcessor.ts` — Event handlers for `quiz_started`, `quiz_resolved`, `quiz_cancelled`
- `src/components/game/MultiplayerOverlay.tsx` — Quiz modal integration in multiplayer UI
- `src/components/game/GameOverlay.tsx` — Quiz modal integration in solo UI
- `src/components/game/GamePlayingHUD.tsx` — Scoreboard pills for quiz points display
- `src/components/game/TileFocusBanner.tsx` — Shows "Quiz em andamento" and `meta.label` / `meta.themeTitle`
- `src/components/game/EducationalModal.tsx` — Minor integration fix
- `src/game/constants.ts` — Tile effect labels updated to quiz-aware copy

---

## 3. Feature Architecture

### 3.1 Data Flow — Multiplayer

```
Player rolls dice
     ↓
rollTurn (Convex mutation)
     ↓ landing tile is quiz-eligible?
     ├── NO  → normal turn_resolved flow (unchanged)
     └── YES →
           stripEffectFromScript()        ← effect deferred to after quiz
           selectQuizQuestion()           ← picks unused question for themeId
           insert roomQuizRounds          ← stores question + deadline
           insert roomTurnOperations      ← stores stripped script
           emit dice_rolled               ← clients animate movement
           emit turn_resolved (awaitingQuiz: true)  ← clients stop at base tile
           emit quiz_started              ← clients show QuizModal
           scheduler.runAfter(90s, resolveQuizRound)  ← timeout fallback
           room.turnPhase = 'awaiting_quiz'
                    ↓
           submitQuizAnswer (per player)
                    ↓ all answered?
                    └── resolveQuizRoundCore()
                              ↓
                          buildQuizResolvedScript()  ← applies effect based on actor's result
                          fill timeout answers for absent players
                          update quizPoints
                          emit quiz_resolved         ← reveals correct answer + all answers
                          room.turnPhase = 'awaiting_ack'
                          scheduler.runAfter(18s, finalizeTurnOperation)
```

### 3.2 Data Flow — Solo

```
finishMove() in gameState
     ↓ isQuizEligibleTile(tile)?
     ├── NO  → normal landing effect flow (unchanged)
     └── YES →
           selectQuestion(themeId, usedQuestionIds, bank)
           set quizPhase = 'answering', currentQuiz = { question, startedAt, tileColor }
           clear pendingEffect, educationalModal
                    ↓
           submitQuizAnswer(optionId)
                    ↓
           resolveQuizEffect()            ← pure function
           compute pendingEffect (advance/retreat/null)
           set quizPhase = 'feedback', quizAnswer = { selectedOptionId, result }
                    ↓
           dismissQuizFeedback()
                    ↓
           set quizPhase = 'idle'
           setTimeout(300ms) → applyPendingEffect()
```

### 3.3 Question Bank

- **Source file:** `src/content/quizQuestions.ts`
- **Format:** `{ id, theme, prompt, options[4], correctOptionIndex, explanation, sourceIds[] }`
- **Distribution:** 12 red (Risco de Transmissão) + 12 green (Prevenção) + 12 blue (Sem Risco) + 12 yellow (Especial) = **48 questions total**
- **Adapter:** `src/content/quizQuestionAdapter.ts` converts to domain `QuizQuestion` format, maps `correctOptionIndex` → option ID ('a'–'d')
- **Sources cited:** Ministério da Saúde, CDC, WHO, PAHO — scientifically grounded references
- **Minimum per theme:** `MIN_QUESTIONS_PER_THEME = 12` (enforced by test)
- **Tests:** unique IDs enforced, unique prompts enforced, all source references validated

### 3.4 Effect Rules per Tile Color

| Tile Color | Correct Answer | Incorrect / Timeout |
|---|---|---|
| 🟢 Green (Prevention) | Advance 2 tiles | Stay |
| 🔴 Red (Transmission Risk) | Stay | Retreat 2 tiles |
| 🔵 Blue (No Risk) | Stay | Return to previous tile (pre-roll position) |
| 🟡 Yellow (Special) | No quiz triggered | No quiz triggered |

The `ruleValue` (default: 2) is read from `board.rules.{color}.value` allowing board-level configuration.

### 3.5 Security Model (Multiplayer)

- `correctOptionId` is **NOT** included in the room snapshot during `status: 'active'` rounds — only exposed after `status: 'resolved'`
- `answers` (all players' answers) are only exposed after resolution
- `myAnswer.result` and `myAnswer.pointsAwarded` are only exposed after resolution
- `myAnswer.selectedOptionId` is returned to the answering player to lock the UI — but only their own answer
- The quiz question itself (text + options) is exposed to all clients — this is necessary for the UI

### 3.6 Scoring

- Correct answer: **+5 points** per quiz
- Wrong answer or timeout: **+0 points**
- Points are stored per-player in `roomPlayers.quizPoints`
- Reset to 0 on `startGame`
- Displayed in a scoreboard row in `GamePlayingHUD` (multiplayer only)
- Rankings are included in `game_finished` payload

---

## 4. Code Quality Assessment

### 4.1 Strengths

- **Clean separation of concerns.** The quiz effect resolver (`quizEffectResolver.ts`) and question selector (`quizSelector.ts`) are pure functions with no side effects — easy to test and reason about.
- **Comprehensive unit tests.** `quizEffectResolver.test.ts` covers 9 cases including edge cases (path length 0/1, previousIndex > currentIndex). `quizQuestions.test.ts` enforces data integrity.
- **Proper idempotency.** `submitQuizAnswer` checks for existing answers before inserting. `resolveQuizRoundCore` checks `round.status !== 'active'` before resolving. Double-submission is safe.
- **Timeout safety.** Both server (Convex scheduler) and client (QuizTimer `onTimeout`) handle the 90-second deadline. The server is authoritative.
- **Correct `correctOptionId` gating.** The snapshot query only exposes the correct answer after the round resolves — preventing cheating.
- **Type safety improvements.** The refactor replaced `any`-typed Convex contexts with proper `DatabaseReader`, `DatabaseWriter`, and `MutationCtx` types throughout `rooms.ts`.
- **Accessibility.** Modal uses `accessibilityViewIsModal`, buttons have `accessibilityRole` and `accessibilityLabel`. Close button is disabled (not hidden) during answering to preserve tab order.
- **Animation hygiene.** `useEffect` in `QuizModal` properly stops all animations and resets values on close — no leaked `Animated.Value` state.
- **`touchPresence` optimization.** Room `lastActiveAt` is now only written when stale by 30+ seconds, reducing unnecessary Convex document mutations.
- **Deferred effect.** During the quiz phase, the tile effect (advance/retreat) is intentionally stripped from the initial movement script and re-applied after the quiz resolves. This gives the game its conditional movement mechanic cleanly.

### 4.2 Bugs Found

See Section 5 for full details.

### 4.3 Content Observations

- Questions cite authoritative sources (Ministério da Saúde, CDC, WHO, PAHO) and cover realistic HIV transmission risk scenarios.
- Educational explanations are included for every question and shown after the player answers.
- Tile text (educational content) is also shown in the quiz modal's feedback phase, reinforcing learning.
- The red tile questions correctly frame risk scenarios (unprotected sex without PrEP/treatment) rather than stigmatizing people living with HIV.
- Blue tile questions correctly address misconceptions (hugging, sharing bathrooms, etc. do NOT transmit HIV).

**Important caveat:** Content accuracy must be validated by a qualified public health or HIV/AIDS specialist before production release. This audit does not constitute a medical review.

---

## 5. Bugs Found

### BUG-01 — Critical: `quizAnswer` not persisted in solo mode

**File:** `src/game/state/gameState.ts`, `saveProgress` function (~line 252)  
**Impact:** Data loss / misleading UI on app restart

`saveProgress` saves `currentQuiz`, `quizPhase`, and `usedQuestionIds` but does **not** save `quizAnswer`. If a player answers a quiz, reaches the `'feedback'` phase, and then closes the app:
- On reopen, `quizPhase` is restored as `'feedback'`
- `currentQuiz` is restored (question is visible)
- `quizAnswer` is `null`
- `getResultCopy(undefined)` defaults to **'Incorreto'** — even if the player actually answered correctly

The player is shown a false "Incorreto" result. For an HIV prevention education game, incorrectly labeling a correct answer is a serious issue — it may undermine the player's confidence in their knowledge.

---

### BUG-02 — Critical: `quiz_cancelled` event handler is dead code

**File:** `src/hooks/useMultiplayerEventProcessor.ts`, line 86  
**Impact:** Incorrect quiz modal state if the active player leaves during a quiz

The event processor handles `event.type === 'quiz_cancelled'` by calling `dismissQuizFeedback()`. However, looking at the `leaveRoom` mutation in `convex/rooms.ts`, when a quiz round is cancelled (active player leaves mid-quiz), the round is patched to `status: 'cancelled'` but **no `quiz_cancelled` event is emitted**. The only events emitted are `turn_cancelled`, optionally `game_finished`, and `turn_started`.

Cleanup for other players relies on `syncFromSnapshot` (which returns `undefined` for cancelled rounds via `quizRoundFromSnapshot`). This works eventually but is less immediate than a direct event, and the dead handler creates a false expectation in the code.

---

### BUG-03 — Moderate: Player stuck on quiz feedback if `latestResolvedTurn` is absent

**File:** `src/components/game/MultiplayerOverlay.tsx`, `handleDismissQuizFeedback` (~line 870)  
**Impact:** Player cannot dismiss the quiz result modal

The flow is:
```ts
const handleDismissQuizFeedback = async () => {
  const dismissed = await handleDismissResolvedTurn(); // returns false if !latestResolvedTurn
  if (dismissed) {
    dismissQuizFeedback();
  }
};
```

`handleDismissResolvedTurn` returns `false` (and is a no-op) when `latestResolvedTurn` is null. `applyQuizResolved` in `runtimeStore.ts` sets `latestResolvedTurn: script ?? state.latestResolvedTurn`. If `script` parsed from the `quiz_resolved` event is `null` (malformed payload), `latestResolvedTurn` stays at its previous value. In a fresh session where no prior turn was resolved, it is `undefined`.

If this happens, `dismissed` is `false`, `dismissQuizFeedback()` is never called, and the player is permanently stuck on the feedback screen until the room state changes via snapshot.

---

### BUG-04 — Moderate: Yellow theme questions are dead content

**File:** `src/content/quizQuestions.ts`, `src/content/quizQuestionAdapter.ts`  
**Impact:** 12 questions written and maintained but never shown to players

`QUIZ_QUESTION_BANK.yellow` contains 12 questions with `theme: 'yellow'`. These are included in `QUIZ_QUESTIONS` and `ADAPTED_QUESTION_BANK`. However:
- `isQuizEligibleTile` in both `convex/quiz.ts` and `src/game/state/gameState.ts` only allows `['green', 'red', 'blue']`
- Yellow tiles exist on the board (`assets/board.json`: 2 yellow tiles) but are typed as a non-quiz color
- `selectQuestion` filters by `themeId === themeId`, so with `themeId = 'yellow'` never being passed, these 12 questions are unreachable

This is wasted effort and may confuse future maintainers.

---

### BUG-05 — Moderate: `assets/questions.json` is a stale, unused file

**File:** `assets/questions.json`  
**Impact:** Developer confusion, potential misuse

This file was added in today's first commit but is not imported anywhere in the codebase. It contains 24 questions in a different format (`themeId: 'tema-1'`) from the old design. The code uses `src/content/quizQuestions.ts` exclusively. The file clutters the `assets/` directory and could lead future developers to edit it thinking it is the authoritative source.

---

### BUG-06 — Minor: `myAnswer.playerId` type inconsistency

**File:** `src/services/multiplayer/runtimeStore.ts`, `MultiplayerQuizAnswer` type  
**Impact:** TypeScript type unsoundness

The server snapshot's `myAnswer` object does not include a `playerId` field, but `MultiplayerQuizAnswer` requires `playerId: string`. The data is cast through the untyped snapshot, so TypeScript does not catch this. At runtime, `myAnswer.playerId` would be `undefined` when the snapshot is the source. The only place this field is actually used is in `markQuizSubmitted`, which sets it from `state.mePlayerId`. So the functional impact is minimal, but the type is misleading.

---

### BUG-07 — Minor: `answeredAt` and `timeElapsedMs` leak before quiz resolution

**File:** `convex/rooms.ts`, `getRoomState` query (~line 935)  
**Impact:** Minor information exposure

```ts
myAnswer: myQuizAnswer
  ? {
      selectedOptionId: myQuizAnswer.selectedOptionId ?? null,
      ...(exposeQuizAnswers ? { result, pointsAwarded } : {}),
      answeredAt: myQuizAnswer.answeredAt,   // always exposed
      timeElapsedMs: myQuizAnswer.timeElapsedMs, // always exposed
    }
```

`answeredAt` and `timeElapsedMs` are included in `myAnswer` even before the quiz resolves (`exposeQuizAnswers = false`). A player can infer from `timeElapsedMs` how quickly they answered. This is only the player's own data, so the impact is low — but it could allow a player to confirm "my answer was recorded" and extract timing metadata they shouldn't have yet.

---

### BUG-08 — Minor: Solo mode has no quiz scoreboard

**File:** `src/components/game/GameOverlay.tsx`  
**Impact:** UX inconsistency

`quizPoints` is tracked in solo mode (`gameState.ts`) and incremented on correct answers, but the `GamePlayingHUD` in `GameOverlay` does not pass `scoreboardPlayers`. Solo players earn points they can never see. The multiplayer overlay correctly computes and passes `scoreboardPlayers`.

---

### BUG-09 — Minor: Educational modal bypassed after solo quiz

**File:** `src/game/state/gameState.ts`, `dismissQuizFeedback`  
**Impact:** Reduced educational reinforcement

In the normal solo flow (no quiz), after landing on a tile, `showEducationalModal` becomes `true` and displays a dedicated educational content screen. After dismissing quiz feedback, `dismissQuizFeedback` sets `showEducationalModal: false`. The educational content is available inside the quiz modal's feedback phase, but the standalone educational modal no longer appears. This removes a second reinforcement moment that may be valuable for learning.

---

### BUG-10 — Minor: `quiz_cancelled` not emitted from `leaveRoom`

**File:** `convex/rooms.ts`, `leaveRoom` mutation  
**Impact:** Slightly slower quiz cleanup for remaining players (related to BUG-02)

When a player leaves during an active quiz:
1. The quiz round is marked `status: 'cancelled'`
2. The turn operation is marked `status: 'cancelled'`
3. `turn_cancelled` and/or `game_finished` events are emitted
4. **No `quiz_cancelled` event is emitted**

Other players' quiz modals are eventually cleared by `syncFromSnapshot` (which filters out cancelled rounds), but there is a small window where their UI still shows the quiz. An explicit event would clear it immediately via the event processor.

---

## 6. Test Coverage Assessment

| Area | Coverage |
|---|---|
| `quizEffectResolver` | Excellent — 9 unit tests, all branches covered |
| `quizQuestions` data integrity | Good — uniqueness, minimum count, source validity |
| `quizSelector` | None — no tests for question selection logic |
| `QuizModal` UI | None |
| `QuizTimer` | None |
| `submitQuizAnswer` mutation | None |
| `resolveQuizRoundCore` | None |
| Solo `submitQuizAnswer` state action | None |
| Solo `dismissQuizFeedback` state action | None |
| Multiplayer event processing (quiz events) | None |

---

## 7. Performance Observations

- **`quizSelector.ts`** uses `Array.includes()` for deduplication — O(n²) in the worst case. At 48 questions this is negligible, but converting `usedQuestionIds` to a `Set` would be cleaner.
- **`removeRoomData`** correctly cleans up `roomQuizRounds` and `roomQuizAnswers` in batches.
- **`resolveQuizRoundCore`** runs up to 4 parallel `ctx.db.patch` calls via `Promise.all` — good practice.
- **`touchPresence` throttling** — room `lastActiveAt` is only written once per 30 seconds (previously every heartbeat) — good performance improvement.
- The **90-second quiz timeout** scheduled via Convex's `runAfter` scheduler is the correct approach for server-authoritative deadlines.

---

## 8. Protocol Version

The `ROOM_PROTOCOL_VERSION` and `ROOM_EVENT_VERSION` were bumped from `2` to `3`. This is the correct approach. Clients on protocol version 2 would be incompatible with the new quiz events — the version bump ensures they are prompted to upgrade rather than silently misbehaving.

---

## 9. Summary Table

| Category | Count |
|---|---|
| Critical bugs | 2 |
| Moderate bugs | 3 |
| Minor bugs / issues | 5 |
| Missing test areas | 8 |
| Total issues | 18 |

The feature is architecturally sound and the core flow (solo and multiplayer) is implemented correctly. The most urgent fix is **BUG-01** (misleading feedback on app restart) due to its direct educational impact. **BUG-02** and **BUG-03** affect multiplayer reliability. The remaining issues are quality-of-life improvements.
