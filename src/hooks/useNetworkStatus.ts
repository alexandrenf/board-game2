import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type NetworkStatus = 'online' | 'offline';

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (Platform.OS !== 'web') return 'online';
    return typeof navigator !== 'undefined' && 'onLine' in navigator
      ? navigator.onLine
        ? 'online'
        : 'offline'
      : 'online';
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const goOnline = () => setStatus('online');
    const goOffline = () => setStatus('offline');

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return status;
}