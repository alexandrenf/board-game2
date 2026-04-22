import { AppIcon } from '@/src/components/ui/AppIcon';
import { Card3D } from '@/src/components/ui/Card3D';
import { COLORS } from '@/src/constants/colors';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

interface ConfettiParticleProps {
  delay: number;
  color: string;
  startX: number;
  screenHeight: number;
  shapeIndex?: number;
}

// Shape variants for confetti variety (5 types now)
const getConfettiShape = (index: number): { width: number; height: number; borderRadius: number; rotation?: string } => {
  switch (index % 5) {
    case 0: return { width: 12, height: 12, borderRadius: 3 }; // Square
    case 1: return { width: 12, height: 12, borderRadius: 6 }; // Circle
    case 2: return { width: 8, height: 16, borderRadius: 2 }; // Rectangle
    case 3: return { width: 14, height: 14, borderRadius: 1, rotation: '45deg' }; // Diamond
    case 4: return { width: 10, height: 10, borderRadius: 0 }; // Tiny square
    default: return { width: 12, height: 12, borderRadius: 3 };
  }
};

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({ delay, color, startX, screenHeight, shapeIndex = 0 }) => {
  const shape = getConfettiShape(shapeIndex);
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight + 50,
          duration: 2500 + Math.random() * 1500,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX + (Math.random() - 0.5) * 120,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sway, {
              toValue: 15 + Math.random() * 15,
              duration: 400 + Math.random() * 300,
              useNativeDriver: true,
            }),
            Animated.timing(sway, {
              toValue: -(15 + Math.random() * 15),
              duration: 400 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(rotate, {
          toValue: 720 + Math.random() * 360,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.delay(1800),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, screenHeight, startX, translateY, translateX, rotate, opacity, sway]);

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          width: shape.width,
          height: shape.height,
          borderRadius: shape.borderRadius,
          transform: [
            { translateY },
            { translateX: Animated.add(translateX, sway) },
            { rotate: rotate.interpolate({
              inputRange: [0, 1080],
              outputRange: ['0deg', '1080deg'],
            })},
          ],
          opacity,
        },
      ]}
    />
  );
};

// Animated counter for celebration stats
const CelebrationCounter: React.FC<{ target: number; suffix?: string; style?: any }> = ({ target, suffix = '', style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: target,
      duration: 1200,
      delay: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = anim.addListener(({ value }) => {
      const rounded = Math.round(value);
      if (rounded !== displayRef.current) {
        displayRef.current = rounded;
        setDisplay(rounded);
      }
    });
    return () => anim.removeListener(listener);
  }, [target, anim]);

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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF006E', '#8338EC', '#3A86FF'];

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const goldenGlowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      triggerHaptic('success');
      // Screen flash then golden glow
      flashOpacity.setValue(0.4);
      Animated.sequence([
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(goldenGlowOpacity, {
          toValue: 0.15,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Card entrance with overshoot bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 8,
        bounciness: 14,
      }).start();
    } else {
      scaleAnim.setValue(0);
      flashOpacity.setValue(0);
      goldenGlowOpacity.setValue(0);
    }
  }, [visible, scaleAnim, flashOpacity, goldenGlowOpacity]);

  if (!visible) return null;

  return (
    <View style={styles.celebrationOverlay}>
      {/* Screen flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF', opacity: flashOpacity }]}
        pointerEvents="none"
      />
      {/* Golden glow overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFD700', opacity: goldenGlowOpacity }]}
        pointerEvents="none"
      />

      {/* Confetti with shape variety (60 particles) */}
      {Array.from({ length: 60 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 25}
          color={confettiColors[i % confettiColors.length]}
          startX={(i / 60) * width}
          screenHeight={height}
          shapeIndex={i}
        />
      ))}

      <ScrollView
        contentContainerStyle={styles.celebrationContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.celebrationCard, { transform: [{ scale: scaleAnim }] }]}>
          {/* Ribbon decoration */}
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
