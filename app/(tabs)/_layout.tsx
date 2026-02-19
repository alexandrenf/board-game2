import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';

export default function TabLayout() {
  const gameStatus = useGameStore((state) => state.gameStatus);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopColor: COLORS.text,
          borderTopWidth: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarStyle: gameStatus === 'playing' ? { display: 'none' } : undefined,
          tabBarIcon: ({ color }) => <AppIcon size={20} name="house" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <AppIcon size={20} name="compass" color={color} />,
        }}
      />
    </Tabs>
  );
}
