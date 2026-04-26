import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Calls `onClose` when Escape key is pressed (web only).
 * No-op on native platforms.
 */
export function useEscapeToClose(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, enabled]);
}
