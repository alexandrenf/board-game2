import { COLORS } from '@/src/constants/colors';
import { theme } from '@/src/styles/theme';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ONLINE_AUTO_DISMISS_MS = 3000;

export const NetworkBadge: React.FC = () => {
  const insets = useSafeAreaInsets();
  const networkStatus = useNetworkStatus();
  const isOffline = networkStatus === 'offline';
  const animRef = useRef(new Animated.Value(0));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOfflineRef = useRef(isOffline);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const anim = animRef.current;
    const wasOffline = prevOfflineRef.current;
    prevOfflineRef.current = isOffline;

    if (isOffline) {
      clearTimer();
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
      }).start();
    } else if (wasOffline) {
      clearTimer();
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
      }).start(() => {
        timerRef.current = setTimeout(() => {
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, ONLINE_AUTO_DISMISS_MS);
      });
    }

    return clearTimer;
  }, [isOffline, clearTimer]);

  if (Platform.OS !== 'web') return null;

  const translateY = animRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  const opacity = animRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { translateY, opacity, top: insets.top + 8 }]}
    >
      <Pressable
        style={[theme.card, styles.badge, isOffline ? styles.badgeOffline : styles.badgeOnline]}
        accessibilityRole="button"
        accessibilityLabel={isOffline ? 'Sem conexão — Modo solo disponível' : 'Conectado'}
      >
        <View style={[styles.dot, isOffline ? styles.dotOffline : styles.dotOnline]} />
        <Text style={styles.label}>
          {isOffline ? 'Offline — Modo solo' : 'Online'}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9998,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  badgeOnline: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.success,
  },
  badgeOffline: {
    backgroundColor: '#FFF3E0',
    borderColor: COLORS.warning,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  dotOnline: {
    backgroundColor: COLORS.success,
    borderColor: '#1B5E20',
  },
  dotOffline: {
    backgroundColor: COLORS.warning,
    borderColor: '#E65100',
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
});