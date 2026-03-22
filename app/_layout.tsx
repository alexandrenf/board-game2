import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PWAPrompt } from '@/src/components/ui/PWAPrompt';
import { convexClient } from '@/src/services/multiplayer/convexClient';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const content = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <PWAPrompt />
    </ThemeProvider>
  );

  if (!convexClient) {
    return content;
  }

  return <ConvexProvider client={convexClient}>{content}</ConvexProvider>;
}
