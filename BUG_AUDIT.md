# Bug Audit — board-game2

Generated via subagent-driven codebase audit. Findings organized by severity, with a phased fix plan.

---

## CRITICAL (Fix Immediately — Will Break the App)

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| **C1** | `babel.config.js` **MISSING** | — | No Babel config means `react-native-reanimated/plugin` never loads. All `'worklet'` directives in animations silently fail at runtime. Affects every `useAnimatedStyle`, `useSharedValue`, and the `import 'react-native-reanimated'` in `app/_layout.tsx:7`. |
| **C2** | `.github/workflows/ci.yml` | 34 | CI only runs `expo export --platform web` — **never generates the service worker**. Also: entire CI is GitHub Actions (to be replaced by rwx.com — see Phase 5). |
| **C3** | `src/services/persistence/kvRepositories.ts` | 1 | Barrel file hardcodes `export * from './kvRepositories.native'` on **all platforms**. The `.web.ts` version (using `localStorage`) is dead code. On web, `expo-sqlite/kv-store` either throws on import or fails at runtime. |
| **C4** | `src/components/game/FallbackDice.tsx` | 33-42 | Timeout not cancelled when `isRolling` toggles back to `false` within 1s. `storeCompleteRoll(val)` fires unexpectedly, causing incorrect game state mutation. |

## HIGH (Fix Next — Breaks Functionality / Major Issues)

| # | File | Line(s) | Issue | Type |
|---|------|---------|-------|------|
| **H1** | `convex/rooms.ts` | 2074-2105 | **Duplicate quiz answer race.** Two concurrent `submitQuizAnswer` calls pass the "no existing answer" check, insert duplicate docs, and double-score the player. No unique constraint on `(roundId, playerId)`. | Race |
| **H2** | `src/components/game/SoundToggle.tsx` | 10 | `useGameStore()` without selector subscribes to **entire store**. Every state change (player movement, dice, quiz, zoom) re-renders this root layout component. | Perf |
| **H3** | `src/services/audio/audioManager.ts` | 399-457 | `disposeAll()` native path: `fadePlayer` `setInterval` can fire on already-removed `AudioPlayer` objects (use-after-free on native audio resources). | Memory |
| **H4** | `src/hooks/usePresenceHeartbeat.ts` | 37 | Unstable `touchPresence` dep recreates the 20s heartbeat interval on **every render**. Causes continuous network requests + interval drift. | Perf |
| **H5** | `src/services/persistence/kvRepositories.native.ts` | 27-58 | All 6 `Storage.getItem`/`setItem`/`removeItem` calls **lack error handling**. SQLite throws on DB corruption, quota, lock contention → unhandled promise rejection. | Error |
| **H6** | `src/services/audio/audioManager.ts` | 460-476 | Race in `warmSfx`: two concurrent `playSfx` calls for same uncached sound both create 3 `AudioPlayer` instances. Second overwrites first → 3 leaked native audio players per collision. | Race |
| **H7** | `src/services/audio/audioManager.ts` | 569-626 | `stopAllWebSfx` stops `AudioBufferSourceNode` but never disposes per-play `GainNode`s. Nodes accumulate in audio graph on dispose/reinit cycles. | Memory |
| **H8** | `src/game/state/gameState.ts` | 926-954 | `hydrateFromPersistence` restores saved position/quiz state but leaves `gameStatus: 'menu'`. **Saved progress is invisible on reload.** | Logic |
| **H9** | `src/game/state/gameState.ts` | 536-592 | `restartGame`/`resetGame` use `enqueueSync(state, ...)` which **appends to old syncQueue**. Stale items from previous game persist and flush outdated data. | Logic |
| **H10** | `src/domain/game/quizSelector.ts` | 26-31 | When all questions for a theme are exhausted, fallback picks **randomly from ALL including already-used**. Player sees the same question twice in one session. | Logic |
| **H11** | `package.json` verify script + `.github/workflows/ci.yml` | — | Uses `npm run` / `npx` despite AGENTS.md mandate to use `bun`/`bunx`. Inconsistent lockfile management. Entire CI to be replaced by rwx.com (see Phase 5). | Config |
| **H12** | `src/hooks/useMultiplayerEventProcessor.ts` | 58-64 | No limit on `requiresResync` retries. Continuous `requiresResync: true` response causes **infinite resync loop** flooding the server. | Logic |
| **H13** | `src/hooks/useMultiplayerEventProcessor.ts` | 68-91 | Events processed in array order with sequential guard `<=`. If server returns events out of order (e.g., seq 5 then seq 4), seq 4 is **permanently dropped**. | Logic |

## MEDIUM (Fix Soon — Performance / Edge Cases)

| # | File | Line(s) | Issue | Type |
|---|------|---------|-------|------|
| **M1** | `convex/rooms.ts` | 2121-2126 | Each `submitQuizAnswer` schedules `runAfter(0, ...)` → (N-1) stale scheduled functions per round that are no-ops. | Perf |
| **M2** | `convex/rooms.ts` | 2471-2474 | `cleanupInactiveRooms` uses unbounded `.collect()` — crashes when room count exceeds Convex limits (1MB / 16K reads). | Perf |
| **M3** | `convex/schema.ts` | 33 | `characterClaims: v.any()` bypasses validation. Should be typed record. | Schema |
| **M4** | `src/components/ui/Card3D.tsx` | 147-271 | ~15 inline style objects created every render. Used in 5+ component locations. | Perf |
| **M5** | `src/components/game/HelpCenterModal.tsx` | 125-144 | 20 separate `useGameStore()` selector calls — each creates individual subscription. | Perf |
| **M6** | `src/components/game/DiceMenu.tsx` | 29, 108-111 | Missing `React.memo` on component with 3D Canvas + `handleRoll` not in `useCallback`. R3F scene re-renders on every parent render. | Perf |
| **M7** | `src/services/multiplayer/runtimeStore.ts` | 686 | `Date.now()` client clock used for quiz deadline. Clock skew > a few seconds either blocks valid submissions or allows late ones. | Logic |
| **M8** | `convex/rooms.ts` | 544-596 | `resolveQuizRoundCore` patches position of a player who may have left the room. | Logic |
| **M9** | `src/domain/game/turnResolver.ts` | 92-118 | `resolveLandingEffect` returns early when color rule exists — silences tile-level effects when rule is `'none'`. | Logic |
| **M10** | `src/game/state/gameState.ts` | 873-891 | Profile save not debounced (unlike volume setters). Color picker changes flood storage. | Perf |
| **M11** | `convex/tsconfig.json` | 18 | `"dom"` lib in Convex tsconfig masks accidental browser API use in server code. | Config |
| **M12** | `app.json` | 50 | `reactCompiler: true` requires Babel plugin — without `babel.config.js`, this experiment does nothing. | Config |
| **M13** | `metro.config.js` | 41-49 | zustand `resolveRequest` bypasses `exports` map — fragile for future zustand updates. | Config |

## LOW (Nice to Fix)

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| **L1** | `src/domain/game/turnResolver.ts` | 188 | Non-null assertion `!` on potentially undefined tile array access |
| **L2** | `src/services/audio/audioManager.ts` | 262 | `player.play()` promise not caught (unhandled rejection) |
| **L3** | `src/services/audio/audioManager.ts` | 127-150 | Web AudioContext not suspended when audio disabled |
| **L4** | `src/utils/nanoid.ts` | 7 | `Math.random()` for ID generation (not cryptographically secure) |
| **L5** | `src/hooks/useEscapeToClose.ts` | 17 | `preventDefault()` on Escape globally interferes with browser's own Escape handling |
| **L6** | `src/game/state/boardLayout.ts` | 11-58 | 12 unused hardcoded coordinates (58 defined, 46 tiles mapped) |
| **L7** | `src/game/state/gameState.ts` | 301-316 | `saveProgress` stores fields outside `GameProgress` type — type safety hole |
| **L8** | `src/domain/game/engine.ts` | — | Duplicate `clampIndex` — two copies can drift |
| **L9** | `convex/rooms.ts` | 376-458 | Duplicate serialization functions (`toPendingTurnClientScript` / `toTurnClientPayload`) |
| **L10** | `workbox-config.js` | 3 | Missing `.webp`, `.wasm`, `.ico` in glob patterns |
| **L11** | `package.json` | — | Dead deps: `@react-navigation/bottom-tabs`, `@react-navigation/elements`, `expo-linking`, `expo-symbols`, `expo-updates`, `expo-web-browser` |
| **L12** | `components/haptic-tab.tsx` | — | Dead code file (legacy template artifact) |

---

## Fix Plan

### Phase 1: Blocking / Build-Breaking Fixes

**1.1 — Create `babel.config.js`**
```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```
**Verify:** `bun run typecheck` passes, app loads without animation errors

**1.2 — Stopgap: fix GitHub Actions CI to use bun + generate SW**
- `.github/workflows/ci.yml`: `npx expo export` → `bunx expo export --platform web && workbox generateSW workbox-config.js`
- Change all `npm run` → `bun run` and `npx` → `bunx`
- This is a stopgap — long-term plan is to migrate to rwx.com (see Phase 5)

**1.3 — Fix `kvRepositories.ts` barrel file**
- Delete `src/services/persistence/kvRepositories.ts`
- Metro auto-resolves `kvRepositories.web.ts` on web, `kvRepositories.native.ts` on native
- Update all import paths from `@/services/persistence/kvRepositories` (extensionless — still resolves)

**1.4 — Fix `FallbackDice.tsx` stale timeout**
- Add early return `if (!isRolling || isRollingProp != null) return;`
- Always return `() => clearTimeout(timeout)` from effect

### Phase 2: Functional Bug Fixes

**2.1 — Fix duplicate quiz answer race (Convex)**
- Schema: add `answeredPlayerIds: v.optional(v.array(v.id('roomPlayers')))` to `roomQuizRounds`
- `submitQuizAnswer`: atomically check + append to this set using `ctx.db.patch`
- OCC on round doc forces serialization — second caller retries, finds player in set, returns `alreadyAnswered`

**2.2 — Fix `SoundToggle.tsx` full-state subscription**
- `useGameStore()` → `useGameStore(s => s.audioEnabled)` + separate `useGameStore(s => s.setAudioEnabled)`

**2.3 — Fix `hydrateFromPersistence` gameStatus**
- When saved progress is found and applied, also set `gameStatus: 'playing'`

**2.4 — Fix `restartGame`/`resetGame` syncQueue**
- Clear syncQueue before enqueue: `syncQueue: enqueueSync(defaultState(), ...)`

**2.5 — Fix quizSelector duplicate question fallback**
- Pass `usedQuestionIds` into fallback path; maintain exclusion set

**2.6 — Fix `usePresenceHeartbeat` interval thrashing**
- Add ref: `const touchPresenceRef = useRef(touchPresence); touchPresenceRef.current = touchPresence;`
- Call `touchPresenceRef.current()` inside interval

**2.7 — Fix event processing out-of-order drops**
- Sort `eventsDelta.events` by `event.sequence` before processing

**2.8 — Fix resync infinite loop**
- Add `resyncCount` ref with max 3 retries; after limit, log error and proceed

**2.9 — Fix persistent storage error handling**
- Wrap all `Storage.getItem`/`setItem`/`removeItem` in try/catch in both `.web.ts` and `.native.ts`
- Log warning on failure, return `null`

### Phase 3: Performance & Resource Fixes

**3.1 — Fix audio `fadePlayer` use-after-free (native)**
- Add guard check in native `setInterval` `step()`: abort if player was removed
- In `disposeAll`, cancel fadeHandles + clear timers before removing players

**3.2 — Fix `warmSfx` race condition**
- Use `Map<SfxId, Promise<SfxVoicePool>>` to deduplicate concurrent warmings

**3.3 — Fix `stopAllWebSfx` GainNode leak**
- Store GainNode refs alongside source nodes, disconnect on stop

**3.4 — Fix Card3D inline styles**
- Extract static styles to `StyleSheet.create()`

**3.5 — Fix HelpCenterModal subscriptions**
- Consolidate with `useShallow` from `zustand/react/shallow`

**3.6 — Fix DiceMenu missing React.memo**
- Wrap component in `React.memo`, wrap `handleRoll` in `useCallback`

**3.7 — Fix Convex unbounded `.collect()` in cron**
- Replace with paginated loop: `.take(100)` repeatedly until empty

**3.8 — Reduce stale scheduled functions per quiz round**
- Only schedule `runAfter(0, ...)` on first answer (count transitions 0→1)

### Phase 4: Schema & Config Fixes

**4.1 — Type `characterClaims` properly**
- `v.any()` → `v.optional(v.record(v.string(), v.string()))`

**4.2 — Fix `verify` script to use `bun` exclusively**
- `package.json` `verify`: `npx expo-doctor && npx expo install --check && npm run typecheck && npm run lint && npm run test`
  → `bunx expo-doctor && bunx expo install --check && bun run typecheck && bun run lint && bun run test`

**4.3 — Remove `dom` from Convex tsconfig**
- `"lib": ["ES2023"]`

**4.4 — Document `EXPO_PUBLIC_CONVEX_SITE_URL` in `.env.example`**

**4.5 — Clean up dead dependencies**
- Remove: `@react-navigation/bottom-tabs`, `@react-navigation/elements`, `expo-linking`, `expo-symbols`, `expo-updates`, `expo-web-browser`
- Delete dead file: `components/haptic-tab.tsx`

### Phase 5: Migrate CI to rwx.com

Replace GitHub Actions (`.github/workflows/ci.yml`) with [rwx.com](https://rwx.com) Mint CI. rwx provides automatic content-based caching, DAG-based task orchestration, and local runs via `rwx run`.

**Install CLI:**
```bash
brew install rwx-cloud/tap/rwx
rwx login
```

**Create `.rwx/ci.yml`:**

```yaml
on:
  cli:
    init:
      commit-sha: ${{ event.git.sha }}
  github:
    pull_request:
      init:
        commit-sha: ${{ event.git.sha }}
    push:
      branches: [main, master]
      init:
        commit-sha: ${{ event.git.sha }}

base:
  image: ubuntu:24.04
  config: rwx/base 1.0.2

env:
  EXPO_PUBLIC_CONVEX_URL: ${{ secrets.EXPO_PUBLIC_CONVEX_URL }}
  EXPO_PUBLIC_CONVEX_SITE_URL: ${{ secrets.EXPO_PUBLIC_CONVEX_SITE_URL }}

tasks:
  - key: code
    call: git/clone 2.0.3
    with:
      repository: https://github.com/YOUR_ORG/board-game2
      ref: ${{ init.commit-sha }}
      github-token: ${{ github.token }}

  - key: bun
    call: oven/bun 1.0.0
    with:
      bun-version: latest

  - key: node
    call: nodejs/install 1.1.11
    with:
      node-version: "20"

  - key: install
    use: [code, bun, node]
    run: bun install --frozen-lockfile
    filter:
      - bun.lock
      - package.json

  - key: typecheck
    use: install
    run: bun run typecheck

  - key: lint
    use: install
    run: bunx expo lint

  - key: test
    use: install
    run: bun run test

  - key: web-build
    use: [install, typecheck, lint]
    run: |
      bun run build:web
    outputs:
      web-dist:
        - path: dist/

  - key: bundle-check
    use: web-build
    run: bun run bundle:check

  - key: web-smoke
    use: web-build
    run: |
      bunx playwright install --with-deps chromium
      bun run test:web-smoke
```

**Run locally before pushing:**
```bash
rwx run .rwx/ci.yml --open
```

**Key rwx features this leverages:**
- **Automatic caching** — tasks are cached by their `run` script + upstream task outputs + filtered file content. The `install` task with `filter: [bun.lock, package.json]` only re-runs when deps change.
- **DAG orchestration** — `typecheck`, `lint`, and `test` run in parallel once `install` completes. `web-smoke` runs after `web-build`.
- **CLI-local runs** — iterate on CI without pushing. `rwx run .rwx/ci.yml` runs the exact same pipeline locally.
- **GitHub PR integration** — `on: github: pull_request` triggers runs on PRs with status checks posted back automatically.

**Delete after migration:**
- `.github/workflows/ci.yml`
- GitHub Actions secrets (move to rwx vaults)

### Phase 6: Low Priority Cleanup

- Fix non-null assertion in `turnResolver.ts:188`
- Add `.catch()` to `audioManager.ts:262` `player.play()`
- Suspend Web AudioContext when audio disabled
- Fix duplicate `clampIndex`
- Add logging to storage parse failures
- Remove unused `FIXED_PATH_COORDS` entries

---

## Verification

| Phase | Command | Expected |
|-------|---------|----------|
| After each | `bun run typecheck` | Pass |
| After each | `bunx expo lint` | Pass |
| After each | `bun run test` | All tests pass |
| After Phase 1 | `bun run build:web` | Web export + SW generation succeed |
| After Phase 2 | Manual save/reload cycle | Game state persists correctly |
| After Phase 2 | Manual multiplayer quiz | No double-scoring |
| After Phase 5 | `rwx run .rwx/ci.yml --open` | Full CI pipeline passes on rwx.com |
| After Phase 5 | Open PR | rwx posts status checks to GitHub |
