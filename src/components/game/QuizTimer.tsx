import { COLORS } from '@/src/constants/colors';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type QuizTimerProps = {
  durationMs: number;
  startedAt: number;
  onTimeout: () => void;
  paused?: boolean;
};

const getTimerColor = (remainingMs: number): string => {
  if (remainingMs > 60_000) return '#9AE6B4';
  if (remainingMs > 30_000) return '#FAE8A4';
  return '#F8A5A5';
};

export const QuizTimer: React.FC<QuizTimerProps> = ({
  durationMs,
  startedAt,
  onTimeout,
  paused = false,
}) => {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, durationMs - (Date.now() - startedAt))
  );
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    timedOutRef.current = false;
    setRemainingMs(Math.max(0, durationMs - (Date.now() - startedAt)));
  }, [durationMs, startedAt]);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      const nextRemainingMs = Math.max(0, durationMs - (Date.now() - startedAt));
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        onTimeoutRef.current();
      }
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [durationMs, paused, startedAt]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: durationMs > 0 ? remainingMs / durationMs : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();

    return () => {
      progressAnim.stopAnimation();
    };
  }, [durationMs, progressAnim, remainingMs]);

  const seconds = Math.ceil(remainingMs / 1000);
  const color = getTimerColor(remainingMs);
  const progressWidth = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [progressAnim]
  );

  return (
    <View style={styles.container} accessibilityLabel={`Tempo restante: ${seconds} segundos`}>
      <View style={[styles.timerCircle, { borderColor: color }]}>
        <Text style={styles.secondsText}>{seconds}</Text>
        <Text style={styles.secondsLabel}>seg</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  timerCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    backgroundColor: '#FFF8EE',
  },
  secondsText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: COLORS.text,
  },
  secondsLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
    backgroundColor: '#E5D5BF',
  },
  progressFill: {
    height: '100%',
  },
});
