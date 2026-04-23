# Consolidated Prioritized Improvement Report

**Project:** board-game2 (Expo / React Native Board Game)  
**Date:** 2026-04-23  
**Scope:** UI Components, 3D Engine, State/Domain, Multiplayer/Backend, Config/Tooling/Tests/PWA  

---

## 1. Executive Summary

Five parallel code-review subagents analyzed the codebase. A total of **~150 distinct issues** were identified across bugs, usability flaws, design inconsistencies, performance bottlenecks, security gaps, and tooling misconfigurations.

| Severity | Count |
|----------|-------|
| Critical | 9 |
| High | 40 |
| Medium | 65 |
| Low | 36 |

| Effort | Count |
|--------|-------|
| Tiny (<15 min) | ~60 |
| Small (15–60 min) | ~65 |
| Medium (1–4 h) | ~20 |
| Large (4 h+) | ~5 |

**Top quick wins (Tiny effort, Critical/High impact):**
1. Fix haptics platform check (`haptic-tab.tsx`).
2. Fix `AnimatedButton` accessibility state merging.
3. Await async audio disposal (`audioManager.ts`).
4. Force Canvas remount on retry (`CanvasErrorBoundary`).
5. Dispose `CanvasTexture` in `Dice3D.tsx`.
6. Guard `window` access in `PWAPrompt.tsx`.
7. Use Zustand selectors in `SoundToggle.tsx`.
8. Fix `selectGameProgress` referential equality.
9. Guard audio `load` failures.
10. Stop swallowing `controls.update()` errors.

---

## 2. Prioritization Rubric

Items are ordered first by **ascending effort**, then by **descending severity**.

- **Reward / Impact:** Derived from severity (Critical = app crash, data loss, or security breach; High = significant UX degradation or performance drain; Medium = noticeable polish or reliability issue; Low = minor inconsistency or code-quality debt).
- **Risk:** Estimated blast radius of the change. Most Tiny/Small fixes are low-risk because they are localized. Medium/Large items may touch architecture or shaders and carry higher regression risk.
- **Dependencies:** Noted when a fix relies on another change (e.g., auth integration) or external asset (e.g., adaptive icon design).

---

## 3. Quick Wins — Tiny Effort (<15 min)

### 3.1 Critical Severity

#### 3.1.1. `components/haptic-tab.tsx:10` — Cross-platform haptics failure
- **Severity:** Critical | **Category:** Bug | **Effort:** Tiny
- **Issue:** Uses `process.env.EXPO_OS === 'ios'` to gate haptics. This is `undefined` in bare RN builds and on Android, so haptics never fire.
- **Proposed Fix:** Replace with `Platform.OS === 'ios'` from `react-native`. Android can also use `Haptics.impactAsync` via `expo-haptics`.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Immediate UX improvement on Android; near-zero regression risk.

#### 3.1.2. `src/components/ui/AnimatedButton.tsx:105` — Accessibility state clobbering
- **Severity:** Critical | **Category:** Bug / Accessibility | **Effort:** Tiny
- **Issue:** `accessibilityState={accessibilityState ?? { disabled: !!disabled }}` overwrites any caller-provided state (e.g., `selected`, `checked`).
- **Proposed Fix:** Merge states: `accessibilityState={{ disabled: !!disabled, ...accessibilityState }}`.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Fixes screen-reader accuracy for toggle buttons; zero risk.

#### 3.1.3. `src/services/audio/audioManager.ts:39-51` — `disposeAll` does not await async cleanup
- **Severity:** Critical | **Category:** Bug | **Effort:** Tiny
- **Issue:** `player.pause()` and `player.remove()` are async but not awaited. Errors become unhandled promise rejections and cleanup may not finish.
- **Proposed Fix:** `await player.pause(); await player.remove();` inside the `Promise.all` callbacks.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents memory leaks and audio ghosting; minimal risk.

---

### 3.2 High Severity

#### 3.2.1. `src/components/game/CanvasErrorBoundary.tsx:27-29` — Retry does not force Canvas remount
- **Severity:** High | **Category:** Bug / Usability | **Effort:** Tiny
- **Issue:** `handleRetry` resets React state but does not unmount the Canvas. A persistent WebGL shader failure or context loss will re-crash immediately.
- **Proposed Fix:** Add a `key` prop to `<Canvas>` that increments on retry (e.g., `key={retryCount}`).
- **Dependencies / Trade-offs:** Forces asset reload; add a brief loading state to mask remount.
- **Risk / Impact:** Low risk; dramatically improves recovery from GPU errors.

#### 3.2.2. `src/game/Dice3D.tsx:169` — Mutable `Euler` in React state
- **Severity:** High | **Category:** Bug | **Effort:** Tiny
- **Issue:** `targetRotation` is stored as a `THREE.Euler` instance in `useState`. Euler is mutable; React's state comparison may miss changes or desynchronize.
- **Proposed Fix:** Store rotation as plain numbers (`{ x, y, z }`) or a tuple and construct a temporary `Euler` inside `useFrame`.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Fixes subtle animation desync bugs.

#### 3.2.3. `src/game/GameCameraControls.tsx:289-291` — `Math.random()` inside `useFrame`
- **Severity:** High | **Category:** Design / Performance | **Effort:** Tiny
- **Issue:** Camera shake uses `Math.random()` every frame. Non-deterministic, untestable, and can produce stuttery spikes.
- **Proposed Fix:** Replace with a deterministic noise function or precomputed shake table indexed by frame/time.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Smoother camera shake; reproducible behavior.

#### 3.2.4. `src/components/game/SoundToggle.tsx:10` — Excessive re-renders
- **Severity:** High | **Category:** Performance | **Effort:** Tiny
- **Issue:** `const { audioEnabled, setAudioEnabled } = useGameStore();` subscribes to the **entire** store. Re-renders on any state change.
- **Proposed Fix:** Use selectors: `useGameStore(s => s.audioEnabled)` and `useGameStore(s => s.setAudioEnabled)`.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Reduces re-render noise across the app.

#### 3.2.5. `src/components/ui/PWAPrompt.tsx:27-30` — SSR crash risk
- **Severity:** High | **Category:** Bug | **Effort:** Tiny
- **Issue:** Accesses `window.matchMedia`, `window.navigator`, and `document.referrer` without `typeof window !== 'undefined'` guards.
- **Proposed Fix:** Wrap all `window`/`document` accesses in environment checks.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents crashes during static generation or SSR.

#### 3.2.6. `src/services/audio/audioManager.ts:24-37` — `play` does not guard against `load` failures
- **Severity:** High | **Category:** Bug | **Effort:** Tiny
- **Issue:** `this.load(soundId)` is outside the `try/catch`. If `createAudioPlayer` throws, the rejection propagates uncaught.
- **Proposed Fix:** Wrap `const player = this.load(soundId)` in the existing `try/catch` with telemetry logging.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents crashes from missing/corrupted audio assets.

#### 3.2.7. `src/game/state/selectors.ts:3-13` — `selectGameProgress` breaks referential equality
- **Severity:** High | **Category:** Performance | **Effort:** Tiny
- **Issue:** Returns a fresh object literal on every call, causing subscribers to re-render even when data is unchanged.
- **Proposed Fix:** Use `shallow` equality from Zustand, or split into three primitive selectors.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Eliminates unnecessary React re-renders.

#### 3.2.8. `src/game/state/gameState.ts:416-444` — `openTilePreview` discards queued effects
- **Severity:** High | **Category:** Bug | **Effort:** Tiny
- **Issue:** Unconditionally sets `pendingEffect: null`. If a player previews a different tile before dismissing a modal, the pending effect is lost.
- **Proposed Fix:** Only clear `pendingEffect` if there is no active pending effect, or block preview when `pendingEffect` is set.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents accidental loss of tile bonuses/penalties.

---

### 3.3 Medium Severity

#### 3.3.1. `src/game/GameCameraControls.tsx:306-312` — `controls.update()` errors swallowed
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** A `try/catch` suppresses all errors. Invalid OrbitControls state gives no production telemetry.
- **Proposed Fix:** Log with `console.error` or telemetry before applying the safe fallback.
- **Dependencies / Trade-offs:** None.

#### 3.3.2. `src/game/renderQuality.ts:61-64` — FPS window `push`/`shift` GC pressure
- **Severity:** Medium | **Category:** Performance | **Effort:** Tiny
- **Issue:** `fpsWindowRef.current.push(fps)` followed by `.shift()` runs at frame rate, creating GC pressure.
- **Proposed Fix:** Use a fixed-size circular buffer with a write index.
- **Dependencies / Trade-offs:** None.

#### 3.3.3. `src/game/BlobShadow.tsx:95` — Unconditional `uTime` uniform update
- **Severity:** Medium | **Category:** Performance | **Effort:** Tiny
- **Issue:** `useFrame` writes `material.uniforms.uTime.value` even when `animated` is `false`.
- **Proposed Fix:** Guard with `if (animated && material.uniforms) { ... }`.
- **Dependencies / Trade-offs:** None.

#### 3.3.4. `src/game/GameScene.tsx:127` — Inline object for `camera` prop
- **Severity:** Low | **Category:** Performance | **Effort:** Tiny
- **Issue:** `camera={{ position: [0, 8, -10], ... }}` creates a new object every render.
- **Proposed Fix:** Move camera config to module scope or memoize it.
- **Dependencies / Trade-offs:** None.

#### 3.3.5. `src/components/game/GamePlayingHUD.tsx:542` — Inline `toLocaleTimeString`
- **Severity:** Medium | **Category:** Performance | **Effort:** Tiny
- **Issue:** Each history entry formats its timestamp on every render. Wastes CPU with many entries.
- **Proposed Fix:** Pre-format timestamps when appending, or memoize per entry.
- **Dependencies / Trade-offs:** None.

#### 3.3.6. `src/components/game/DiceMenu.tsx:102` — Missing accessibility label
- **Severity:** Medium | **Category:** Accessibility | **Effort:** Tiny
- **Issue:** The dice roll `AnimatedButton` has no `accessibilityLabel`.
- **Proposed Fix:** Add `accessibilityLabel="Rolar dado"`.
- **Dependencies / Trade-offs:** None.

#### 3.3.7. `src/components/game/ZoomControls.tsx:34,47` — Missing accessibility labels
- **Severity:** Medium | **Category:** Accessibility | **Effort:** Tiny
- **Issue:** Zoom in/out buttons have no labels.
- **Proposed Fix:** Add `accessibilityLabel="Aumentar zoom"` / `"Diminuir zoom"`.
- **Dependencies / Trade-offs:** None.

#### 3.3.8. `src/components/game/QuizModal.tsx:406` — Duplicate key risk
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Uses `key={link.url}`. Collisions if two questions share a source URL.
- **Proposed Fix:** Use `key={`${link.url}-${index}`}`.
- **Dependencies / Trade-offs:** None.

#### 3.3.9. `src/components/game/GamePlayingHUD.tsx:477` — Inline no-op function
- **Severity:** Medium | **Category:** Performance | **Effort:** Tiny
- **Issue:** `onPress={onCharacterPress ?? (() => {})}` creates a new function every render.
- **Proposed Fix:** Use a stable no-op: `const noop = useCallback(() => {}, []);`.
- **Dependencies / Trade-offs:** None.

#### 3.3.10. `src/components/game/CustomizationModal.tsx:290-313` — Draft state reset on external change
- **Severity:** Medium | **Category:** Bug / Usability | **Effort:** Tiny
- **Issue:** `useEffect` resets `draftPlayerName` when `playerName` changes, overwriting in-progress edits.
- **Proposed Fix:** Only reset when `showCustomization` transitions from false to true.
- **Dependencies / Trade-offs:** None.

#### 3.3.11. `src/components/game/HelpCenterModal.tsx:119` — Incomplete safe-area coverage
- **Severity:** Medium | **Category:** Design / Usability | **Effort:** Tiny
- **Issue:** `SafeAreaView edges={['bottom']}` ignores top notch on iOS.
- **Proposed Fix:** Use `edges={['top', 'bottom']}` or omit `edges`.
- **Dependencies / Trade-offs:** None.

#### 3.3.12. `src/components/game/QuizTimer.tsx:35-37` — Inefficient ref update pattern
- **Severity:** Low | **Category:** Performance | **Effort:** Tiny
- **Issue:** A separate `useEffect` updates `onTimeoutRef.current` after every render.
- **Proposed Fix:** Assign directly in render or before interval setup.
- **Dependencies / Trade-offs:** None.

#### 3.3.13. `src/components/game/MessageToast.tsx:22` — Inline function in render
- **Severity:** Low | **Category:** Performance | **Effort:** Tiny
- **Issue:** `getMessageStyle` is defined inside the component on every render.
- **Proposed Fix:** Move to module scope or memoize.
- **Dependencies / Trade-offs:** None.

#### 3.3.14. `src/components/game/TileFocusBanner.tsx:166` — Hardcoded top margin ignores safe area
- **Severity:** Low | **Category:** Design / Usability | **Effort:** Tiny
- **Issue:** `marginTop: Platform.OS === "web" ? 2 : 25` doesn't account for iOS notch.
- **Proposed Fix:** Use `useSafeAreaInsets().top` plus a small constant.
- **Dependencies / Trade-offs:** None.

#### 3.3.15. `src/game/state/gameState.ts:780-802` — Double `set` call in `dismissQuizFeedback`
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Calls `set()` then immediately calls `dismissEducationalModal()` which calls `set()` again. Transient flicker.
- **Proposed Fix:** Compute final state and call `set` once.
- **Dependencies / Trade-offs:** None.

#### 3.3.16. `src/game/state/gameState.ts:928-933` — `syncQueue` drops settings/profile items
- **Severity:** Medium | **Category:** Design | **Effort:** Tiny
- **Issue:** `flushSyncQueue` only handles `type === 'progress'`. Other types are silently skipped.
- **Proposed Fix:** Implement branches for `settings` and `profile`, or remove those types from `SyncQueueInput`.
- **Dependencies / Trade-offs:** None.

#### 3.3.17. `src/game/state/gameState.ts:945-947` — Module-level side effect on import
- **Severity:** Low | **Category:** Design | **Effort:** Tiny
- **Issue:** `void useGameStore.getState().hydrateFromPersistence()` runs on module evaluation.
- **Proposed Fix:** Move to an explicit `initializeGameStore()` called from app entry. Use `__DEV__` instead of `process.env.NODE_ENV`.
- **Dependencies / Trade-offs:** Requires touching app entry point.

#### 3.3.18. `src/game/state/boardLayout.ts:60-79` — Silent tile overflow
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `FIXED_PATH_COORDS` is capped at 58. Extra tiles default to `{0,0}` with no warning.
- **Proposed Fix:** Throw or `console.error` when `tiles.length > FIXED_PATH_COORDS.length`.
- **Dependencies / Trade-offs:** None.

#### 3.3.19. `src/domain/game/turnResolver.ts:188` — Non-null assertion on empty tiles
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `params.tiles[...]!` assumes non-empty array. Runtime crash if empty.
- **Proposed Fix:** Add guard: `if (!params.tiles.length) throw new Error(...)`.
- **Dependencies / Trade-offs:** None.

#### 3.3.20. `src/domain/game/turnResolver.ts:196` — Loose truthy check for effect type
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** `landing.effect.advance ? 'advance' : 'retreat'` treats `0` as retreat.
- **Proposed Fix:** Use `typeof landing.effect.advance === 'number'`.
- **Dependencies / Trade-offs:** None.

#### 3.3.21. `src/domain/game/types.ts:3-7` — Open index signature on `TileEffect`
- **Severity:** Low | **Category:** Type Safety | **Effort:** Tiny
- **Issue:** `[key: string]: unknown` allows malformed effects to pass TypeScript.
- **Proposed Fix:** Remove index signature or use a discriminated union.
- **Dependencies / Trade-offs:** May require updating test fixtures.

#### 3.3.22. `src/game/state/selectors.ts:15-17` — `selectCurrentTile` can return `undefined`
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** Fallback to `playerIndex` may still yield `undefined` if path is empty.
- **Proposed Fix:** Add guard and return `Tile | null`.
- **Dependencies / Trade-offs:** Callers need null-checks.

#### 3.3.23. `src/services/multiplayer/runtimeStore.ts:684-688` — Client clock skew for quiz deadlines
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `Date.now()` is client-local. Users can change device clock to cheat deadlines.
- **Proposed Fix:** Remove client-side gate and rely on server validation with friendly error messages.
- **Dependencies / Trade-offs:** None.

#### 3.3.24. `convex/rooms.ts:2416-2447` — Unbounded `.collect()` in cleanup
- **Severity:** Medium | **Category:** Performance / Bug | **Effort:** Tiny
- **Issue:** `cleanupInactiveRooms` calls `.collect()` on potentially thousands of rooms.
- **Proposed Fix:** Use `.take(100)` in a loop.
- **Dependencies / Trade-offs:** None.

#### 3.3.25. `convex/rooms.ts:75-81` — `sanitizeRoomCode` silently mutates input
- **Severity:** Low | **Category:** Usability | **Effort:** Tiny
- **Issue:** Strips invalid chars without feedback. Users don't realize their input was changed.
- **Proposed Fix:** Return validation error instead of silently mutating.
- **Dependencies / Trade-offs:** None.

#### 3.3.26. `src/services/multiplayer/runtimeStore.ts:562-617` — Silent `turnId` mismatch drop
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Late `quiz_started` events for stale turns are dropped without logging.
- **Proposed Fix:** Log warning or increment `syncErrorCount`; trigger full re-sync if threshold exceeded.
- **Dependencies / Trade-offs:** None.

#### 3.3.27. `convex/rooms.ts:1605-1738` — Host not re-validated fresh in `startGame`
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Host check uses stale player doc; room doc may have reassigned host.
- **Proposed Fix:** Re-fetch room doc after resolving player and check against fresh data.
- **Dependencies / Trade-offs:** None.

#### 3.3.28. `convex/rooms.ts:2017-2104` — `submitQuizAnswer` idempotency unclear
- **Severity:** Medium | **Category:** Race Condition | **Effort:** Tiny
- **Issue:** Two simultaneous final submissions can both call `resolveQuizRoundCore`. Guard exists but is undocumented.
- **Proposed Fix:** Add a comment explaining the idempotency guard.
- **Dependencies / Trade-offs:** None.

#### 3.3.29. `src/services/multiplayer/runtimeStore.ts:379-445` — Stale deferred effect state on reconnect
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Does not reset `pendingEffectActorId` when server phase moves away from `awaiting_ack`.
- **Proposed Fix:** Explicitly clear deferred fields when phase mismatch detected.
- **Dependencies / Trade-offs:** None.

#### 3.3.30. `app.json:5` + `eas.json:4` — Hardcoded version vs remote version source conflict
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `eas.json` sets `appVersionSource: "remote"` but `app.json` hardcodes version.
- **Proposed Fix:** Set `app.json` version to a placeholder or remove it.
- **Dependencies / Trade-offs:** None.

#### 3.3.31. `.eas/workflows/create-development-builds.yml` — Lacks trigger
- **Severity:** Medium | **Category:** Design | **Effort:** Tiny
- **Issue:** No `on:` event; only manual dispatch.
- **Proposed Fix:** Add `on: push: branches: ['main']` or `workflow_dispatch` to document intent.
- **Dependencies / Trade-offs:** None.

#### 3.3.32. `.eas/workflows/create-draft.yml:4-5` — Deploys every branch
- **Severity:** Medium | **Category:** Design | **Effort:** Tiny
- **Issue:** `on: push: branches: ['*']` triggers on every push, wasting build minutes.
- **Proposed Fix:** Restrict to `['main', 'develop']`.
- **Dependencies / Trade-offs:** None.

#### 3.3.33. `jest.setup.ts:2` — Mock state leaks between tests
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `mockMemoryStore` is module-level and never cleared.
- **Proposed Fix:** Add `beforeEach(() => mockMemoryStore.clear());`.
- **Dependencies / Trade-offs:** None.

#### 3.3.34. `playwright.config.ts:13` — Reuses existing server dangerously
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `reuseExistingServer: true` can test stale code if port is occupied.
- **Proposed Fix:** Set to `!process.env.CI`.
- **Dependencies / Trade-offs:** None.

#### 3.3.35. `workbox-config.js` — Missing `navigationFallback`
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** SPA direct navigation to `/explore` 404s offline.
- **Proposed Fix:** Add `navigationFallback: '/index.html'`.
- **Dependencies / Trade-offs:** None.

#### 3.3.36. `public/register-sw.js:9-10` — Silently swallows SW errors
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** `catch` block suppresses all service worker registration errors.
- **Proposed Fix:** Log with `console.error` or telemetry.
- **Dependencies / Trade-offs:** None.

#### 3.3.37. `package.json` — Dual package manager overrides
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Both `resolutions` (Yarn) and `overrides` (npm) defined. Confusing for Bun.
- **Proposed Fix:** Remove `resolutions` if Bun/npm is canonical.
- **Dependencies / Trade-offs:** None.

#### 3.3.38. `package.json:32` — `@types/three` in `dependencies`
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** Type-only package bloats production builds.
- **Proposed Fix:** Move to `devDependencies`.
- **Dependencies / Trade-offs:** None.

#### 3.3.39. `package.json:59` — `react-native-svg` uses `^`
- **Severity:** Low | **Category:** Usability | **Effort:** Tiny
- **Issue:** Inconsistent with Expo's `~` strategy.
- **Proposed Fix:** Change to `~15.12.1`.
- **Dependencies / Trade-offs:** None.

#### 3.3.40. `package.json` — Missing `@types/react-native`
- **Severity:** Medium | **Category:** Bug | **Effort:** Tiny
- **Issue:** Some third-party libraries may expect standalone types.
- **Proposed Fix:** Add to `devDependencies` or verify bundled types suffice.
- **Dependencies / Trade-offs:** None.

#### 3.3.41. `tsconfig.json:5-9` — Missing `baseUrl`
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** `paths` resolution may fail in some TypeScript contexts.
- **Proposed Fix:** Add `"baseUrl": "."`.
- **Dependencies / Trade-offs:** None.

#### 3.3.42. `eas.json` — Missing cache configuration
- **Severity:** Low | **Category:** Performance | **Effort:** Tiny
- **Issue:** No `cache` blocks; slower EAS builds.
- **Proposed Fix:** Add cache for `node_modules`, lockfiles, CocoaPods.
- **Dependencies / Trade-offs:** None.

#### 3.3.43. `package.json:12` — `build:web` doesn't clean `dist`
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** Old assets accumulate and bloat deployment.
- **Proposed Fix:** Prepend `rm -rf dist &&`.
- **Dependencies / Trade-offs:** Use `rimraf` for Windows compatibility if needed.

#### 3.3.44. `package.json:19` — `verify` script mixes package managers
- **Severity:** Low | **Category:** Usability | **Effort:** Tiny
- **Issue:** Uses `npx` and `npm run` while other scripts use `bunx`.
- **Proposed Fix:** Standardize on `bunx` and `bun run`.
- **Dependencies / Trade-offs:** None.

#### 3.3.45. `scripts/generate-quiz-report.ts` — Not in `package.json`
- **Severity:** Low | **Category:** Usability | **Effort:** Tiny
- **Issue:** Script exists but is not exposed.
- **Proposed Fix:** Add `"report:quiz": "tsx scripts/generate-quiz-report.ts"`.
- **Dependencies / Trade-offs:** Document Chrome dependency.

#### 3.3.46. `eslint.config.js:8` — Ignores pattern too narrow
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** `'dist/*'` misses nested files. Also missing `.expo/`, `node_modules/`, `coverage/`.
- **Proposed Fix:** Use `'dist/**'` and add standard ignores.
- **Dependencies / Trade-offs:** None.

#### 3.3.47. `package.json` — Missing `engines` / `packageManager`
- **Severity:** Low | **Category:** Usability | **Effort:** Tiny
- **Issue:** Contributors may use incompatible Node/Bun versions.
- **Proposed Fix:** Add `"engines": { "node": ">=20.0.0", "bun": ">=1.0.0" }`.
- **Dependencies / Trade-offs:** None.

#### 3.3.48. `src/styles/theme.ts:62-90` — Android `elevation: 0`
- **Severity:** Low | **Category:** Design | **Effort:** Tiny
- **Issue:** Android gets no shadow while iOS has shadows.
- **Proposed Fix:** Set `elevation` values matching shadow depth.
- **Dependencies / Trade-offs:** None.

#### 3.3.49. `src/components/ui/AppIcon.tsx:8` — Weak icon name typing
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** `name: FontAwesomeName | string` reduces to `string`.
- **Proposed Fix:** Remove `| string`.
- **Dependencies / Trade-offs:** May require updating union when adding icons.

#### 3.3.50. `src/components/game/GamePlayingHUD.tsx:194,231` — Mutable ref as React key
- **Severity:** Low | **Category:** Bug | **Effort:** Tiny
- **Issue:** `historyCounter.current++` resets on remount, producing duplicate keys.
- **Proposed Fix:** Use `Date.now()` or UUID at entry creation.
- **Dependencies / Trade-offs:** None.

#### 3.3.51. `convex/schema.ts:33` — `characterClaims` untyped
- **Severity:** Low | **Category:** Design | **Effort:** Tiny
- **Issue:** `v.optional(v.any())` bypasses Convex validation.
- **Proposed Fix:** Use `v.record(v.string(), v.id('roomPlayers'))`.
- **Dependencies / Trade-offs:** May require migration.

---

### 3.4 Low Severity

#### 3.4.1. `public/manifest.json` — Missing rich install metadata
- **Severity:** Low | **Category:** Usability | **Effort:** Tiny
- **Issue:** Missing `screenshots`, `categories`, `id`.
- **Proposed Fix:** Add fields for richer PWA install experience.
- **Dependencies / Trade-offs:** Requires screenshot assets.

---

<!-- END_TINY_SECTION -->

## 4. Small Effort Fixes (15–60 min)

### 4.1 Critical Severity

#### 4.1.1. `src/game/renderQuality.ts:48-107` — Zustand state update inside R3F `useFrame`
- **Severity:** Critical | **Category:** Bug / Performance | **Effort:** Small
- **Issue:** `useAdaptiveRenderQuality` calls `setRenderQuality()` (Zustand setter) directly inside `useFrame`. Violates R3F execution model; can trigger concurrent-render warnings or context-loss instability.
- **Proposed Fix:** Read/write FPS data via refs in `useFrame`. Trigger `setRenderQuality` from a `useEffect` polling the ref at most once per cooldown interval (e.g., 250 ms).
- **Dependencies / Trade-offs:** May introduce slight delay (≤250 ms) in quality downgrade during thermal throttle.
- **Risk / Impact:** High reward; prevents frame-loop recursion and GPU instability.

#### 4.1.2. `src/game/PlayerTokenActor.tsx:257-262` — Stale `landingImpact` prop prevents VFX
- **Severity:** Critical | **Category:** Bug | **Effort:** Small
- **Issue:** `landingImpactRef.current` is read during React render and passed as a primitive prop to `CharacterEffects`. Since `useFrame` doesn't trigger re-renders, dust burst and impact effects fail to trigger reliably.
- **Proposed Fix:** Pass the `landingImpactRef` itself to `CharacterEffects` and read `.current` inside its `useFrame`.
- **Dependencies / Trade-offs:** Ref coupling is less idiomatic but correct for R3F frame-synced data.
- **Risk / Impact:** Fixes missing visual feedback on movement completion.

#### 4.1.3. `src/game/state/gameState.ts:281-296, 867-875, 563-571` — Soft-lock after crash
- **Severity:** Critical | **Category:** Bug | **Effort:** Small
- **Issue:** `saveProgress` persists `pendingEffect`, but `showEducationalModal` is **not** persisted. On restart, a pending effect exists with no way to dismiss it, and `rollDice` blocks forever.
- **Proposed Fix:** In `hydrateFromPersistence`, auto-set `showEducationalModal: true` and `currentTileContent` from the tile at `playerIndex`, or stop persisting `pendingEffect` until a dismiss guarantee exists.
- **Dependencies / Trade-offs:** Option 1 (auto-show) is safest but requires recomputing content during hydration.
- **Risk / Impact:** Prevents players from being permanently stuck.

#### 4.1.4. `src/game/state/gameState.ts:283-284, 867-870, 563-571` — Crash during movement causes teleportation on resume
- **Severity:** Critical | **Category:** Bug | **Effort:** Small
- **Issue:** `playerIndex` and `targetIndex` are persisted, but `isMoving` is not. If app is killed mid-movement, player resumes at old `playerIndex` while `targetIndex` points ahead, causing a visual teleport backward.
- **Proposed Fix:** Reconcile during hydration by snapping `playerIndex = targetIndex` if movement was interrupted, or persist `isMoving` and re-trigger `finishMovement`.
- **Dependencies / Trade-offs:** Reconciliation is simpler and safer than resuming animations from an arbitrary frame.
- **Risk / Impact:** Fixes jarring resume behavior.

---

### 4.2 High Severity

#### 4.2.1. `src/utils/webgl.ts:2-4` — WebGL availability no-op on native
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** Returns `true` immediately when `typeof document === 'undefined'` (iOS/Android). Never validates whether `expo-gl` can create a context.
- **Proposed Fix:** On native, attempt to create an `expo-gl` context inside `try/catch`. Cache the outcome.
- **Dependencies / Trade-offs:** Adds small synchronous context-creation cost on app start.
- **Risk / Impact:** Prevents crashes on devices with broken GL drivers.

#### 4.2.2. `src/game/GameCameraControls.tsx:140-146` — Touch end re-enables controls mid-gesture
- **Severity:** High | **Category:** Usability | **Effort:** Small
- **Issue:** Lifting one finger of a two-finger gesture sees `event.touches.length <= 1` and re-enables controls immediately, causing a jarring UX jump.
- **Proposed Fix:** Add a 150–200 ms grace period, or wait for `touches.length === 0`, before re-enabling controls.
- **Dependencies / Trade-offs:** Slightly delays control restoration but eliminates mid-gesture mode switching.
- **Risk / Impact:** Major camera interaction polish improvement.

#### 4.2.3. `src/game/Dice3D.tsx:41-48` — `CanvasTexture` never disposed
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** `ResultPopupWeb` creates a `CanvasTexture` in `useMemo` without `texture.dispose()`. Leaks GPU memory on each mount/remount.
- **Proposed Fix:** Store texture in a ref and dispose in `useEffect` cleanup.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents GPU memory exhaustion during long sessions.

#### 4.2.4. `src/components/game/QuizTimer.tsx:66` — Layout-thrashing progress animation
- **Severity:** High | **Category:** Performance | **Effort:** Small
- **Issue:** `Animated.timing(progressAnim, { useNativeDriver: false })` animates `width`, forcing JS-thread layout recalculation every frame.
- **Proposed Fix:** Use `scaleX` transform with `useNativeDriver: true` from a fixed-width container, or migrate to `react-native-reanimated`.
- **Dependencies / Trade-offs:** Reanimated may increase bundle if not already used in this component.
- **Risk / Impact:** Smooths timer animation on low-end devices.

#### 4.2.5. `src/components/game/TileFocusBanner.tsx:70` — Layout-thrashing progress animation
- **Severity:** High | **Category:** Performance | **Effort:** Small
- **Issue:** Same as QuizTimer: `useNativeDriver: false` for `width` interpolation.
- **Proposed Fix:** Use transform-based animation (scaleX) or migrate to reanimated.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Smooths banner animation.

#### 4.2.6. `src/components/game/CustomizationModal.tsx:315-329` — Back button forces save with no cancel
- **Severity:** High | **Category:** Usability | **Effort:** Small
- **Issue:** Android hardware back press calls `handleSave()`, committing all draft changes. No discard option.
- **Proposed Fix:** Add a Cancel/Discard button and make back button dismiss without saving. Maintain draft state locally until explicit save.
- **Dependencies / Trade-offs:** Requires adding a secondary action button.
- **Risk / Impact:** Prevents accidental overwrites.

#### 4.2.7. `src/components/game/HelpCenterModal.tsx:48-94` — Fragile manual mount/unmount
- **Severity:** High | **Category:** Bug / Usability | **Effort:** Small
- **Issue:** Maintains its own `mounted` state and `mountedRef`, duplicating `Modal` lifecycle. Can become unresponsive to hardware back button if exit animation is interrupted.
- **Proposed Fix:** Remove manual mounting. Let `Modal visible={showHelpCenter}` handle show/hide natively.
- **Dependencies / Trade-offs:** May require adjusting animation timing.
- **Risk / Impact:** Simplifies code and fixes back-button reliability.

#### 4.2.8. `src/components/game/EducationalModal.tsx:241` — Abrupt null return
- **Severity:** High | **Category:** Usability | **Effort:** Small
- **Issue:** If content is missing, returns `null`, causing the modal to vanish instantly without close animation.
- **Proposed Fix:** Render a loading/error state inside the Modal. Only set `modalVisible` true after content is resolved.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Eliminates jarring modal disappearance.

#### 4.2.9. `src/components/game/CelebrationOverlay.tsx:212` — No focus trap or scroll lock
- **Severity:** High | **Category:** Accessibility / Usability | **Effort:** Small
- **Issue:** Absolute `View` overlay; background elements remain interactive to screen readers and touch.
- **Proposed Fix:** Wrap in `Modal` with `transparent`, or add `pointerEvents="none"` to background during visibility.
- **Dependencies / Trade-offs:** May require z-index adjustments for confetti.
- **Risk / Impact:** Prevents accidental interactions underneath celebration.

#### 4.2.10. `src/components/game/StartSequenceOverlay.tsx:259` — No focus trap or scroll lock
- **Severity:** High | **Category:** Accessibility / Usability | **Effort:** Small
- **Issue:** Same as CelebrationOverlay: absolute overlay without Modal.
- **Proposed Fix:** Use `Modal` or `pointerEvents="none"` on game layer.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents accidental interactions during start sequence.

#### 4.2.11. `src/game/state/gameState.ts:840-912` — Hydration has no error boundary
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** `await Promise.all([settings, progress, profile])` without `try/catch`. If any repo throws, `isHydrated` never becomes true and the app hangs.
- **Proposed Fix:** Wrap in `try/catch`. Set `isHydrated: true`, log error, fall back to defaults. Hydrate repositories individually.
- **Dependencies / Trade-offs:** Requires basic telemetry for production observability.
- **Risk / Impact:** Prevents total app bricking from one corrupted storage entry.

#### 4.2.12. `src/game/state/gameState.ts:281-296` — `saveProgress` violates `GameProgress` type
- **Severity:** High | **Category:** Type Safety | **Effort:** Small
- **Issue:** Local `progress` object includes fields not in `GameProgress` type (`pendingEffect`, `quizPhase`, etc.). Persistence layer may drop them or fail validation.
- **Proposed Fix:** Introduce `HydratedGameProgress` extending `GameProgress`, or store quiz fields under a separate key.
- **Dependencies / Trade-offs:** Requires updating persistence interface.
- **Risk / Impact:** Prevents data loss when swapping storage backends.

#### 4.2.13. `src/game/state/gameState.ts:918-937` — `flushSyncQueue` unguarded against partial failure
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** Loop `await pushProgress(...)` has no error handling. If one item throws, remaining items are skipped and `syncQueue` is never cleared. Duplicates resent on next flush.
- **Proposed Fix:** Process individually inside `try/catch`, tracking successfully-pushed IDs. Update queue after each attempt.
- **Dependencies / Trade-offs:** Requires stable `SyncQueueItem.id` for deduplication.
- **Risk / Impact:** Prevents sync storms and data duplication.

#### 4.2.14. `src/services/audio/audioManager.ts:20-22` — `setEnabled` does not stop playing sounds
- **Severity:** High | **Category:** Usability | **Effort:** Small
- **Issue:** Toggling audio off sets `enabled = false` but currently-playing sounds continue.
- **Proposed Fix:** When disabled, iterate `loaded.values()` and call `player.pause()` (or volume 0 if supported).
- **Dependencies / Trade-offs:** Verify `expo-audio` volume API before implementing.
- **Risk / Impact:** Meets user expectation of immediate muting.

#### 4.2.15. `src/services/sync/adapters.ts:14-23` — Anonymous device ID regenerates on cold start
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** `cachedDeviceId` is in-memory only. Every restart generates a new ID, orphaning historical progress when backend changes.
- **Proposed Fix:** Persist generated ID via `AsyncStorage`, `expo-secure-store`, or the existing KV repository.
- **Dependencies / Trade-offs:** Adds storage dependency; necessary for real sync.
- **Risk / Impact:** Ensures stable anonymous identity across sessions.

#### 4.2.16. `convex/rooms.ts:31, 110-116` — Weak room codes
- **Severity:** High | **Category:** Security / Design | **Effort:** Small
- **Issue:** 3-character codes from 24-letter alphabet (13,824 combinations). Brute-forceable; no rate limiting.
- **Proposed Fix:** Increase `ROOM_CODE_LENGTH` to 5–6 characters. Add rate limiting per identity.
- **Dependencies / Trade-offs:** May break UI that assumes 3-character codes.
- **Risk / Impact:** Prevents griefing via random room joining.

#### 4.2.17. `src/services/multiplayer/clientIdentity.ts:6-21` — Identity in unprotected local storage
- **Severity:** High | **Category:** Security / Bug | **Effort:** Small
- **Issue:** `clientId` stored in `expo-sqlite` / KV store without encryption or device binding.
- **Proposed Fix:** Use `expo-secure-store` (iOS Keychain / Android Keystore). Better: move to server-issued tokens.
- **Dependencies / Trade-offs:** Requires `expo-secure-store` installation.
- **Risk / Impact:** Reduces identity theft risk on rooted/shared devices.

#### 4.2.18. `app.json:62-64` — EAS Runtime Version blocks OTA
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** `runtimeVersion: { "policy": "appVersion" }` with `autoIncrement` disables OTA updates entirely.
- **Proposed Fix:** Switch to `"policy": "fingerprint"` to allow compatible OTA updates via `expo-updates`.
- **Dependencies / Trade-offs:** Test OTA behavior on a preview branch first.
- **Risk / Impact:** Enables rapid bug-fix delivery without store review.

#### 4.2.19. `eas.json:44-46` — Missing submit configuration
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** `submit.production: {}` is empty. EAS Submit will fail or require manual input.
- **Proposed Fix:** Populate `ascAppId` (iOS) and `track` + `serviceAccountKeyPath` (Android).
- **Dependencies / Trade-offs:** Requires App Store Connect and Google Play credentials.
- **Risk / Impact:** Unblocks automated store submissions.

#### 4.2.20. `package.json:67,75` — Playwright severely outdated
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** Playwright `^1.58.2` is from mid-2023. Security vulnerabilities and outdated browser binaries.
- **Proposed Fix:** Upgrade to `^1.49.0` (latest stable) and regenerate snapshots.
- **Dependencies / Trade-offs:** May require snapshot updates and minor API adjustments.
- **Risk / Impact:** Ensures E2E tests reflect modern browsers.

#### 4.2.21. `.eas/workflows/deploy-to-production.yml` — No pre-deployment checks
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** Triggers build/submit on `push: main` without running tests, lint, or typecheck.
- **Proposed Fix:** Add a `test` job running `npm run verify` and gate build jobs behind it.
- **Dependencies / Trade-offs:** Slightly increases workflow duration but catches broken code before stores.
- **Risk / Impact:** Prevents shipping broken builds to production.

---

### 4.3 Medium Severity

#### 4.3.1. `src/game/GameScene.tsx:16-19` — No loading state for 3D assets
- **Severity:** Medium | **Category:** Usability | **Effort:** Small
- **Issue:** `LoadingFallback` returns `null`. User sees empty Canvas during asset load.
- **Proposed Fix:** Render a lightweight 2D/React-Native loading indicator outside the Canvas, or a simple Three.js placeholder inside.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Improves perceived performance on slow networks.

#### 4.3.2. `src/game/Board.tsx:258-295` — `useLayoutEffect` recreates all tile colors
- **Severity:** Medium | **Category:** Performance | **Effort:** Small
- **Issue:** Iterates entire path and calls `setColorAt` for every tile whenever `path` changes. O(n) blocking work on main thread.
- **Proposed Fix:** Only call `setColorAt` for tiles whose color actually changed. Memoize `Float32Array` for `instanceColor` if path is immutable.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Reduces layout-phase jank.

#### 4.3.3. `src/game/CharacterEffects.tsx:137-141` — Burst material color mutated in `useFrame`
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** `burstRef.current.material.color.set(burstColor)` mutates shared material. In multiplayer, two players landing on different-colored tiles in the same frame causes flicker.
- **Proposed Fix:** Use per-instance colors (`setColorAt` on `InstancedMesh`) or separate burst materials per actor.
- **Dependencies / Trade-offs:** Slightly higher memory with separate materials.
- **Risk / Impact:** Fixes visual race condition in multiplayer.

#### 4.3.4. `src/game/Board.tsx:110-155` — Dice pips use 21 separate meshes
- **Severity:** Low | **Category:** Performance | **Effort:** Small
- **Issue:** `Pips` renders 21 individual `<mesh>` nodes. Separate draw calls despite shared geometry/material.
- **Proposed Fix:** Replace with a single `<instancedMesh>` with 21 instances.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Reduces draw-call overhead.

#### 4.3.5. `src/game/Board.tsx:763-790` — Shared geometry disposal risk
- **Severity:** Low | **Category:** Bug | **Effort:** Small
- **Issue:** `IconInstances` receives a `geometry` prop attached to an `instancedMesh`. If one instance's mesh is disposed, shared geometry is disposed and others crash.
- **Proposed Fix:** Clone geometry per instance, or consolidate into a single `InstancedMesh` with merged geometry.
- **Dependencies / Trade-offs:** Low risk because they mount/unmount together, but clone is safer.
- **Risk / Impact:** Prevents rare crash on unmount.

#### 4.3.6. `src/game/Board.tsx:474-550` — Off-screen animation for markers
- **Severity:** Low | **Category:** Performance | **Effort:** Small
- **Issue:** `useFrame` animations run for start/end markers regardless of camera frustum visibility.
- **Proposed Fix:** Skip updates when outside camera frustum (cheap bounding-box check).
- **Dependencies / Trade-offs:** Minor savings for just two objects.
- **Risk / Impact:** Minimal; low priority.

#### 4.3.7. `src/game/GameCameraControls.tsx:293-299` — Camera shake doesn't restore pre-shake position
- **Severity:** Low | **Category:** Design | **Effort:** Small
- **Issue:** Shake offsets are added but never subtracted. Camera left at randomized offset after shake ends.
- **Proposed Fix:** Store pre-shake position/target and lerp back as intensity decays.
- **Dependencies / Trade-offs:** Slightly smoother post-shake settling.
- **Risk / Impact:** Minor visual polish.

#### 4.3.8. `src/components/game/MultiplayerOverlay.tsx:668-729` — Excessive `useMemo` on volatile data
- **Severity:** Medium | **Category:** Performance | **Effort:** Small
- **Issue:** Many `useMemo` hooks depend on `roomState` (Convex returns new ref every render). Memos recompute almost every frame, adding overhead.
- **Proposed Fix:** Memoize only expensive computations. For simple array maps/filters, `useMemo` overhead may exceed savings. Profile first.
- **Dependencies / Trade-offs:** Slight code simplification.
- **Risk / Impact:** Reduces unnecessary memo overhead.

#### 4.3.9. `src/components/game/Card3D.tsx:197` — Unsupported `transformOrigin` on native
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** `transformOrigin: "bottom" as any` is web-only CSS. Ignored on iOS/Android; may yellow-box.
- **Proposed Fix:** Remove property and adjust translateY/scale calculation to achieve same visual.
- **Dependencies / Trade-offs:** Requires tweaking press-down animation math.
- **Risk / Impact:** Eliminates yellow-box warnings and ensures cross-platform consistency.

#### 4.3.10. `src/game/state/gameState.ts:139-146, 271-278` — Module-level timer leaks
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** `pendingEffectTimeout` and `settingsSaveTimer` are module-level. On Fast Refresh or test re-evaluation, stale timers can fire and mutate the new store.
- **Proposed Fix:** Store timer refs in a weak-ref map keyed by store instance, or move into Zustand subscription/middleware.
- **Dependencies / Trade-offs:** Slightly more boilerplate.
- **Risk / Impact:** Prevents phantom updates in dev/tests.

#### 4.3.11. `src/domain/game/quizSelector.ts:22-23,31` — Non-deterministic question selection
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** `Math.random()` prevents deterministic multiplayer replay. Different clients may select different questions.
- **Proposed Fix:** Accept optional `rng: () => number` parameter (default `Math.random`) so multiplayer can inject seeded PRNG.
- **Dependencies / Trade-offs:** Requires multiplayer host to provide seed.
- **Risk / Impact:** Enables synchronized multiplayer quizzes.

#### 4.3.12. `src/services/audio/audioManager.ts:65-78` — `ensureMode` race condition
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** `modeConfigured = true` is set **before** `await setAudioModeAsync(...)`. A second `play()` interleave skips `ensureMode` before session is ready.
- **Proposed Fix:** Set flag only after promise resolves. Use a local promise reference to deduplicate concurrent calls.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Fixes intermittent audio playback failure.

#### 4.3.13. `src/services/audio/audioManager.ts` — No AppState handling
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** No reaction to app backgrounding/foregrounding. Can lead to silent playback after task-switching on Android.
- **Proposed Fix:** Subscribe to `AppState` changes. On foreground, re-call `ensureMode()` or reset `modeConfigured`.
- **Dependencies / Trade-offs:** Requires importing `react-native` `AppState`.
- **Risk / Impact:** Improves audio reliability across app lifecycle.

#### 4.3.14. `src/services/sync/adapters.ts:27-39` — Wall-clock time conflict resolution
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** `pushProgress` compares `new Date(payload.timestamp).getTime()`. Changing device clock backward discards newer items.
- **Proposed Fix:** Add a monotonic `seq` number to `SyncEnvelope`, incrementing per push. Prefer higher sequence over wall-clock.
- **Dependencies / Trade-offs:** Sequence numbers work for single-device; multi-device still needs server reconciliation.
- **Risk / Impact:** Prevents data loss from clock manipulation.

#### 4.3.15. `convex/rooms.ts:261-315` — `removeRoomData` stresses transactions
- **Severity:** Medium | **Category:** Performance / Bug | **Effort:** Small
- **Issue:** Batches deletes at 100 per table but `Promise.all` on 100 concurrent deletes can stress the transaction.
- **Proposed Fix:** Schedule recursive batched deletions via `ctx.scheduler.runAfter` to stay within limits.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents cron job timeouts during bulk cleanup.

#### 4.3.16. `convex/rooms.ts:2368-2406` — Presence heartbeat no client cleanup
- **Severity:** Medium | **Category:** Usability / Design | **Effort:** Small
- **Issue:** No explicit `leaveRoom` on app backgrounding or unmount. Stale "online" presence for up to 45s.
- **Proposed Fix:** Hook into React Native `AppState`. Send final `leaveRoom` or stop heartbeat on background.
- **Dependencies / Trade-offs:** Requires `AppState` API.
- **Risk / Impact:** Faster detection of disconnected players.

#### 4.3.17. `src/services/multiplayer/runtimeStore.ts:402-407` — Overly complex `quizActorArrived` logic
- **Severity:** Medium | **Category:** Bug / Design | **Effort:** Small
- **Issue:** Ternary chain with nested conditions is hard to reason about and likely to break on reconnect edge cases.
- **Proposed Fix:** Server should explicitly include `quizActorArrived` flag in snapshot payload.
- **Dependencies / Trade-offs:** Requires server snapshot shape change.
- **Risk / Impact:** Reduces reconnect bugs.

#### 4.3.18. `convex/rooms.ts:1387-1552` — Character claim race condition
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** Player-array scan is not transactional with room patch. `characterClaims` typed as `v.any()`.
- **Proposed Fix:** Rely solely on room-level `characterClaims` map. Change schema to `v.record(v.string(), v.id('roomPlayers'))`.
- **Dependencies / Trade-offs:** Requires schema migration.
- **Risk / Impact:** Fixes rare double-claim bugs.

#### 4.3.19. `convex/rooms.ts:1062-1105` — Room existence info leak
- **Severity:** Medium | **Category:** Security / Data Leak | **Effort:** Small
- **Issue:** Any caller with any `clientId` can query latest session and learn `roomId`/`roomCode`.
- **Proposed Fix:** Remove query or protect with Convex Auth. Derive lookup from authenticated identity.
- **Dependencies / Trade-offs:** Requires auth integration for full fix.
- **Risk / Impact:** Reduces information leakage.

#### 4.3.20. `convex/rooms.ts` — No timeout for `awaiting_roll`
- **Severity:** Medium | **Category:** Usability / Design | **Effort:** Small
- **Issue:** If a player never rolls, the game stalls indefinitely. Only `awaiting_ack` has a timeout.
- **Proposed Fix:** Add `TURN_ROLL_TIMEOUT_MS` (60–90s). Auto-roll or skip turn on expiry.
- **Dependencies / Trade-offs:** Requires client UX for countdown.
- **Risk / Impact:** Prevents griefing via idle players.

#### 4.3.21. `src/services/multiplayer/api.ts` — `anyApi` loses type safety
- **Severity:** Low | **Category:** Design | **Effort:** Small
- **Issue:** Uses `anyApi` for pre-setup compilation. Zero compile-time verification.
- **Proposed Fix:** Switch to generated typed API (`import { api } from '../../../convex/_generated/api'`).
- **Dependencies / Trade-offs:** Requires successful `convex dev` / `npx convex codegen` in CI.
- **Risk / Impact:** Catches API contract mismatches at build time.

#### 4.3.22. `src/services/multiplayer/convexClient.ts` — Singleton not reset on logout
- **Severity:** Low | **Category:** Design | **Effort:** Small
- **Issue:** Module-level singleton persists across Fast Refresh and URL changes. No disposal/re-creation path.
- **Proposed Fix:** Export `createConvexClient(url)` factory managed in a React context provider.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Improves dev-experience and dynamic environment support.

#### 4.3.23. `convex/quiz.ts:72-91` — Question selection reads 200 documents
- **Severity:** Low | **Category:** Performance | **Effort:** Small
- **Issue:** Fetches last 200 quiz rounds per room to build `usedQuestionIds`. O(N) reads.
- **Proposed Fix:** Maintain `usedQuestionIds` on the `rooms` document (or dedicated doc). Cap at 500 and reset when exceeded.
- **Dependencies / Trade-offs:** Requires denormalized data updates in `rollTurn`.
- **Risk / Impact:** Reduces query cost for long-running rooms.

#### 4.3.24. `convex/rooms.ts` — No host kick ability
- **Severity:** Low | **Category:** Usability / Design | **Effort:** Small
- **Issue:** Only way to remove a player is self-initiated `leaveRoom`.
- **Proposed Fix:** Add `kickPlayer` mutation callable only by host. Emit `player_kicked` event.
- **Dependencies / Trade-offs:** Requires UI for host kick button.
- **Risk / Impact:** Improves room management UX.

#### 4.3.25. `convex/rooms.ts` — Portuguese error messages, no i18n keys
- **Severity:** Low | **Category:** Usability | **Effort:** Small
- **Issue:** Raw Portuguese strings returned to client make localization difficult.
- **Proposed Fix:** Return structured error codes (e.g., `{ error: 'ROOM_NOT_FOUND' }`). Client maps to localized strings.
- **Dependencies / Trade-offs:** Requires client error-to-string mapping layer.
- **Risk / Impact:** Enables future localization.

#### 4.3.26. `eas.json` — Preview channel mismatch
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** `preview` profile uses `channel: "main"`, but production workflow publishes to `branch: "production"`.
- **Proposed Fix:** Create dedicated `staging`/`preview` branch and align profile.
- **Dependencies / Trade-offs:** Document branch strategy.
- **Risk / Impact:** Prevents preview testers receiving wrong updates.

#### 4.3.27. `eas.json` — No environment variables in profiles
- **Severity:** High | **Category:** Bug | **Effort:** Small
- **Issue:** No `env` fields. Production builds may use development defaults for Convex URL, analytics, etc.
- **Proposed Fix:** Add `env` blocks per profile:
  ```json
  "production": { "env": { "CONVEX_URL": "...", "ANALYTICS_KEY": "..." } }
  ```
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents misconfigured production builds.

#### 4.3.28. `app.json:18-21` — Android adaptive icon misconfiguration
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** `adaptiveIcon.foregroundImage` uses same opaque logo. Results in poor cropping on Android launchers.
- **Proposed Fix:** Create proper adaptive icon set (foreground with transparency + background color) following Android safe zone.
- **Dependencies / Trade-offs:** Requires design asset.
- **Risk / Impact:** Improves Android home screen appearance.

#### 4.3.29. `jest.setup.ts` — Missing native module mocks
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** Missing mocks for `expo-font`, `expo-linking`, `expo-constants`, `react-native-reanimated`, `expo-gl`, `expo-asset`, `expo-system-ui`.
- **Proposed Fix:** Add comprehensive mocks or use `jest-expo` presets.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Unblocks component/hook testing.

#### 4.3.30. `jest.config.js` — No code coverage configuration
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** No thresholds, collectors, or reporters. Cannot enforce minimum coverage.
- **Proposed Fix:** Add:
  ```js
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageThreshold: { global: { branches: 50, functions: 50, lines: 50, statements: 50 } }
  ```
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Enables coverage tracking and regression prevention.

#### 4.3.31. `public/manifest.json:18-29` — Manifest icon not maskable-safe
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** Same `logo192.png` used with `"purpose": "any maskable"`. Content will be cropped on Android adaptive shapes.
- **Proposed Fix:** Create dedicated maskable icons with safe-zone padding, or remove `maskable` until assets exist.
- **Dependencies / Trade-offs:** Requires design asset.
- **Risk / Impact:** Prevents broken install icons.

#### 4.3.32. `eslint.config.js` — Missing strict TypeScript rules
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** `eslint-config-expo/flat` is minimal. Missing `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`.
- **Proposed Fix:** Extend with `@typescript-eslint/recommended` and `react-hooks/recommended`.
- **Dependencies / Trade-offs:** May surface many existing lint errors; fix incrementally.
- **Risk / Impact:** Catches bugs at build time.

#### 4.3.33. `tsconfig.json:17-19` — Convex excluded from type checking
- **Severity:** Medium | **Category:** Design | **Effort:** Small
- **Issue:** `"exclude": ["convex"]` means shared frontend/backend type errors are not caught by `tsc --noEmit`.
- **Proposed Fix:** Create separate `tsc -p convex/tsconfig.json` command and add to `verify` script.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Catches cross-boundary type mismatches.

#### 4.3.34. `scripts/check-bundle-size.js` — Bundle check only covers JS
- **Severity:** Medium | **Category:** Performance | **Effort:** Small
- **Issue:** Only checks `.js` files. Ignores CSS, WASM, 3D models, total size.
- **Proposed Fix:** Expand to total `dist/` size and individual asset budgets. Consider `bundlesize` or `size-limit`.
- **Dependencies / Trade-offs:** None.
- **Risk / Impact:** Prevents PWA bloat from large assets.

#### 4.3.35. `public/` (HTML output) — No Content Security Policy
- **Severity:** Medium | **Category:** Security | **Effort:** Small
- **Issue:** Generated `dist/index.html` lacks CSP meta tag.
- **Proposed Fix:** Add `<meta http-equiv="Content-Security-Policy">` via Expo web config or custom `index.html`.
- **Dependencies / Trade-offs:** Must whitelist Convex API domain.
- **Risk / Impact:** Reduces XSS attack surface.

#### 4.3.36. `package.json` — React Native Worklets potential conflict
- **Severity:** Medium | **Category:** Bug | **Effort:** Small
- **Issue:** `react-native-worklets` explicitly installed, but `react-native-reanimated` bundles its own worklet runtime. Can cause "multiple worklet runtimes" errors.
- **Proposed Fix:** Remove `react-native-worklets` unless another library requires it. Verify with `expo doctor`.
- **Dependencies / Trade-offs:** Requires regression testing of animations.
- **Risk / Impact:** Prevents subtle animation bugs.

---

### 4.4 Low Severity

#### 4.4.1. `package.json:3` — 0BSD license on complex app
- **Severity:** Low | **Category:** Design | **Effort:** Small
- **Issue:** Extremely permissive license may not reflect actual licensing of proprietary assets/code.
- **Proposed Fix:** Review and select appropriate license (MIT, Apache-2.0, or proprietary).
- **Dependencies / Trade-offs:** Legal review recommended.
- **Risk / Impact:** Reduces liability exposure.

<!-- END_SMALL_SECTION -->

## 5. Medium Effort Projects (1–4 h)

### 5.1 High Severity

#### 5.1.1. `src/game/ScreenEffects.tsx:191-209` — Three full-screen shader passes per frame
- **Severity:** High | **Category:** Performance | **Effort:** Medium
- **Issue:** `AmbientGlow`, `WarmEdgeTint`, and `Vignette` are three separate full-screen quads. At `dpr: 1.6`, each pass is fill-rate expensive, consuming 10–20% of GPU time.
- **Proposed Fix:** Merge into a single `ShaderMaterial` with combined uniforms. One quad, one draw call.
- **Dependencies / Trade-offs:** Slightly more complex shader maintenance; large fill-rate savings.
- **Risk / Impact:** Significant thermal/FPS headroom improvement; moderate regression risk requires visual QA.

#### 5.1.2. `convex/rooms.ts:1107-1193, 1196-1385` — No rate limiting on room creation/joining
- **Severity:** High | **Category:** Security / Design | **Effort:** Medium
- **Issue:** `createRoom` and `joinRoom` have no rate limiting. Spam can exhaust storage and hit Convex transaction limits.
- **Proposed Fix:** Maintain per-client `rateLimits` table tracking sliding window. Reject if exceeding N rooms/joins per hour.
- **Dependencies / Trade-offs:** Requires schema addition and cron cleanup.
- **Risk / Impact:** Prevents abuse and unexpected costs.

#### 5.1.3. `src/services/multiplayer/convexClient.ts` — Zero resilience configuration
- **Severity:** High | **Category:** Usability / Design | **Effort:** Medium
- **Issue:** `ConvexReactClient` instantiated with URL only. No reconnection backoff, timeout, offline buffering, or connection-state exposure.
- **Proposed Fix:** Configure explicit options (`maxIdleTime`, `webSocketTimeout`), custom `fetch` with retry, subscribe to connection status, surface "Reconnecting…" UI.
- **Dependencies / Trade-offs:** Requires UI components for connection status and retry prompts.
- **Risk / Impact:** Critical for mobile network transitions (WiFi ↔ cellular, backgrounding).

#### 5.1.4. `src/services/multiplayer/api.ts`, `convexClient.ts` — No client-side network error handling
- **Severity:** High | **Category:** Usability / Bug | **Effort:** Medium
- **Issue:** No wrappers around Convex mutations. Network blips cause unhandled exceptions with raw Portuguese strings. No retry, timeout, or loading states.
- **Proposed Fix:** Create `useMultiplayerMutation` hook with exponential backoff (3 attempts), user-friendly error mapping, `isLoading`/`isError` states, and auto-resync on recovery.
- **Dependencies / Trade-offs:** Requires UI for error toasts and loading spinners.
- **Risk / Impact:** Dramatically improves multiplayer reliability on mobile networks.

#### 5.1.5. `workbox-config.js` — No runtime caching for API calls
- **Severity:** High | **Category:** Bug | **Effort:** Medium
- **Issue:** Only precaches static assets. No runtime caching for Convex API calls or CDN images. PWA is offline-broken for dynamic data.
- **Proposed Fix:** Add `runtimeCaching` rules:
  ```js
  runtimeCaching: [
    { urlPattern: /\/api\/.*/, handler: 'NetworkFirst', options: { cacheName: 'api-cache' } },
    { urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/, handler: 'CacheFirst', options: { cacheName: 'images' } }
  ]
  ```
- **Dependencies / Trade-offs:** Must understand Convex API URL patterns.
- **Risk / Impact:** Enables functional offline PWA experience.

---

### 5.2 Medium Severity

#### 5.2.1. `src/game/GameScene.tsx:126-138` — No WebGL context loss/restore handling
- **Severity:** Medium | **Category:** Bug / Usability | **Effort:** Medium
- **Issue:** Canvas does not listen for `webglcontextlost` / `webglcontextrestored`. Backgrounding or memory pressure kills GL context; screen stays black until force-restart.
- **Proposed Fix:** Add `onContextLost` / `onContextRestored` handlers. Show fallback on loss; increment remount key on restore.
- **Dependencies / Trade-offs:** `expo-gl` restoration behavior varies by OS; requires device testing.
- **Risk / Impact:** High user impact on mid-tier Android devices; moderate implementation risk.

#### 5.2.2. `src/game/DecorationInstances.tsx:135-158` — Tree sway iterates all trees every frame
- **Severity:** High | **Category:** Performance | **Effort:** Medium
- **Issue:** `TreeTypeGroup.useFrame` loops every tree instance to compute sway and update matrices. Can exceed 400 matrix updates/frame on dense boards.
- **Proposed Fix:** Bake sway into shader (pass `time`, `swayAmount`, `seed` as instance attributes). Update only a single `time` uniform.
- **Dependencies / Trade-offs:** Shader must replicate current sinusoidal sway; removes CPU bottleneck.
- **Risk / Impact:** Large CPU savings; moderate shader regression risk.

#### 5.2.3. `src/components/game/MultiplayerOverlay.tsx:567,643,917` — Unstable object reference dependencies
- **Severity:** Critical | **Category:** Bug / Performance | **Effort:** Medium
- **Issue:** Multiple `useEffect` hooks depend on `roomState` object from Convex. New reference on every render causes continuous effect firing, excessive re-renders, and potential infinite loops.
- **Proposed Fix:** Derive primitive dependencies (`roomState?.room.status`, `roomState?.players.length`) and use those in dependency arrays. Or use deep-equality hook.
- **Dependencies / Trade-offs:** More verbose dependency management.
- **Risk / Impact:** Eliminates render storms; moderate refactoring risk across overlay logic.

#### 5.2.4. `src/components/game/MultiplayerOverlay.tsx:519,524,531` — Type assertions bypass safety
- **Severity:** Medium | **Category:** Bug | **Effort:** Medium
- **Issue:** Multiple `as SomeType` casts on Convex query results hide API contract mismatches.
- **Proposed Fix:** Generate TypeScript types from Convex schema and use directly without casts.
- **Dependencies / Trade-offs:** Requires Convex codegen setup and CI check.
- **Risk / Impact:** Catches schema drift at compile time.

#### 5.2.5. `src/components/ui/Launch3DButton.tsx:25` — Web animation falls back to JS thread
- **Severity:** Medium | **Category:** Performance | **Effort:** Medium
- **Issue:** `USE_NATIVE_DRIVER = Platform.OS !== "web"` disables native driver on web. Complex press animation runs on JS thread.
- **Proposed Fix:** Migrate to `react-native-reanimated` for web-compatible native-thread animations, or simplify on web.
- **Dependencies / Trade-offs:** Increases bundle size if reanimated isn't fully tree-shaken.
- **Risk / Impact:** Smoother web interactions; moderate migration effort.

#### 5.2.6. `src/components/game/MainMenuOverlay.tsx` — Hardcoded style values
- **Severity:** Low | **Category:** Design | **Effort:** Medium
- **Issue:** Colors, border radii, font sizes hardcoded instead of using `theme` tokens. Fragments design system.
- **Proposed Fix:** Audit and replace hardcoded values with `theme.colors`, `theme.borderRadius`, `theme.typography`.
- **Dependencies / Trade-offs:** Some decorative colors may be component-specific.
- **Risk / Impact:** Enables theming/dark mode; moderate audit effort.

#### 5.2.7. `src/game/state/gameState.ts:847-909` — No runtime validation of persisted data
- **Severity:** Medium | **Category:** Type Safety | **Effort:** Medium
- **Issue:** `savedProgressRaw` cast with `as` without runtime checks. Corrupted values propagate and crash downstream.
- **Proposed Fix:** Use lightweight validator (Zod, Valibot, or manual guards) for hydration payload. Reject unknown shapes gracefully.
- **Dependencies / Trade-offs:** Adds validation dependency or ~50 lines of guards.
- **Risk / Impact:** Significantly improves robustness against storage corruption.

#### 5.2.8. `src/game/state/gameState.ts` — Monolithic store mixes concerns
- **Severity:** Medium | **Category:** Design | **Effort:** Medium
- **Issue:** ~950 lines conflating UI state, settings I/O, game rules, sync, and audio. Flat "slice" merge loses encapsulation.
- **Proposed Fix:** Split into separate files (`settingsStore.ts`, `engineStore.ts`, `uiStore.ts`) and compose with Zustand slices or separate stores.
- **Dependencies / Trade-offs:** Refactoring risk; requires updating all selector call sites.
- **Risk / Impact:** Improves testability and maintainability.

#### 5.2.9. `convex/rooms.ts:856-1008` — `getRoomState` monolithic query
- **Severity:** Medium | **Category:** Performance / Design | **Effort:** Medium
- **Issue:** Fetches players, events, pending turn, quiz round, answers in one massive payload. Risks hitting Convex query time/document read limits.
- **Proposed Fix:** Split into focused queries (`getRoomSnapshot`, `getRoomEventsDelta`, `getQuizRoundState`). Client subscribes to smaller snapshot and polls events.
- **Dependencies / Trade-offs:** Requires refactoring client sync logic in `runtimeStore.ts`.
- **Risk / Impact:** Prevents operational failures at scale.

#### 5.2.10. `convex/rooms.ts:233-259` — Sequential event inserts
- **Severity:** Medium | **Category:** Performance / Design | **Effort:** Medium
- **Issue:** Events inserted one at a time in loop. Approaches mutation write limits at scale.
- **Proposed Fix:** Omit redundant events already captured by snapshot, or batch smaller logical events into single `state_change` event with array payload.
- **Dependencies / Trade-offs:** May require client-side event replay changes.
- **Risk / Impact:** Reduces write pressure on busy rooms.

#### 5.2.11. `src/services/multiplayer/runtimeStore.ts` — Lacks persistence / rehydration
- **Severity:** Low | **Category:** Usability / Design | **Effort:** Medium
- **Issue:** In-memory only. OS kill causes blank multiplayer state on reopen.
- **Proposed Fix:** Persist bounded snapshot to `expo-sqlite` or `AsyncStorage`. Rehydrate cached state while fetching delta from `getRoomEventsSince`.
- **Dependencies / Trade-offs:** `expo-sqlite` or async-storage dependency.
- **Risk / Impact:** Faster reconnect UX.

#### 5.2.12. `src/services/multiplayer/runtimeStore.ts` — Delta sync not implemented
- **Severity:** Low | **Category:** Design | **Effort:** Medium
- **Issue:** Tracks `latestSequence`/`processedSequence` but `getRoomEventsSince` is not used.
- **Proposed Fix:** Implement delta sync on reconnect: call `getRoomEventsSince(afterSequence)` and apply incrementally.
- **Dependencies / Trade-offs:** Requires robust client event application logic.
- **Risk / Impact:** Reduces bandwidth and server load.

#### 5.2.13. `metro.config.js` — Lacks tree shaking hints
- **Severity:** Medium | **Category:** Performance | **Effort:** Medium
- **Issue:** No minification, tree shaking, or bundle splitting. `three.js` may be fully included.
- **Proposed Fix:** Enable Metro experimental tree shaking or Webpack tree shaking. Verify with bundle analyzer.
- **Dependencies / Trade-offs:** Requires bundle analysis tooling.
- **Risk / Impact:** Significant bundle size reduction possible.

<!-- END_MEDIUM_SECTION -->

## 6. Large Effort Initiatives (4 h+)

### 6.1 Critical Severity

#### 6.1.1. `src/game/Board.tsx:298-359` — O(n) tile iteration every frame
- **Severity:** Critical | **Category:** Performance | **Effort:** Large
- **Issue:** `PathTiles.useFrame` iterates entire `path` array every frame (60 tiles = 60 matrix writes + 60 color calculations). Drops FPS below 30 on mid-tier mobile.
- **Proposed Fix:** Precompute static tile data into typed arrays or a `DataTexture`. Animate only wave offset and player highlight in vertex/fragment shader via uniform updates.
- **Dependencies / Trade-offs:** Requires GPU-side shader refactoring. Significant performance win but needs careful testing on `expo-gl`.
- **Risk / Impact:** Biggest rendering bottleneck; high implementation risk due to shader complexity.

#### 6.1.2. `convex/rooms.ts`, `src/services/multiplayer/clientIdentity.ts` — No server-side authentication
- **Severity:** Critical | **Category:** Security / Bug | **Effort:** Large
- **Issue:** Entire auth model relies on client-generated `clientId` passed as mutation arg. No Convex Auth, JWT, or `auth.config.ts`. Any client can impersonate another.
- **Proposed Fix:** Implement Convex Auth (or Clerk/Auth0). Replace `clientId` checks with `ctx.auth.getUserIdentity()`. Map `tokenIdentifier` to `roomPlayers`.
- **Dependencies / Trade-offs:** Breaking change to all client/server multiplayer interfaces. Requires auth provider integration.
- **Risk / Impact:** Hard production release blocker. Must be done before any public multiplayer launch.

---

### 6.2 High Severity

#### 6.2.1. `src/game/Atmosphere.tsx` — Particle systems iterate all instances every frame
- **Severity:** High | **Category:** Performance | **Effort:** Large
- **Issue:** `Particles`, `FallingLeaves`, `Fireflies`, `Butterflies`, `Clouds` each loop entire instance count in `useFrame`. ~250 matrix writes/frame, all CPU-side.
- **Proposed Fix:** Move static trajectories into vertex shaders (pass seed + speed as instance attributes). Update only a `time` uniform. Merge cloud puffs into fewer billboards.
- **Dependencies / Trade-offs:** Requires rewriting animation logic into GLSL. Dramatic CPU savings but adds shader complexity.
- **Risk / Impact:** Major thermal/FPS improvement; high regression risk requiring extensive device testing.

#### 6.2.2. `e2e/web-smoke.spec.ts` — Minimal E2E test coverage
- **Severity:** High | **Category:** Bug | **Effort:** Large
- **Issue:** Only 2 smoke tests. No game flow, quiz, 3D scene, multiplayer, offline, or mobile viewport testing.
- **Proposed Fix:** Add tests for complete single-player flow, quiz answering, 3D scene rendering, PWA SW registration, offline gameplay, mobile viewport interactions.
- **Dependencies / Trade-offs:** Requires adding `testID` props to components. Playwright upgrade (Small effort item) should happen first.
- **Risk / Impact:** Long-term quality assurance; high upfront cost.

#### 6.2.3. `jest.config.js` — No component or hook tests
- **Severity:** High | **Category:** Bug | **Effort:** Large
- **Issue:** Only 9 test files for 20,000+ lines of code. No coverage for `QuizModal`, `GameOverlay`, hooks, etc.
- **Proposed Fix:** Add `@testing-library/react-native` component tests for critical UI flows and hook tests for stateful logic. Fix mock leaks and add missing native module mocks first.
- **Dependencies / Trade-offs:** Requires comprehensive mocks in `jest.setup.ts`.
- **Risk / Impact:** Prevents regressions; high ongoing maintenance value.

---

## 7. Cross-Cutting Recommendations

1. **Structured Error Telemetry** — The codebase uses `console.warn` in one place and swallows most async errors. Integrate a `TelemetryGateway` into a global error boundary and unhandled-rejection handler so production issues are observable.
2. **Audit Fire-and-Forget Persistence** — `saveSettings`, `saveProgress`, `savePlayerProfile`, and `persistCurrentProgress` are invoked without `await` or `.catch()`. A centralized persistence middleware with logging and retry would prevent silent `QuotaExceededError` failures.
3. **Formalize Session Recovery Semantics** — Decide explicitly which transient states (`isMoving`, `isRolling`, `showEducationalModal`, `quizPhase`) should survive an app kill. Write a hydration validator that reconciles impossible combinations.
4. **Establish a Design System Contract** — Many components hardcode colors, radii, and font sizes. A strict theme contract with lint rules (e.g., no hardcoded hex outside `theme.ts`) would prevent fragmentation.

---

## 8. Actionable Next Steps

### Immediate (This Week)
1. **Batch all Tiny-effort Critical/High fixes** (items 3.1.1–3.2.8). These are ~10 changes taking <15 min each and fix crashes, accessibility, and performance regressions.
2. **Fix the two Critical Small-effort state bugs** (4.1.3, 4.1.4) to prevent player soft-locks and teleportation.
3. **Update Playwright** (4.2.20) to unblock future E2E work.
4. **Add pre-deployment checks to EAS production workflow** (4.2.21).

### Short-Term (Next 2 Weeks)
5. **Resolve all remaining Small-effort High severity items** (4.2.1–4.2.19). This covers WebGL robustness, camera UX, audio lifecycle, security hardening, and build configuration.
6. **Implement Medium-effort network resilience** (5.1.3, 5.1.4) and rate limiting (5.1.2) before any multiplayer beta.
7. **Add runtime caching and navigation fallback to Workbox** (5.1.5, 3.3.35) for functional PWA offline support.
8. **Refactor `getRoomState` into focused queries** (5.2.9) to prevent operational limits.

### Medium-Term (Next Month)
9. **Address shader performance bottlenecks** (6.1.1, 6.2.1, 5.2.2). These require visual QA but yield the largest FPS/thermal gains.
10. **Implement server-side authentication** (6.1.2). This is a production blocker for multiplayer.
11. **Expand test coverage** (6.2.2, 6.2.3) with component and E2E suites.
12. **Split monolithic game state store** (5.2.8) into focused Zustand slices.

### Ongoing
13. **Run `bun run verify` after each batch of changes** to ensure type safety, lint, and tests remain green.
14. **Track implementation of this report** in the project backlog, linking each item to its file/line for traceability.

---

*Report generated by orchestrating 5 parallel codebase analysis subagents.*



