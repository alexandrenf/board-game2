import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Calls `onClose` when Escape key is pressed (web only).
 * No-op on native platforms.
 *
 * Only attaches a listener when `enabled` is true — i.e., when a modal
 * actually wants to consume the Escape key. We deliberately do NOT call
 * `preventDefault()` so that native browser behavior (closing tooltips,
 * exiting fullscreen, etc.) is preserved alongside the modal close.
 */
export function useEscapeToClose(onClose: () => void, enabled = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
