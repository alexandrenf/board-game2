import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { NetworkBadge } from '@/src/components/ui/NetworkBadge';
import { PWAPrompt } from '@/src/components/ui/PWAPrompt';
import { useGameStore } from '@/src/game/state/gameState';
import { convexClient } from '@/src/services/multiplayer/convexClient';

/**
 * Render the app's root layout with theming, navigation, status bar, and PWA prompt.
 *
 * Registers an AppState change listener that flushes game settings when the app
 * transitions to `background` or `inactive`, and removes the listener on unmount.
 *
 * @returns The root React element for the application. If a Convex client is available, the content is wrapped with a `ConvexProvider`; otherwise the content is returned directly.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        useGameStore.getState().flushSettings();
      }
    });
    return () => subscription.remove();
  }, []);

  const content = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="launch-button" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <NetworkBadge />
      <PWAPrompt />
    </ThemeProvider>
  );

  if (!convexClient) {
    return content;
  }

  return <ConvexProvider client={convexClient}>{content}</ConvexProvider>;
}
