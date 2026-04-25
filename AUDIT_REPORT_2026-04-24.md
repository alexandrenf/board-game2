# Audit Report — 2026-04-24

## Overview

Three PRs were merged to `master` on 2026-04-24. All three target audio
infrastructure in `src/services/audio/audioManager.ts` and were applied in
sequence to fix Safari/web playback, reduce boot cost, and harden native volume
semantics.

| PR | Title | Merged |
|----|-------|--------|
| [#23](https://github.com/alexandrenf/board-game2/pull/23) | perf(audio): fix Safari playback and reduce boot/runtime cost | 19:33 UTC |
| [#24](https://github.com/alexandrenf/board-game2/pull/24) | Add WebAudio-based SFX handling and preloading for web platform | 21:36 UTC |
| [#25](https://github.com/alexandrenf/board-game2/pull/25) | fix(audio): stabilize native volume controls and restore SFX playback | 21:57 UTC |

---

## PR #23 — perf(audio): fix Safari playback and reduce boot/runtime cost

**Branch:** `claude/fix-audio-performance-safari-z89C1`  
**Files changed:** `audioManager.ts`, `MultiplayerOverlay.tsx`, `QuizTimer.tsx`,
`PlayerTokenActor.tsx`, `renderQuality.ts`, `app/index.tsx`, `characterAsset.ts`
(new), plus 20 binary asset swaps (.ogg → .m4a).

### What it does

- **Codec swap:** All 20 `.ogg` sound assets transcoded to AAC `.m4a` (128 kbps
  music/ambient, 96 kbps SFX). Ogg Vorbis is unsupported in WebKit, so music
  and SFX were silently inaudible on Safari/iOS PWA.
- **downloadFirst disabled on web:** `createAudioPlayer` with
  `downloadFirst: true` serialises every asset download on the main thread,
  causing the 1.5 s "Preparando sons" splash. Setting `downloadFirst: !IS_WEB`
  allows the web audio player to resolve synchronously against the browser cache.
- **3-voice round-robin SFX pool:** Replaced the single `AudioPlayer` per SFX
  with a pool of 3 (`SFX_POOL_SIZE = 3`). Rapid repeats (dice rolls, quiz tick)
  no longer cut each other off. 20 SFX × 3 voices = 60 `AudioPlayer` instances
  on native.
- **RAF-based fades on web:** `setInterval(50)` replaced by
  `requestAnimationFrame` for smoother volume ramps and no timer work when the
  tab is backgrounded.
- **`AUDIO_PRELOAD_TIMEOUT_MS` 1500 → 700:** Safe now that `preloadAll` no
  longer waits on network serialisation.
- **`QuizTimer` countdown effect:** Collapsed the nested conditions into a single
  `inCountdownWindow` boolean that drives one `useEffect`, reducing
  re-subscription overhead.
- **Character GLB parallel preload:** `useGLTF.preload(CHARACTER_ASSET.uri)`
  fired at boot on web so the 10 MB model downloads in parallel with audio
  preload.
- **`MultiplayerOverlay` store consolidation:** 13 individual `useGameStore`
  calls replaced with a single `useShallow` subscription. Async handlers wrapped
  in `useCallback`.
- **FPS sampling every 10 frames:** `renderQuality.ts` now skips 9 of 10 frames
  when building the FPS window.

### Findings

**Strengths**
- Root cause fix (codec) is correct; AAC is universally supported.
- Disabling `downloadFirst` on web is the right lever; native behaviour is
  unchanged.
- `useShallow` consolidation is a meaningful render-count reduction.
- The RAF-fade cancel guard (checking `cancelFn` reference) is clever and
  correct: if a new fade supersedes the old one, the old RAF chain detects the
  mismatch and stops.

**Important**
1. **Memory footprint increase on native.** 20 SFX × 3 = 60 `AudioPlayer`
   objects exist permanently from `preloadAll` onward. On low-end Android this
   can exhaust the media player handle limit (~100 across all apps). The pool
   size is not configurable per quality level.
   - *Mitigation:* PR #24 replaces the web pool path entirely; native is the
     only concern. Consider reducing `SFX_POOL_SIZE` to 2 or tying it to render
     quality.

2. **FPS window fill time expanded 10×.** `SAMPLE_WINDOW = 60` samples, sampled
   every 10 frames → 600 frames (~10 s at 60 fps) to fill. The adaptive quality
   switch will take longer to react on first launch. This may be acceptable given
   `QUALITY_SWITCH_COOLDOWN_MS = 8_000`, but degradation detection is now slower
   than the cooldown.

**Minor**
- `useGLTF.preload` is called in an imperative effect block with only a `try/
  catch`. If the URI is a relative webpack path that `drei`'s loader doesn't
  recognise, the error is swallowed silently. No observable harm but a debug
  `console.warn` would aid diagnosis.
- `CharacterAsset.ts` carries a comment explaining the reason for the module-
  scope require; this is valuable and should be preserved.

---

## PR #24 — Add WebAudio-based SFX handling and preloading for web platform

**Branch:** `codex/propose-plan-to-fix-sound-lag`  
**Files changed:** `audioManager.ts` only (adds ~160 lines).

### What it does

Introduces a `WebSfxState` struct backed by the Web Audio API:

- `AudioContext` + `GainNode` for master SFX volume control
- `AudioBuffer` cache keyed by `SfxId`
- In-flight `Promise` deduplication (prevents redundant fetches)
- `Set<AudioBufferSourceNode>` per sound for stop/dispose tracking

Critical sounds (`ui.tap_a`, `ui.click_a`, `sfx.dice_roll`, `sfx.quiz_tick`)
are pre-decoded during `preloadAll`. Other sounds load lazily on first `playSfx`
call.  `preloadAll` skips the `warmSfx` pool for web entirely, so no
`HTMLAudioElement` pool is created on web.

`setBusVolume` and `setEnabled` keep `gainNode.gain` in sync. `disposeAll`
stops active sources, waits for in-flight loads, and closes the `AudioContext`.

### Findings

**Strengths**
- Web Audio API is the correct tool: lower latency, polyphonic, no
  `HTMLAudioElement` pool bloat.
- `arrayBuffer.slice(0)` before `decodeAudioData` is the correct Safari
  workaround for "detached ArrayBuffer" errors.
- Promise deduplication prevents stampede on first playSfx for unloaded sounds.
- `state.context.resume()` called before `playBuffer` handles the Safari
  suspended-context case correctly.

**Important**
1. **`disposeAll` iterates `activeSources.values()` with wrong type.** After
   `stopAllWebSfx()` clears the map the loop body never runs, making this a dead
   code path. But the cast `(source as { disconnect?: () => void })` treats a
   `Set<AudioBufferSourceNode>` as a source node — if `stopAllWebSfx` ever
   failed to clean up completely, this code would silently do nothing instead of
   disconnecting nodes.

   ```ts
   // Bug: activeSources.values() yields Set<AudioBufferSourceNode>, not nodes
   for (const source of webSfx.activeSources.values()) {
     (source as { disconnect?: () => void }).disconnect?.(); // calls Set.disconnect (undefined)
   }
   ```

   Fix: remove the loop (it's dead after `stopAllWebSfx`) or iterate correctly:
   ```ts
   for (const sourceSet of webSfx.activeSources.values()) {
     for (const source of sourceSet) {
       try { source.disconnect(); } catch { /* best-effort */ }
     }
   }
   ```

2. **No automated tests for the web audio path.** The `playSfxWeb`,
   `loadWebSfxBuffer`, and `stopWebSfx` code paths are untested. `AudioContext`
   can be mocked in jsdom/jest. A test that verifies buffered playback, the
   deduplication promise, and stop behaviour would catch regressions.

**Minor**
- `WEB_PRELOAD_SFX` is defined inline as a module-level constant with no
  comment explaining the selection criteria. Future maintainers may not know why
  exactly these 4 sounds were chosen. A short comment would help.
- `getWebSfxState()` initialises the `AudioContext` lazily on first `playSfx`.
  On Safari, an `AudioContext` created outside a user-gesture is immediately
  suspended. The `resume()` call in `playSfxWeb` handles this, but the first
  play call after a long idle may have a small jitter.

---

## PR #25 — fix(audio): stabilize native volume controls and restore SFX playback

**Branch:** `codex/audit-mobile-sound-issues`  
**Files changed:** `audioManager.ts` only (~80 lines changed).

### What it does

Hardens the native audio path after PR #23 laid the foundation:

- **`setBusVolume` mute/pause semantics:** When music or ambient bus volume
  reaches zero, the player is now explicitly `muted` and `paused`. Previously
  only `volume` was updated; on some Android/native targets setting `volume = 0`
  does not stop the audio thread, leaving a silent but active stream.
- **`playMusic`/`playAmbient` mute guard:** Computes `targetVolume` before
  starting playback, sets `muted` accordingly, and skips `play()` when
  `targetVolume <= 0`. Prevents a muted music start that would later refuse to
  unmute without a full re-trigger.
- **`playSfx` eager warm:** Replaces the `preloadSfxLater` fallback with
  `this.warmSfx(soundId)` called synchronously and `void this.ensureMode()` to
  handle the case where `playSfx` is called before `preloadAll` completes.
- **`pauseLoop`/`resumeLoop`/`fadePlayer` muted sync:** `muted` flag kept in
  sync at every volume transition.

### Findings

**Strengths**
- Dual `muted` + `pause()` on zero volume is the correct native fix — many
  Android OEMs throttle or drop the audio thread for `muted` streams but not for
  `volume = 0` ones.
- Eager `warmSfx` in `playSfx` is an improvement: early SFX are no longer
  silently dropped.
- `void this.ensureMode()` is fire-and-forget, which is correct — the players
  created by `warmSfx` will work fine once mode is configured, and mode is
  almost certainly already set by the time `playSfx` fires in normal gameplay.

**Important**
1. **`fadePlayer` sets `player.muted` on every RAF/interval tick.** During a
   volume fade (e.g. music cross-fade lasting 800 ms at 60 fps = 48 ticks), the
   `muted` property is written 48 times. On the native side `muted` is an
   `AVAudioPlayer`/`ExoPlayer` property that may cross the JS bridge on every
   write. In practice `muted` only needs to flip once — at the start of the fade
   (for fades toward 0) or on completion. This is not a correctness issue but a
   performance concern on low-end devices.

   Suggested fix: compute `player.muted = targetVolume <= 0` once before
   starting the fade, and don't re-write it in `step()`.

**Minor**
- The `else if (this.enabled && effectiveVolume > 0 && !player.playing)` branch
  in `setBusVolume` will call `play()` on a player that was intentionally paused
  by the user mid-session if they then bump the volume slider off zero. This is
  arguably correct (restoring audio after un-muting) but could surprise users
  who paused audio for a reason other than the volume slider. Consider gating on
  an explicit "was-playing-before-mute" flag. Low priority.

---

## Cross-PR Observations

### Audio Architecture After These Three PRs

```
playSfx()
  ├── IS_WEB → playSfxWeb() → AudioContext + AudioBufferSourceNode (Web Audio API)
  └── native → sfxPools[soundId][cursor] (expo-audio AudioPlayer pool, 3 voices)

playMusic() / playAmbient()
  └── both platforms: expo-audio AudioPlayer with muted+pause at zero volume

fadePlayer()
  ├── IS_WEB → requestAnimationFrame loop
  └── native → setInterval(50 ms) loop
```

The three PRs create a clean two-path architecture. The abstraction is sound.

### Testing Coverage

None of the three PRs add or update automated tests. The existing test suite
(`src/game/state/__tests__/gameState.test.ts`) is noted as failing in the PR #25
description due to a Bun parsing issue unrelated to these changes. The audio
manager has zero unit test coverage. The web path (PR #24) is particularly
risky to leave untested given the volume of async state involved.

### Deployment Risk

- Low on native: codec change is transparent; pool change is additive.
- Medium on web: WebAudio path is entirely new. Safari's `AudioContext`
  lifecycle is notoriously fussy; any error in `resume()` or `decodeAudioData`
  silently drops SFX without user feedback.

---

## Summary Table

| Severity | Issue | PR | File |
|----------|-------|----|------|
| Important | 60 AudioPlayer handles on native; no quality-level scaling | #23 | `audioManager.ts` |
| Important | FPS quality window now 10 s to fill (was 1 s) | #23 | `renderQuality.ts` |
| Important | `disposeAll` dead loop has wrong type — silent no-op if stopAll fails | #24 | `audioManager.ts` |
| Important | No tests for WebAudio path | #24 | — |
| Important | `fadePlayer` writes `muted` on every tick (bridge overhead) | #25 | `audioManager.ts` |
| Minor | `useGLTF.preload` error is silently swallowed | #23 | `app/index.tsx` |
| Minor | `WEB_PRELOAD_SFX` selection undocumented | #24 | `audioManager.ts` |
| Minor | Un-muting volume slider may restart an intentionally paused track | #25 | `audioManager.ts` |
