import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { Dice3D } from '@/src/game/Dice3D';
import { useGameStore } from '@/src/game/state/gameState';
import { Canvas } from '@/src/lib/r3f/canvas';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export const DiceMenu: React.FC = () => {
  const { rollDice, isRolling, isMoving, renderQuality } = useGameStore();
  const canRoll = !isRolling && !isMoving;
  const show3DDicePreview = renderQuality === 'high';
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
      rollDice();
    }
  };

  return (
    <View style={styles.diceMenuWrapper}>
      <AnimatedButton testID="btn-roll-dice" onPress={handleRoll} disabled={!canRoll} hapticStyle="heavy">
        <Animated.View 
          testID="panel-dice-menu"
          style={[
            styles.diceContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {show3DDicePreview ? (
            <View style={styles.diceCanvasWrapper}>
              <Canvas camera={{ position: [0, 0, 4] }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[2, 5, 2]} intensity={1} />
                <Dice3D />
              </Canvas>
            </View>
          ) : (
            <View style={styles.diceFallbackWrapper}>
              <View style={styles.diceFallbackInner}>
                <AppIcon name="dice" size={30} color={COLORS.text} />
              </View>
            </View>
          )}
          <View style={[styles.rollLabelContainer, !canRoll && styles.rollLabelContainerDisabled]}>
            <View style={styles.rollLabelContent}>
              {isRolling && (
                <AppIcon
                  name="dice"
                  size={12}
                  color={canRoll ? '#FFF' : COLORS.textMuted}
                />
              )}
              <Text style={[styles.rollLabel, !canRoll && styles.rollLabelDisabled]}>
                {isRolling ? 'ROLANDO' : canRoll ? 'JOGAR' : 'ESPERA'}
              </Text>
            </View>
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
  diceFallbackWrapper: {
    width: 80,
    height: 80,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: COLORS.text,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceFallbackInner: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    backgroundColor: '#F6EBD5',
    alignItems: 'center',
    justifyContent: 'center',
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
  rollLabelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
