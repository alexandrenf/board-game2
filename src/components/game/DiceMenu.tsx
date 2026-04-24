import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CanvasErrorBoundary } from '@/src/components/game/CanvasErrorBoundary';
import { FallbackDice } from '@/src/components/game/FallbackDice';
import { COLORS } from '@/src/constants/colors';
import { Dice3D } from '@/src/game/Dice3D';
import { useGameStore } from '@/src/game/state/gameState';
import { Canvas } from '@/src/lib/r3f/canvas';
import { isWebGLAvailable } from '@/src/utils/webgl';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type DiceMenuProps = {
  canRoll?: boolean;
  isRolling?: boolean;
  isMoving?: boolean;
  renderQuality?: 'low' | 'medium' | 'high';
  onRoll?: () => void;
  idleLabel?: string;
  rollingLabel?: string;
  disabledLabel?: string;
  testID?: string;
};

export const DiceMenu: React.FC<DiceMenuProps> = (props) => {
  const {
    canRoll,
    isRolling,
    isMoving,
    renderQuality,
    onRoll,
    idleLabel = 'JOGAR',
    rollingLabel = 'ROLANDO',
    disabledLabel = 'ESPERA',
    testID = 'btn-roll-dice',
  } = props;
  const isRollingControlled = typeof props.isRolling !== 'undefined';
  const isMovingControlled = typeof props.isMoving !== 'undefined';
  const storeIsRolling = useGameStore((s) => s.isRolling);
  const storeIsMoving = useGameStore((s) => s.isMoving);
  const storeRenderQuality = useGameStore((s) => s.renderQuality);
  const storeShowEducationalModal = useGameStore((s) => s.showEducationalModal);
  const storeQuizPhase = useGameStore((s) => s.quizPhase);
  const storeRollDice = useGameStore((s) => s.rollDice);
  const resolvedIsRolling = isRolling ?? storeIsRolling;
  const resolvedIsMoving = isMoving ?? storeIsMoving;
  const resolvedRenderQuality = renderQuality ?? storeRenderQuality;
  const resolvedCanRoll =
    (canRoll ?? true) &&
    !resolvedIsRolling &&
    !resolvedIsMoving &&
    !storeShowEducationalModal &&
    storeQuizPhase === 'idle';
  const show3DDicePreview = resolvedRenderQuality !== 'low' && isWebGLAvailable();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (resolvedCanRoll) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.10,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.88,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [opacityAnim, pulseAnim, resolvedCanRoll]);

  const handleRoll = () => {
    if (!resolvedCanRoll) return;
    (onRoll ?? storeRollDice)();
  };

  return (
    <View style={styles.diceMenuWrapper}>
      <AnimatedButton testID={testID} onPress={handleRoll} disabled={!resolvedCanRoll} hapticStyle="heavy">
        <Animated.View
          testID="panel-dice-menu"
          style={[
            styles.diceContainer,
            { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
          ]}
        >
          {show3DDicePreview ? (
            <View style={styles.diceCanvasWrapper}>
              <CanvasErrorBoundary fallback={<View style={styles.diceCanvasFallback} />}>
                <Canvas camera={{ position: [0, 0, 4] }}>
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[2, 5, 2]} intensity={1} />
                  <Dice3D
                    isRollingOverride={isRollingControlled ? resolvedIsRolling : undefined}
                    isMovingOverride={isMovingControlled ? resolvedIsMoving : undefined}
                  />
                </Canvas>
              </CanvasErrorBoundary>
            </View>
          ) : (
            <View style={styles.diceFallbackWrapper}>
              <FallbackDice />
            </View>
          )}
          <View style={[styles.rollLabelContainer, !resolvedCanRoll && styles.rollLabelContainerDisabled]}>
            <View style={styles.rollLabelContent}>
              {resolvedIsRolling && (
                <AppIcon
                  name="dice"
                  size={12}
                  color={resolvedCanRoll ? '#FFF' : COLORS.textMuted}
                />
              )}
              <Text style={[styles.rollLabel, !resolvedCanRoll && styles.rollLabelDisabled]}>
                {resolvedIsRolling ? rollingLabel : resolvedCanRoll ? idleLabel : disabledLabel}
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
    backgroundColor: '#FFF5EB',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  diceCanvasFallback: {
    flex: 1,
    backgroundColor: '#F6EBD5',
  },
  diceFallbackWrapper: {
    width: 80,
    height: 80,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: COLORS.text,
    backgroundColor: '#FFF5EB',
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
    backgroundColor: '#C4B5A0',
    borderColor: '#A09080',
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
