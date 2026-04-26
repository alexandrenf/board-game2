import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useEscapeToClose = (onClose: () => void, enabled: boolean = true) => {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, enabled]);
};
