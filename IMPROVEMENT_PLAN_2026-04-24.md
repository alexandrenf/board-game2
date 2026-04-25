# Improvement Plan — 2026-04-24

Prioritised follow-up actions for the audio PRs (#23, #24, #25) merged on
2026-04-24. Issues are ordered by impact; fix the Important ones before the
next release, Minor ones when convenient.

---

## Important Fixes

### 1. Fix `disposeAll` dead loop type error (PR #24)

**File:** `src/services/audio/audioManager.ts`  
**Risk:** Harmless today (the loop never executes), but will silently fail to
disconnect `AudioBufferSourceNode`s if `stopAllWebSfx` ever misses a source.

Remove the dead loop entirely (cleanup is already done by `stopAllWebSfx`) or
fix the iteration:

```ts
// REMOVE this block (dead after stopAllWebSfx() clears the map):
for (const source of webSfx.activeSources.values()) {
  try {
    (source as { disconnect?: () => void }).disconnect?.();
  } catch (err) { ... }
}

// OR replace with correct iteration (values are arrays of metadata objects):
for (const metas of webSfx.activeSources.values()) {
  for (const meta of metas) {
    try { meta.instance.disconnect(); } catch { /* best-effort */ }
  }
}
```

---

### 2. Add unit tests for the WebAudio path (PR #24)

**File:** new `src/services/audio/__tests__/audioManager.web.test.ts`  
**Risk:** The entire `playSfx(…)` (which internally branches to `playSfxWeb`,
`loadWebSfxBuffer`, `stopWebSfx` for the WebAudio path) and `disposeAll` (web
branch) code is untested. Before testing, either extract the WebAudio helpers
into testable exported functions, or target the public API (`playSfx`, `stopSfx`,
`disposeAll`) directly.

Minimal test surface using jest's `AudioContext` mock:

```ts
// Mock AudioContext in jest setup or inline
const mockContext = {
  createGain: () => ({ gain: { value: 1 }, connect: jest.fn() }),
  createBufferSource: () => ({
    connect: jest.fn(), start: jest.fn(), stop: jest.fn(),
    playbackRate: { value: 1 }, onended: null, buffer: null,
  }),
  decodeAudioData: jest.fn((buf) => Promise.resolve(buf)),
  resume: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
  state: 'running',
  destination: {},
};
globalThis.AudioContext = jest.fn(() => mockContext) as unknown as typeof AudioContext;

// Tests to cover:
// 1. playSfx on web fetches, decodes, and starts a source node
// 2. Calling playSfx twice for same sound while loading deduplicates the fetch
// 3. stopSfx calls source.stop() and clears the active set
// 4. setBusVolume updates gainNode.gain.value
// 5. disposeAll closes the AudioContext and clears state
```

---

### 3. Cap SFX pool size on low-memory devices (PR #23)

**File:** `src/services/audio/audioManager.ts`  
**Risk:** 60 `AudioPlayer` (= `MediaPlayer`/`AVAudioPlayer`) handles on native.
Android hard-limits per-process media players; low-end devices may see silent
failures once the limit is reached.

Tie pool size to render quality:

```ts
// In audioManager.ts, before class definition
import { getQualityProfile } from '../game/renderQuality'; // or pass in

const SFX_POOL_SIZE = (() => {
  // Simple heuristic: low RAM devices get 2 voices, others get 3
  // Can be wired to RenderQuality once the store is accessible here
  return 2; // safe floor; upgrade to 3 on medium/high via setSfxPoolSize()
})();
```

Alternatively, expose a `setSfxPoolSize(n: number)` method called by the render
quality hook after it determines the quality level.

---

### 4. Move `muted` write out of `fadePlayer` step loop (PR #25)

**File:** `src/services/audio/audioManager.ts`  
**Risk:** Bridge write on every RAF tick during cross-fades; low-end Android
impact.

```ts
// Before starting the fade, set muted once:
private fadePlayer(player: AudioPlayer, targetVolume: number, durationMs: number, onDone?: () => void) {
  this.clearFade(player);

  if (durationMs <= 0) {
    player.volume = targetVolume;
    player.muted = targetVolume <= 0; // ✓ single write
    onDone?.();
    return;
  }

  // Set muted for the whole fade duration based on direction:
  // Fading toward 0 → mute at start (silent immediately)
  // Fading away from 0 → unmute at start (audible during fade-in)
  if (targetVolume <= 0) player.muted = true;
  else player.muted = false;

  const startVolume = player.volume;
  const startedAt = Date.now();

  const step = () => {
    const progress = clampVolume((Date.now() - startedAt) / durationMs);
    player.volume = startVolume + (targetVolume - startVolume) * progress;
    // Remove: player.muted = player.volume <= 0;   ← no bridge write per tick
    if (progress >= 1) {
      this.clearFade(player);
      onDone?.();
    }
  };
  // ... RAF / setInterval setup unchanged
}
```

---

### 5. Add `WEB_PRELOAD_SFX` selection comment (PR #24)

**File:** `src/services/audio/audioManager.ts` line ~75

```ts
// Sounds that play within the first few seconds of gameplay (menu taps, first
// dice roll, quiz tick) are pre-decoded at boot to avoid async latency on first
// user interaction. All other sounds load lazily on first playSfx call.
const WEB_PRELOAD_SFX: SfxId[] = ['ui.tap_a', 'ui.click_a', 'sfx.dice_roll', 'sfx.quiz_tick'];
```

---

## Minor / Nice-to-Have

### 6. Log GLTF preload failures as warnings (PR #23)

**File:** `app/index.tsx`

The current `catch` is silent. A `console.warn` preserves the existing
graceful-fail behaviour while making failures visible in the dev console:

```ts
try {
  useGLTF.preload(CHARACTER_ASSET.uri);
} catch (error) {
  console.warn('[GLTF] character.glb preload failed:', error);
}
```

---

### 7. Guard volume-slider play() against intentional pauses (PR #25)

**File:** `src/services/audio/audioManager.ts`, `setBusVolume`

Low priority — only matters if users pause music through another mechanism while
the volume is also at zero.

```ts
// Track whether the loop was playing before the volume reached zero:
private wasPlayingBeforeMute: Partial<Record<'music' | 'ambient', boolean>> = {};

// In setBusVolume, when going to zero:
if (effectiveVolume <= 0 && player.playing) {
  this.wasPlayingBeforeMute[bus as 'music' | 'ambient'] = true;
  player.pause();
}
// When coming back from zero:
else if (effectiveVolume > 0 && this.wasPlayingBeforeMute[bus as 'music' | 'ambient']) {
  this.wasPlayingBeforeMute[bus as 'music' | 'ambient'] = false;
  player.play();
}
```

---

## Priority Summary

| # | Fix | Effort | Priority |
|---|-----|--------|----------|
| 1 | Fix `disposeAll` type error | 5 min | High |
| 2 | Add WebAudio unit tests | 2–3 h | High |
| 3 | Cap SFX pool on low-memory | 30 min | Medium |
| 4 | Move `muted` out of fade loop | 15 min | Medium |
| 5 | Add `WEB_PRELOAD_SFX` comment | 2 min | Low |
| 6 | Log GLTF warn | 2 min | Low |
| 7 | Guard slider-play | 20 min | Low |
