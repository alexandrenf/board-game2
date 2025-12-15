import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { COLORS } from '@/src/constants/colors';
import { Dice3D } from '@/src/game/Dice3D';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import { Canvas } from '@react-three/fiber/native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export const DiceMenu: React.FC = () => {
  const { rollDice, isRolling, isMoving } = useGameStore();
  const canRoll = !isRolling && !isMoving;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (canRoll) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [canRoll, pulseAnim]);

  const handleRoll = () => {
    if (canRoll) {
      triggerHaptic('heavy');
      rollDice();
    }
  };

  return (
    <View style={styles.diceMenuWrapper}>
      <AnimatedButton onPress={handleRoll} disabled={!canRoll} hapticStyle="heavy">
        <Animated.View 
          style={[
            styles.diceContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.diceCanvasWrapper} pointerEvents="none">
            <Canvas camera={{ position: [0, 0, 4] }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[2, 5, 2]} intensity={1} />
              <Dice3D />
            </Canvas>
          </View>
          <View style={[styles.rollLabelContainer, !canRoll && styles.rollLabelContainerDisabled]}>
            <Text style={[styles.rollLabel, !canRoll && styles.rollLabelDisabled]}>
              {isRolling ? '🎲' : canRoll ? 'JOGAR' : 'ESPERA'}
            </Text>
          </View>
        </Animated.View>
      </AnimatedButton>
    </View>
  );
};

const styles = StyleSheet.create({
  diceMenuWrapper: {
    alignItems: 'center',
  },
  diceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  diceCanvasWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  rollLabelContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  rollLabelContainerDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#BDBDBD',
  },
  rollLabel: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  rollLabelDisabled: {
    color: COLORS.textMuted,
  },
});
