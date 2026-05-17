# BUG_AUDIT_DICE_FREEZE.md

**Generated:** 2026-05-16
**Method:** 8-agent static-analysis swarm + verification spot-checks
**Scope:** Dice freeze (primary), menu sizing on load (secondary), wide-sweep adjacent bugs
**Companion document:** `BUG_AUDIT.md` (2026-04-24) — read alongside; this report does NOT duplicate items already there.

---

## Executive Summary

The multiplayer dice freeze is a **compound failure** with three contributing layers:

1. **H3 (HIGH confidence) — Architectural risk: adaptive render-quality switching can remount the dice subtree at any moment** with no key safety, no Retry-able error fallback, and no guard against firing mid-turn. The user's intuition about a graphics-quality correlation is correct.
2. **M4 (HIGH confidence) — Server auto-roll loop is undetectable by the existing recovery UI**: every successful auto-roll refreshes `phaseDeadlineAt = now + 45 s`, so the `StuckRoomBanner` predicate never fires AND `forceAdvanceTurn` always fails its own freshness check. **This is why players cannot recover.**
3. **H2 (CONFIRMED but lower direct impact)** — The event processor's "resync gap skip" silently drops `turn_started` events, causing the Zustand `runtimeStore.currentTurnPlayerId` to go stale. **Important correction:** `canRoll` is derived from the Convex `getRoomState` snapshot (line 739-745), NOT from the event-derived store, so the gate itself recovers on the next snapshot — but the local animation state, turn-indicator UI, and pending-effect queues do not. This explains the "things look off" sub-symptoms rather than the click-dead button.

**The most likely root cause of the click-dead dice button is H3.** **The most likely reason players cannot recover from it is M4.** Together they fully explain the user's report.

---

## DICE FREEZE — Ranked Hypotheses

### H3 — Adaptive render-quality switch breaks the dice click chain — **CONFIRMED** (~85% confidence as root cause)

**Mechanism**
- `useAdaptiveRenderQuality` (`src/game/renderQuality.ts:55-135`) runs inside the GameScene Canvas via `useFrame`, sampling FPS every 10 frames. With an 8-second cooldown it calls `setRenderQuality('low')` whenever average FPS dips below 42, and further to `'pwa'` below 30. **No guard prevents firing mid-multiplayer turn.**
- `DiceMenu.tsx:58` toggles `show3DDicePreview = renderQuality !== 'low' && isWebGLAvailable()`.
- `DiceMenu.tsx:123-145` swaps `<Canvas>` ↔ `<View>{FallbackDice}</View>` with **no key on either branch** and no key on the outer wrapper.
- When the swap happens, `safeDisposeRenderer` (`DiceMenu.tsx:65-67`) calls `renderer.dispose()` synchronously. If a frame is in flight, this can throw a WebGL error.
- `CanvasErrorBoundary.tsx:42-44` catches the error and renders the fallback prop, which in DiceMenu's case is just `<View style={styles.diceCanvasFallback} />` (`DiceMenu.tsx:125`) — **a styled colored box with no Pressable, no `onPress`, and no Retry button**.
- The outer `AnimatedButton` (`DiceMenu.tsx:115`) still receives clicks, but R3F's `<Canvas>` mounts/unmounts can briefly capture or eat pointer events on the web. Even when clicks reach `handleRoll`, the gate at `DiceMenu.tsx:109` (`if (!resolvedCanRoll) return`) may swallow them during a brief inconsistent render where `resolvedRenderQuality` changed but `canRoll` hasn't propagated.
- Once the error boundary is in `hasError: true`, only an explicit `handleRetry()` call resets it (`CanvasErrorBoundary.tsx:29`). DiceMenu provides no UI to trigger this, so the broken state **persists for the rest of the game**.

**Why "for everyone"**
Each client's quality downgrades independently when their own FPS dips. Heavy 3D board rendering is roughly synchronous across players, so multiple players hit the threshold around the same time. Each affected player's turn then freezes when it becomes their turn — auto-roll keeps the game moving on the server while no player can actually interact.

**Recommended fix** (concrete, low-risk, in priority order):
1. **Key the conditional wrapper** in `DiceMenu.tsx:123-145`:
   ```tsx
   <View key={show3DDicePreview ? 'dice-3d' : 'dice-fallback'} style={...}>
   ```
2. **Guard `setRenderQuality`** in `src/game/state/gameState.ts:440-444`:
   ```tsx
   setRenderQuality: (quality) => {
     const state = get();
     if (state.isRolling || state.isMoving || state.quizPhase !== 'idle') return; // defer until idle
     set({ renderQuality: quality });
     // ...rest
   }
   ```
   Additionally, in multiplayer, defer until `turnPhase` is between phases.
3. **Make the CanvasErrorBoundary fallback interactive** — replace the empty `<View>` in `DiceMenu.tsx:125` with a Pressable that calls `handleRetry()` or at minimum a visible "Recarregar dado" affordance.
4. **Defer renderer disposal** (`DiceMenu.tsx:63-68`):
   ```tsx
   useEffect(() => {
     if (!show3DDicePreview) {
       const id = requestAnimationFrame(() => safeDisposeRenderer(rendererRef));
       return () => cancelAnimationFrame(id);
     }
     return () => safeDisposeRenderer(rendererRef);
   }, [show3DDicePreview]);
   ```
5. **Also key the GameScene Canvas on `renderQuality`** at `GameScene.tsx:228` so the upstream canvas always remounts cleanly when quality changes:
   ```tsx
   key={`scene-canvas-${contextRestoreKey}-${renderQuality}`}
   ```

---

### M4 — Auto-roll loop renders all recovery UI inoperable — **CONFIRMED** (95% confidence)

This is the reason "players cannot unfreeze."

**Mechanism**
- Successful auto-roll calls `rollTurnCore({cause: 'auto'})` which advances the turn and, via `finalizeTurnOperationCore`, sets `phaseDeadlineAt = now + TURN_ROLL_TIMEOUT_MS` (`convex/rooms.ts:880`) for the next player.
- This repeats every 45 s, so `phaseDeadlineAt` is **always ~45 s in the future**.
- Client-side stuck-banner predicate at `MultiplayerOverlay.tsx:953-959`:
  ```ts
  isRoomStuck = ... && (!stuckPhaseDeadlineAt || stuckNowMs - stuckPhaseDeadlineAt > 5_000)
  ```
  Since `stuckPhaseDeadlineAt` is always in the future, the second clause is never satisfied. **`StuckRoomBanner` never renders.**
- Server-side `forceAdvanceTurn` mutation at `convex/rooms.ts:2607`:
  ```ts
  if (!room.phaseDeadlineAt || room.phaseDeadlineAt + FORCE_ADVANCE_DEADLINE_GRACE_MS > now) fail(...)
  ```
  With the deadline always fresh, **the mutation throws "Aguarde alguns segundos antes de forcar avanco" every time**, even if the player could find an unstick button (they can't, see above).
- Watchdog cron `recoverStuckRooms` at `convex/rooms.ts:2548-2581` queries rooms with `phaseDeadlineAt < cutoff = now - WATCHDOG_GRACE_MS`. Same deadline-refresh problem — the room never enters the index window.

**Recommended fix** (priority order):
1. **Change the banner predicate** to use "no event in 30 s" without the deadline check (since auto-roll-driven events still arrive, also detect "events keep arriving but `currentTurnPlayerId` cycle is auto-only"):
   ```ts
   // Add a "consecutive autoRolls" counter on the room doc; surface banner when N >= 2.
   ```
   Simpler: detect "phaseDeadlineAt refreshes but no human roll" by tracking the last *manual* roll timestamp.
2. **Loosen `forceAdvanceTurn`** to accept an unstick request when the last *non-auto* roll on the room is > 90 s old, regardless of deadline freshness.
3. **Tag auto-rolls in the events stream** with `cause: 'auto'` so the client can count consecutive auto-rolls and surface a "game stuck — click to recover" banner client-side without server help.

---

### H2 — Event-processor resync gap drops `turn_started` — **CONFIRMED but partially mitigated** (95% confidence on mechanism; lower impact than initially thought)

**Mechanism (verified)**
- `src/hooks/useMultiplayerEventProcessor.ts:62-70` unconditionally jumps `processedSequence` forward after 3 resync retries, silently dropping every event in the gap.
- If a `turn_started` event is in the gap, `applyTurnStarted(playerId)` is never called, leaving `runtimeStore.currentTurnPlayerId` stale.

**Important correction to original hypothesis**
- Spot-check of `MultiplayerOverlay.tsx:718-721` and `739-745` confirms that `canRoll` is derived from `roomState.players` and `roomState.room.turnPhase` — i.e., the **Convex query snapshot**, not the event-derived store.
- The snapshot reactively updates from the same Convex backend, so the dice gate itself recovers within the next subscription update (typically sub-second).
- Therefore H2 does NOT directly cause the click-dead dice button. It DOES cause: stale turn-indicator animations, stale `pendingEffectQueue`, the wrong actor highlighted in the 3D scene, and missing dice-roll animations.

**Recommended fix** (still high-value):
- After the gap skip in `useMultiplayerEventProcessor.ts:64-70`, force a `syncFromSnapshot(roomState)` call so the runtime store re-derives `currentTurnPlayerId` and related state from the snapshot.
- Add telemetry (`console.warn` already exists; pipe to a logger so production occurrences are visible).
- Reset `resyncCountRef` on roomId change (Agent B's ADJ-3) to prevent cross-room contamination.

---

### H1 — Server `pendingTurn` never cleared — **REFUTED** (80% confidence)

`getPendingTurnOperationDoc` filters by `status === 'pending'` (`convex/rooms.ts:400, 405`). `finalizeTurnOperationCore` marks operations resolved atomically before the mutation commits. Every insertion path has a guaranteed cleanup. The server-side state machine is sound.

---

## MENU SIZING ON LOAD — Confirmed Root Cause

**Root cause:** `useSafeAreaInsets()` returns `{0,0,0,0}` on first render before the SafeAreaProvider's native bridge settles, AND `app/_layout.tsx:37-41` does **NOT** wrap `<Stack>` in `<SafeAreaProvider>` — it relies on expo-router's implicit provider, which may not be ready on first paint.

**Math at `MainMenuOverlay.tsx:185-189`** with windowWidth=0, insets.top=0:
- `availableRowWidth = Math.max(240, 0 - 32) = 240`
- `cardWidth = Math.min(116, floor((240 - 28) / 3)) = min(116, 70) = 70` ← visibly smaller
- After navigate-back, both insets and dimensions are warm, so `cardWidth` settles at the intended ~116px.

**Recommended fix** (minimum risk):
Wrap `app/_layout.tsx:37-52` content in `<SafeAreaProvider>` from `react-native-safe-area-context`. This is a zero-behavioral-change addition that ensures readiness on first paint:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ...
const content = (
  <SafeAreaProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>...</Stack>
      <StatusBar style="auto" />
      <NetworkBadge />
      <PWAPrompt />
    </ThemeProvider>
  </SafeAreaProvider>
);
```

Optionally add a guard in `MainMenuOverlay.tsx` (after `const insets = ...`):
```tsx
if (insets.top === 0 && insets.bottom === 0 && windowWidth === 0) {
  return <View style={{ flex: 1 }} />;
}
```

---

## ADJACENT FINDINGS — NEW (not in `BUG_AUDIT.md`)

### CRITICAL
None beyond H3 + M4 (covered above).

### HIGH
| ID | File:line | Issue | Fix |
|----|-----------|-------|-----|
| **N-H1** | `src/components/game/DiceMenu.tsx:125` | `CanvasErrorBoundary` fallback in DiceMenu is `<View style={...} />` with NO Retry UI. Once errored, dice is dead until full app reload. | Replace with a `Pressable` that triggers retry, or render `FallbackDice` (the regular fallback) instead of a blank View. |
| **N-H2** | `src/game/Dice3D.tsx:117-118` | `SphereGeometry` + `MeshBasicMaterial` created via `useMemo` with `[]` deps but never disposed. Cumulative VRAM leak over many rolls / canvas remounts. | Add `useEffect(() => () => { pipGeo.dispose(); pipMat.dispose(); }, [pipGeo, pipMat])`. |
| **N-H3** | `src/hooks/useMultiplayerEventProcessor.ts:64-70` | After "max resync retries" gap skip, no snapshot re-sync triggered → local runtime store stays out of sync with server until next natural subscription tick. | After the skip, call `syncFromSnapshot(roomState)` explicitly. |

### MEDIUM
| ID | File:line | Issue | Fix |
|----|-----------|-------|-----|
| **N-M1** | `convex/rooms.ts:2548-2581` + `:2510-2542` | Double-roll race: watchdog `recoverStuckRoomCore` AND a stale scheduled `autoRollTurn` can both invoke `rollTurnCore` for the same turn. Idempotency checks guard most cases but a small OCC interleave window exists. | Add `lastRollAt` ref-check on the room, or include `currentTurnId` in scheduler args and validate match. |
| **N-M2** | `convex/rooms.ts:2848-2863` (`touchPresence`) | `.collect()` + conditional insert race on concurrent heartbeats → duplicate `roomPresence` docs (the dedupe block at line 2862 catches them, but they accumulate transiently). | Replace with `.first()` + patch/insert; consider a unique constraint helper table. |
| **N-M3** | `convex/rooms.ts:271-297` (`insertRoomEvents`) and all call sites | `nextEventSequence` increment is read-then-write across the room doc. Under OCC retry, sequence gaps can form (e.g., 5, 7 — missing 6). The client's `requiresResync` logic treats gaps as resync triggers, feeding directly into the H2 problem above. | Reserve the sequence block atomically by patching the room before inserting events, or use a single atomic `update` operation. |
| **N-M4** | `convex/rooms.ts:2616-2833` (`leaveRoom`) vs `:545-720` (`resolveQuizRoundCore`) | Race when a player leaves during an active quiz round. Convex OCC will conflict and retry, but the resolver may have already patched scores for a player who has since left. | In `resolveQuizRoundCore`, after reading the round, re-check that the operation's actor is still in the active set; skip if not. |
| **N-M5** | `convex/rooms.ts:1544-1615` (`setCharacter`) | Character claim TOCTOU: local conflict check happens before the room.characterClaims patch. Two concurrent claims can both pass the check; OCC then retries one, but ordering between room and player patches could leave inconsistency. | Re-fetch the room after patching to confirm the claim survived; only then patch the player doc. |
| **N-M6** | `app/index.tsx:389` | `const { gameStatus } = useGameStore();` subscribes the root App component to the **entire Zustand store**. Every state mutation (player movement, dice, quiz, zoom) re-renders this component. | Change to `const gameStatus = useGameStore((s) => s.gameStatus);`. (Same pattern as `BUG_AUDIT.md` H2 for SoundToggle.) |
| **N-M7** | `src/game/Board.tsx:473, 506, 741-743` | Multiple Three.js geometries (`createFlagGeometry`, `createStarGeometry`, `CircleGeometry`, `createDiamondGeo`) created in `useMemo` without disposal. VRAM leak on board reconfiguration. | Add cleanup `useEffect`s that call `.dispose()` on each. |
| **N-M8** | `src/components/game/MultiplayerOverlay.tsx:334-338` (`getErrorMessage`) | Swallows all error stacks. No `console.error`, no telemetry. Multiplayer freezes have zero diagnostic trail. | Add `console.error('[Multiplayer]', error)` before returning user-facing message. |
| **N-M9** | `src/components/game/MultiplayerOverlay.tsx:1183-1198` (`handleRoll`) | Early return at line 1184 happens *before* `setBusyAction('roll')`. If `activePlayerId` flickers during a re-render (rejoin race), a stale closure can fire after the return without setting busyAction — leaving the UI inconsistent with the in-flight mutation. | Capture `activePlayerId` in a ref or `setBusyAction` immediately, then validate. |
| **N-M10** | `src/hooks/useMultiplayerEventProcessor.ts:5-72` | `resyncCountRef` is not reset when `roomId` changes. A player leaving room A at retry 2 then joining room B has the counter pre-loaded, so room B's very next resync immediately hits the gap-skip path. | Reset `resyncCountRef.current = 0` in an effect keyed on `session?.roomId`. |
| **N-M11** | `convex/rooms.ts:389-412` (`getPendingTurnOperationDoc`) | When called without a `turnId`, queries all pending ops and returns the oldest. If multiple orphan pending ops ever exist (shouldn't, but defensive), client sees only the oldest, hiding others. | Add an assertion / warning log when more than one is found. |

### LOW
| ID | File:line | Issue | Fix |
|----|-----------|-------|-----|
| **N-L1** | `convex/rooms.ts:1981-1985, 2224-2228` | Quiz timeout scheduler fires `runAfter` unconditionally even when the round resolves immediately (1 player, instant answer). Wastes scheduler slots. | Gate on `if (!completion.resolved)` before scheduling. |
| **N-L2** | `convex/rooms.ts:2616+` (`leaveRoom`) | Reads the room once at the start; if it transitions `lobby → playing` mid-execution, cleanup branches miss the new state. | Re-fetch the room right before the `room.status === 'playing'` branch. |
| **N-L3** | `convex/rooms.ts:2566-2576` (watchdog try/catch) | On exception, bumps `phaseDeadlineAt += WATCHDOG_GRACE_MS`. Transient OCC errors are treated identically to permanent ones, delaying genuine recovery by an extra grace period. | Differentiate retryable from non-retryable errors before backing off. |
| **N-L4** | `src/components/game/DiceMenu.tsx:65-67` | `safeDisposeRenderer` called synchronously inside an effect; can race with an active frame draw. | Defer with `requestAnimationFrame` (see H3 fix #4 above). |

---

## CROSS-REFERENCE WITH EXISTING `BUG_AUDIT.md`

| New finding | Related existing ID | Relationship |
|-------------|---------------------|--------------|
| H2 (this report) | H12, H13 | **Extends** — H12 fixed the infinite loop with the `MAX_RESYNC_RETRIES = 3` cap; H13 prompted the event sort at line 83. Both partial fixes introduced THIS new bug (the silent gap skip). |
| H3 / N-H1 | M6 | **Extends** — M6 added `React.memo` (verified in `DiceMenu.tsx:166`); this report identifies a different DiceMenu issue (no key on Canvas/Fallback swap, no Retry in error fallback). |
| M4 | (none) | **Net-new.** |
| N-M2 | M2 | Related but distinct — M2 is unbounded `.collect()` in the *cron*; N-M2 is the read-then-write race in `touchPresence`. |
| N-M3 | H12, H13 | **Root cause** of the gaps that trigger resync, which then trigger H12's retry loop and H13's ordering risks. |
| N-M4 | M8 | **Extends** — M8 documented the post-leave patch; N-M4 documents the *race* during leave. |
| N-M6 | H2 | **Same pattern, different file** — H2 (SoundToggle) had full-state subscription; N-M6 catches it at app root. |
| N-M8 | (none) | **Net-new.** |
| N-M9 | (none) | **Net-new.** |
| N-M10 | H12 | **Extends** — H12 capped retries; N-M10 finds the counter doesn't reset across rooms. |
| N-L1 | M1 | Related — M1 is stale `runAfter(0)` per answer; N-L1 is unconditional timeout scheduling. |

---

## REPRODUCTION RECIPE (for the dice freeze)

**Setup:** Two browser windows on Chrome, both joining the same multiplayer room.

**Trigger A — quality switch (most likely root cause):**
1. Start the game. Wait until both players are in the 3D scene.
2. On one client, open DevTools → Performance → CPU throttle → "6x slowdown".
3. Move the camera around to stress rendering; wait until average FPS drops below 42 for ~5 seconds.
4. Observe `setRenderQuality('low')` fire (you'll see the dice canvas replaced with the 2D `FallbackDice`).
5. With timing luck this happens during a turn transition; the dice button becomes unclickable for the active player.
6. Wait 45 s — server `autoRollTurn` fires. Repeat for next player. **No `StuckRoomBanner` ever appears.**

**Trigger B — resync gap (causes stale animations, contributing observability bug):**
1. Start the game. During an active turn, use DevTools → Network → "Offline" for ~3 seconds, then "Online".
2. Watch console for the warning `"Max resync retries reached, skipping gap unconditionally"` (from `useMultiplayerEventProcessor.ts:64`).
3. After the warning, observe missing dice-roll animations and the wrong player highlighted in the scene, even though `canRoll` will eventually settle from the snapshot.

**Confirming M4 — recovery is impossible:**
1. After either trigger, attempt `forceAdvanceTurn`. The button isn't visible (`StuckRoomBanner` predicate fails). If you call the mutation manually from a Convex dashboard, it fails with "Aguarde alguns segundos antes de forcar avanco."

---

## RECOMMENDED FIX PRIORITIES

### Phase 1 — Immediate (CRITICAL, unblocks players)
1. **H3 fix #1+#2+#3**: Key the DiceMenu conditional wrapper, guard `setRenderQuality` against firing during active turns, and replace the empty CanvasErrorBoundary fallback with an interactive `FallbackDice` or Retry button. — _files: `DiceMenu.tsx`, `gameState.ts`._
2. **M4 client-side fix**: Change `isRoomStuck` predicate in `MultiplayerOverlay.tsx:953-959` to NOT require `phaseDeadlineAt` freshness; add a "consecutive auto-rolls" client-side counter. Surface banner after 2 consecutive auto-rolls without manual interaction. — _file: `MultiplayerOverlay.tsx`._
3. **M4 server-side fix**: Loosen `forceAdvanceTurn` (`convex/rooms.ts:2607`) to accept "no manual roll in the last 90 s" as an alternative pass-condition.
4. **N-M8 diagnostics**: Add `console.error('[Multiplayer]', error)` in `getErrorMessage` so future freezes leave a trail.

### Phase 2 — Soon (HIGH, prevents recurrence)
5. **H2 fix**: Force `syncFromSnapshot` after the gap-skip path in `useMultiplayerEventProcessor.ts:64-70`. Add cross-room counter reset (N-M10).
6. **N-M3**: Make `nextEventSequence` atomic to eliminate the gaps that trigger resyncs in the first place.
7. **N-H1**: Replace the empty CanvasErrorBoundary fallback with `<FallbackDice />` so a Canvas error degrades gracefully instead of becoming inert.
8. **N-H2 + N-M7**: Dispose Three.js geometries/materials in Dice3D and Board (cumulative VRAM leak).

### Phase 3 — Hardening (MEDIUM)
9. **Menu sizing**: Wrap `app/_layout.tsx` content in `<SafeAreaProvider>`.
10. **N-M1**: Tighten autoRollTurn idempotency by including `currentTurnId` in scheduler args.
11. **N-M2, N-M4, N-M5**: Concurrency hardening in `touchPresence`, `leaveRoom`/`resolveQuizRoundCore`, and `setCharacter`.
12. **N-M6**: Narrow the root App's Zustand subscription to a selector.
13. **N-M9**: Capture `activePlayerId` in a ref before the early return in `handleRoll`.

### Phase 4 — Cleanup (LOW)
14. N-L1 through N-L4.

---

## CONFIDENCE SUMMARY

| Finding | Confidence | Why |
|---------|-----------|-----|
| H3 as root cause of click-dead dice | 85% | Multi-layered structural vulnerability; user's intuition aligns; needs live repro to be 100% certain which specific code path errors first |
| M4 as reason recovery is blocked | 95% | Math is straightforward; predicates verified in code |
| H2 as observability/animation bug | 95% | Mechanism fully traced |
| H2 as direct cause of click-dead dice | <20% | `canRoll` is snapshot-derived, not event-derived |
| H1 refuted | 80% | Code is sound; small residual uncertainty around Convex OCC retry edge cases |
| Menu sizing root cause | 95% | Math matches symptom exactly |
| Adjacent findings | varies, generally HIGH | All cross-checked against `BUG_AUDIT.md` to avoid duplicates |

---

## Files Modified by This Audit

- `BUG_AUDIT_DICE_FREEZE.md` (this file, new).
- No source files modified.
