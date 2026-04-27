# Fix 8 Issues — Implementation Plan

## Approved decisions
- **Issue 1:** Upgrade three to `0.168.0`, remove resolutions/overrides
- **Issue 2:** Remove zustand Metro override entirely
- **Issue 3:** Change `useNativeDriver: false` → `true` in CustomizationModal
- **Issue 4:** Write unit tests (PWA/web-only focus)
- **Issue 5:** Revert score pill text color from `#FFF` to `#5B351E`
- **Issue 6:** Extract renderer disposal to shared utility
- **Issue 7:** Add glassmorphism color tokens to `colors.ts`
- **Issue 8:** Refactor `useEscapeToClose` to use ref pattern

---

## Issue 1 — Upgrade three to 0.168.0

**File:** `package.json`

| Line | Change |
|------|--------|
| 33 | `"@types/three": "0.160.0"` → `"@types/three": "0.168.0"` |
| 65 | `"three": "0.160.0"` → `"three": "0.168.0"` |
| 83-86 | Remove `resolutions` block (`"three": "0.160.0"`, `"@types/three": "0.160.0"`) |
| 87-90 | Remove `overrides` block (same) |

Then: `rm -rf node_modules && npm install`

---

## Issue 2 — Remove zustand Metro override

**File:** `metro.config.js`

Remove lines 19 and 39-49:
- Delete `const zustandPackagePath = ...` (line 19)
- Delete the entire `if (moduleName === 'zustand' || ...)` block (lines 39-49)

---

## Issue 3 — Enable native driver in CustomizationModal

**File:** `src/components/game/CustomizationModal.tsx`

- Line 362: `useNativeDriver: false` → `useNativeDriver: true`
- Line 373: `useNativeDriver: false` → `useNativeDriver: true`

---

## Issue 4 — Add unit tests

### `src/components/ui/__tests__/GlassPanel.test.tsx`

Test:
- Platform.OS === 'web' → renders View with backdropFilter
- Platform.OS !== 'web' → renders BlurView
- Each intensity variant (light/regular/strong) applies correct props
- borderRadius and custom style props pass through

### `src/hooks/__tests__/useEscapeToClose.test.ts`

Test:
- Adds keydown listener on web when enabled
- Removes listener on cleanup
- No listener added when enabled=false
- Does nothing on non-web platforms

### `src/game/__tests__/PostFX.test.tsx`

Test:
- Renders Bloom with expected intensity/luminanceThreshold props
- Renders Vignette with expected offset/darkness/blendFunction props
- Does not crash

---

## Issue 5 — Fix contrast in score pills

**File:** `src/components/game/GamePlayingHUD.tsx:640`

`color: '#FFF'` → `color: '#5B351E'`

---

## Issue 6 — Extract renderer disposal utility

### New file: `src/utils/three.ts`

```typescript
import type { WebGLRenderer } from 'three';
import type { MutableRefObject } from 'react';

export function safeDisposeRenderer(rendererRef: MutableRefObject<WebGLRenderer | null>) {
  const renderer = rendererRef.current;
  if (!renderer) return;
  try {
    renderer.dispose();
    if (typeof document !== 'undefined' && renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  } catch {
    // Renderer may already be disposed
  }
  rendererRef.current = null;
}
```

### Update three files to use it:

| File | Lines | Replace |
|------|-------|---------|
| `src/game/GameScene.tsx` | 131-146 | inline `useEffect` cleanup → `safeDisposeRenderer(rendererRef)` |
| `src/components/game/CustomizationModal.tsx` | 106-119 | inline cleanup → `safeDisposeRenderer(rendererRef)` |
| `src/components/game/DiceMenu.tsx` | 60-88 | inline cleanup → `safeDisposeRenderer(rendererRef)` |

---

## Issue 7 — Add glassmorphism color tokens

### `src/constants/colors.ts`

Add after line 50:

```typescript
export const GLASS = {
  lightBg: 'rgba(255,255,255,0.15)',
  regularBg: 'rgba(255,255,255,0.25)',
  strongBg: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.5)',
} as const;
```

### `src/components/ui/GlassPanel.tsx`

Replace hardcoded rgba strings with `GLASS.*` references.

---

## Issue 8 — Stabilize `useEscapeToClose`

**File:** `src/hooks/useEscapeToClose.ts`

Replace entire file content with ref pattern (no `onClose` in deps):

```typescript
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useEscapeToClose(onClose: () => void, enabled = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
```

---

## Verification

1. `rm -rf node_modules && npm install`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. Manual: Bloom/Vignette render correctly
6. Manual: Score pills readable
7. Manual: Escape key closes modals on web
