import { AppIcon } from '@/src/components/ui/AppIcon';
import { Card3D } from '@/src/components/ui/Card3D';
import { COLORS } from '@/src/constants/colors';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF006E', '#8338EC', '#3A86FF'];

interface ConfettiParticleProps {
  delay: number;
  color: string;
  startX: number;
  screenHeight: number;
  shapeIndex?: number;
}

const getConfettiShape = (index: number): { width: number; height: number; borderRadius: number; rotation?: string } => {
  switch (index % 5) {
    case 0: return { width: 12, height: 12, borderRadius: 3 };
    case 1: return { width: 12, height: 12, borderRadius: 6 };
    case 2: return { width: 8, height: 16, borderRadius: 2 };
    case 3: return { width: 14, height: 14, borderRadius: 1, rotation: '45deg' };
    case 4: return { width: 10, height: 10, borderRadius: 0 };
    default: return { width: 12, height: 12, borderRadius: 3 };
  }
};

const PARTICLE_COUNT = 35;

const ConfettiParticleInner: React.FC<ConfettiParticleProps> = ({
  delay,
  color,
  startX,
  screenHeight,
  shapeIndex = 0,
}) => {
  const shape = useMemo(() => getConfettiShape(shapeIndex), [shapeIndex]);

  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    const swayAmount = 15 + Math.random() * 15;
    const swayDuration = 400 + Math.random() * 300;
    const fallDuration = 2500 + Math.random() * 1500;
    const driftAmount = (Math.random() - 0.5) * 120;

    translateY.value = withDelay(
      delay,
      withTiming(screenHeight + 50, { duration: fallDuration, easing: Easing.out(Easing.cubic) }),
    );
    translateX.value = withDelay(
      delay,
      withTiming(startX + driftAmount, { duration: 3000 }),
    );
    sway.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(swayAmount, { duration: swayDuration }),
          withTiming(-swayAmount, { duration: swayDuration }),
        ),
        -1,
      ),
    );
    rotate.value = withDelay(
      delay,
      withTiming(720 + Math.random() * 360, { duration: 3000 }),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 800 }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [delay, screenHeight, startX]);

  const baseRotation = shape.rotation;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value + sway.value },
      { rotate: `${rotate.value}deg` },
      ...(baseRotation ? [{ rotate: baseRotation }] : []),
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          width: shape.width,
          height: shape.height,
          borderRadius: shape.borderRadius,
        },
        animatedStyle,
      ]}
    />
  );
};

const ConfettiParticle = React.memo(ConfettiParticleInner);

const CelebrationCounter: React.FC<{ target: number; suffix?: string; style?: any }> = ({
  target,
  suffix = '',
  style,
}) => {
  const [display, setDisplay] = useState(0);
  const counter = useSharedValue(0);

  const handleUpdate = useCallback((value: number) => {
    setDisplay(Math.round(value));
  }, []);

  useEffect(() => {
    counter.value = 0;
    counter.value = withDelay(
      600,
      withTiming(target, { duration: 1200, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(handleUpdate)(target);
        }
      }),
    );
  }, [target, counter, handleUpdate]);

  useAnimatedReaction(
    () => counter.value,
    (current, previous) => {
      if (previous === null || Math.round(current) !== Math.round(previous)) {
        runOnJS(handleUpdate)(current);
      }
    },
    [handleUpdate],
  );

  return <Text style={style}>{display}{suffix}</Text>;
};

interface CelebrationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  visible,
  onDismiss,
  title = 'PARABÉNS!',
  subtitle = 'Você concluiu o percurso educativo.',
  buttonLabel = 'CONTINUAR',
}) => {
  const scaleAnim = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const goldenGlowOpacity = useSharedValue(0);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      triggerHaptic('success');
      flashOpacity.value = 0.4;
      flashOpacity.value = withTiming(0, { duration: 300 });
      goldenGlowOpacity.value = withDelay(300, withTiming(0.15, { duration: 500 }));
      scaleAnim.value = withSpring(1, { velocity: 0, damping: 14, stiffness: 120 });
    } else {
      scaleAnim.value = 0;
      flashOpacity.value = 0;
      goldenGlowOpacity.value = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: goldenGlowOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.celebrationOverlay}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF' }, flashStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFD700' }, glowStyle]}
        pointerEvents="none"
      />

      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 30}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
          startX={(i / PARTICLE_COUNT) * width}
          screenHeight={height}
          shapeIndex={i}
        />
      ))}

      <ScrollView
        contentContainerStyle={styles.celebrationContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.celebrationCard, cardStyle]}>
          <View style={styles.ribbonBar}>
            <View style={styles.ribbonSegment} />
            <View style={[styles.ribbonSegment, { backgroundColor: '#FFD700' }]} />
            <View style={styles.ribbonSegment} />
          </View>

          <AppIcon
            name="champagne-glasses"
            size={64}
            color={COLORS.gold}
            style={styles.celebrationEmoji}
          />
          <Text style={styles.celebrationTitle}>{title}</Text>
          <Text style={styles.celebrationSubtitle}>{subtitle}</Text>

          <View style={styles.celebrationStats}>
            <View style={styles.celebrationStatItem}>
              <AppIcon name="book-open" size={28} color={COLORS.warning} />
              <CelebrationCounter target={100} suffix="%" style={styles.celebrationStatValue} />
              <Text style={styles.celebrationStatLabel}>Conteúdo revisado</Text>
            </View>
            <View style={styles.celebrationStatItem}>
              <AppIcon name="shield-heart" size={28} color={COLORS.warning} />
              <CelebrationCounter target={100} suffix="%" style={styles.celebrationStatValue} />
              <Text style={styles.celebrationStatLabel}>Prevenção reforçada</Text>
            </View>
          </View>

          <Card3D
            height={56}
            borderRadius={16}
            theme="orange"
            depth={7}
            haptic="medium"
            onPress={onDismiss}
            testID="celebration-continue-button"
            accessibilityLabel="Continuar para o menu"
            style={styles.celebrationButton}
          >
            <View style={styles.celebrationButtonInner}>
              <Text style={styles.celebrationButtonText}>{buttonLabel}</Text>
            </View>
          </Card3D>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 100,
  },
  celebrationContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  celebrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  ribbonBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 6,
  },
  ribbonSegment: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
    marginTop: 10,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  celebrationSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  celebrationStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
    marginBottom: 24,
  },
  celebrationStatItem: {
    alignItems: 'center',
  },
  celebrationStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  celebrationStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  celebrationButton: {
    marginTop: 4,
  },
  celebrationButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  confettiParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});