import { COLORS } from '@/src/constants/colors';
import { audioManager } from '@/src/services/audio/audioManager';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

/** Props for the {@link QuizTimer} component. */
type QuizTimerProps = {
  durationMs: number;
  startedAt: number;
  onTimeout: () => void;
  paused?: boolean;
};

/** Returns a traffic-light color based on how much quiz time remains. */
const getTimerColor = (remainingMs: number): string => {
  if (remainingMs > 60_000) return '#9AE6B4';
  if (remainingMs > 30_000) return '#FAE8A4';
  return '#F8A5A5';
};

/** Circular countdown timer with a progress bar for quiz answering. */
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
  const countdownAudioStartedRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    timedOutRef.current = false;
    countdownAudioStartedRef.current = false;
    void audioManager.stopSfx('sfx.quiz_tick');
    setRemainingMs(Math.max(0, durationMs - (Date.now() - startedAt)));
  }, [durationMs, startedAt]);

  useEffect(() => {
    return () => {
      countdownAudioStartedRef.current = false;
      void audioManager.stopSfx('sfx.quiz_tick');
    };
  }, []);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      const nextRemainingMs = Math.max(0, durationMs - (Date.now() - startedAt));
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        onTimeoutRef.current();
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [durationMs, paused, startedAt]);

  const inCountdownWindow = !paused && remainingMs > 0 && remainingMs <= 8_000;

  useEffect(() => {
    if (!inCountdownWindow) {
      if (countdownAudioStartedRef.current) {
        countdownAudioStartedRef.current = false;
        void audioManager.stopSfx('sfx.quiz_tick');
      }
      return;
    }

    if (!countdownAudioStartedRef.current) {
      countdownAudioStartedRef.current = true;
      void audioManager.playSfx('sfx.quiz_tick', { volume: 0.65 });
    }
  }, [inCountdownWindow]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: durationMs > 0 ? remainingMs / durationMs : 0,
      duration: 450,
      useNativeDriver: false,
    }).start();

    return () => {
      progressAnim.stopAnimation();
    };
  }, [durationMs, progressAnim, remainingMs]);

  const seconds = Math.ceil(remainingMs / 1000);
  const color = getTimerColor(remainingMs);
  return (
    <View style={styles.container} accessibilityLabel={`Tempo restante: ${seconds} segundos`}>
      <View style={[styles.timerCircle, { borderColor: color }]}>
        <Text style={styles.secondsText}>{seconds}</Text>
        <Text style={styles.secondsLabel}>seg</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: color,
              transform: [{ scaleX: progressAnim }],
            },
          ]}
        />
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
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    transformOrigin: 'left center',
  },
});
