import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { audioManager } from '@/src/services/audio/audioManager';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const DICE_FACES: Record<number, string> = {
  1: '\u2680',
  2: '\u2681',
  3: '\u2682',
  4: '\u2683',
  5: '\u2684',
  6: '\u2685',
};

type FallbackDiceProps = {
  isRolling?: boolean;
  currentRoll?: number | null;
};

export const FallbackDice: React.FC<FallbackDiceProps> = ({ isRolling: isRollingProp, currentRoll: currentRollProp }) => {
  const storeIsRolling = useGameStore((s) => s.isRolling);
  const storeCurrentRoll = useGameStore((s) => s.currentRoll);
  const storeCompleteRoll = useGameStore((s) => s.completeRoll);
  const isRolling = isRollingProp ?? storeIsRolling;
  const currentRoll = currentRollProp ?? storeCurrentRoll;

  const [displayNumber, setDisplayNumber] = useState(1);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRolling || isRollingProp != null) return;
    const timeout = setTimeout(() => {
      const val = Math.floor(Math.random() * 6) + 1;
      storeCompleteRoll(val);
      void audioManager.playSfx('sfx.dice_settle');
    }, 1000);
    return () => clearTimeout(timeout);
  }, [isRolling, storeCompleteRoll, isRollingProp]);

  useEffect(() => {
    if (isRolling) {
      intervalRef.current = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * 6) + 1);
      }, 80);

      const spin = Animated.loop(
        Animated.sequence([
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(spinAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
      spin.start();

      scaleAnim.setValue(0.9);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();

      return () => {
        spin.stop();
        scaleAnim.setValue(1);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      spinAnim.setValue(0);

      if (currentRoll) {
        setDisplayNumber(currentRoll);
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.25,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [isRolling, currentRoll, spinAnim, scaleAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const showResult = !isRolling && currentRoll !== null && currentRoll !== undefined;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dice,
          showResult && styles.diceResult,
          {
            transform: [{ rotate }, { scale: scaleAnim }],
          },
        ]}
      >
        {showResult ? (
          <Text style={styles.resultNumber}>{currentRoll}</Text>
        ) : (
          <Text style={styles.diceUnicode}>
            {isRolling ? DICE_FACES[displayNumber] : '\u2680'}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dice: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    backgroundColor: '#F6EBD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceResult: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.text,
  },
  diceUnicode: {
    fontSize: 30,
    color: COLORS.text,
    lineHeight: 36,
  },
  resultNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 36,
  },
});