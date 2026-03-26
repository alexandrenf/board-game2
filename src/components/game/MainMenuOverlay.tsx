import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { BRAND, COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────
// Decorative stripe bar (rainbow brand colors)
// ─────────────────────────────────────────────
const STRIPE_COLORS = [
  BRAND.orange,
  BRAND.pink,
  BRAND.red,
  BRAND.purple,
  BRAND.blue,
  BRAND.green,
  BRAND.teal,
];

const TopStripeBar: React.FC = () => (
  <View style={styles.topStripeBar} pointerEvents="none">
    {STRIPE_COLORS.map((color, i) => (
      <View key={i} style={[styles.topStripe, { backgroundColor: color }]} />
    ))}
  </View>
);

// ─────────────────────────────────────────────
// Pulsing glow behind CTA
// ─────────────────────────────────────────────
const PulseGlow: React.FC = () => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.12, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.pulseGlow,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
};

// ─────────────────────────────────────────────
// Animated progress bar with sparkle at leading edge
// ─────────────────────────────────────────────
const AnimatedProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 800,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (progress > 0 && progress < 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(sparkleAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [progress, fillAnim, sparkleAnim]);

  const widthPercent = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: widthPercent as any }]}>
        {progress > 0 && progress < 100 && (
          <Animated.View
            style={[
              styles.progressSparkle,
              { opacity: sparkleOpacity },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Animated counter for stat chips
// ─────────────────────────────────────────────
const AnimatedCounter: React.FC<{ value: number; style?: any }> = ({ value, style }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(0);
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: value,
      duration: 600,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      if (rounded !== displayRef.current) {
        displayRef.current = rounded;
        setDisplay(rounded);
      }
    });

    return () => animValue.removeListener(listener);
  }, [value, animValue]);

  return <Text style={style}>{display}</Text>;
};

// ─────────────────────────────────────────────
// Floating decorative shapes behind hero
// ─────────────────────────────────────────────
const FLOATING_SHAPES = [
  { size: 14, color: BRAND.orange, top: 10, left: 15, speed: 3200 },
  { size: 10, color: BRAND.pink, top: 55, left: 75, speed: 2800 },
  { size: 12, color: BRAND.green, top: 30, left: 85, speed: 3600 },
  { size: 8, color: BRAND.purple, top: 70, left: 25, speed: 3000 },
  { size: 16, color: BRAND.teal, top: 45, left: 50, speed: 4000 },
];

const FloatingShapes: React.FC = () => {
  const anims = useRef(FLOATING_SHAPES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: FLOATING_SHAPES[i].speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: FLOATING_SHAPES[i].speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [anims]);

  return (
    <>
      {FLOATING_SHAPES.map((shape, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        });
        const opacity = anims[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.15, 0.3, 0.15],
        });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.floatingShape,
              {
                width: shape.size,
                height: shape.size,
                borderRadius: shape.size / 2,
                backgroundColor: shape.color,
                top: `${shape.top}%`,
                left: `${shape.left}%`,
                transform: [{ translateY }],
                opacity,
              },
            ]}
          />
        );
      })}
    </>
  );
};

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────
export const MainMenuOverlay: React.FC = () => {
  const {
    startGame,
    restartGame,
    resetGame,
    setShowCustomization,
    setGameStatus,
    openHelpCenter,
    playerIndex,
    path,
  } = useGameStore();

  const insets = useSafeAreaInsets();

  const progress = Math.round((playerIndex / Math.max(1, path.length - 1)) * 100);
  const isComplete = playerIndex === path.length - 1 && path.length > 1;
  const stepsRemaining = Math.max(0, Math.max(1, path.length - 1) - playerIndex);
  const isContinuing = !isComplete && playerIndex > 0;

  const mainAction = isComplete
    ? { icon: 'rotate-right', label: 'NOVA JORNADA SOLO' }
    : isContinuing
    ? { icon: 'play', label: 'CONTINUAR SOLO' }
    : { icon: 'rocket', label: 'INICIAR SOLO' };

  // Staggered entrance animations
  const heroSlide = useRef(new Animated.Value(-30)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(60)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  // Individual button fade-ins (staggered)
  const btnAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current;

  const runEntrance = useCallback(() => {
    // Hero title slides down and fades in
    Animated.parallel([
      Animated.spring(heroSlide, {
        toValue: 0,
        useNativeDriver: true,
        speed: 10,
        bounciness: 6,
      }),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Panel slides up and fades in (delayed)
    Animated.parallel([
      Animated.spring(panelSlide, {
        toValue: 0,
        useNativeDriver: true,
        speed: 10,
        bounciness: 6,
        delay: 150,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 350,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Buttons fade in sequentially
    btnAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        delay: 350 + i * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [heroSlide, heroOpacity, panelSlide, panelOpacity, btnAnims]);

  useEffect(() => {
    runEntrance();
  }, [runEntrance]);

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Top color stripe bar */}
      <View style={{ marginTop: insets.top }} pointerEvents="none">
        <TopStripeBar />
      </View>

      {/* Hero title block with staggered entrance */}
      <Animated.View
        style={[
          styles.heroBlock,
          { marginTop: insets.top + 40 },
          {
            transform: [{ translateY: heroSlide }],
            opacity: heroOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <FloatingShapes />
        {/* Brand label — warm frame style */}
        <View style={styles.brandLabelBox}>
          <Text style={styles.brandLabelText}>JUVENTUDE PROTAGONISTA</Text>
        </View>

        {/* Giant game name */}
        <Text style={styles.gameTitle}>
          JOGO DA{'\n'}PREVENÇÃO
        </Text>

        {/* Tagline */}
        <View style={styles.taglineBox}>
          <Text style={styles.taglineText}>
            Aprenda brincando sobre HIV/AIDS{'\n'}e outras infecções transmissíveis
          </Text>
        </View>
      </Animated.View>

      {/* Bottom panel — warm frame with slide-up entrance */}
      <Animated.View
        style={[
          styles.panelFrame,
          { paddingBottom: insets.bottom + 16 },
          {
            transform: [{ translateY: panelSlide }],
            opacity: panelOpacity,
          },
        ]}
      >
        <View style={styles.panelInner}>
          {/* Status heading — warm brown bar */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {isComplete ? '🏆 PERCURSO CONCLUÍDO' : 'PRONTO PARA JOGAR'}
            </Text>
          </View>

          {/* Progress with animated bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROGRESSO</Text>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{progress}%</Text>
              </View>
            </View>
            <AnimatedProgressBar progress={progress} />
          </View>

          {/* Stat chips with animated counters */}
          <View style={styles.statRow}>
            <View style={styles.statChip}>
              <AnimatedCounter value={playerIndex} style={styles.statNumber} />
              <Text style={styles.statLabel}>PASSOS</Text>
            </View>
            <View style={styles.statChip}>
              <AnimatedCounter value={stepsRemaining} style={styles.statNumber} />
              <Text style={styles.statLabel}>FALTAM</Text>
            </View>
            <View style={[styles.statChip, isComplete && styles.statChipComplete]}>
              {isComplete ? (
                <AppIcon name="check" size={16} color={BRAND.green} />
              ) : (
                <View style={styles.statusDot} />
              )}
              <Text style={[styles.statLabel, { marginTop: 3 }]}>
                {isComplete ? 'FIM' : 'EM JOGO'}
              </Text>
            </View>
          </View>

          {/* CTA button — staggered fade */}
          <Animated.View style={[styles.ctaWrapper, { opacity: btnAnims[0] }]}>
            <PulseGlow />
            <AnimatedButton
              style={styles.ctaButton}
              testID="btn-start-or-continue-game"
              onPress={() => {
                if (isComplete) restartGame();
                else startGame();
              }}
              hapticStyle="success"
            >
              <View style={styles.ctaInner}>
                <AppIcon name={mainAction.icon} size={22} color="#FFF" />
                <Text style={styles.ctaText}>{mainAction.label}</Text>
                <AppIcon name="arrow-right" size={16} color="#FFF" />
              </View>
            </AnimatedButton>
          </Animated.View>

          <Animated.View style={[styles.ctaWrapperSecondary, { opacity: btnAnims[1] }]}>
            <AnimatedButton
              style={styles.ctaButtonSecondary}
              testID="btn-open-multiplayer-menu"
              onPress={() => setGameStatus('multiplayer')}
              hapticStyle="medium"
            >
              <View style={styles.ctaInner}>
                <AppIcon name="users" size={20} color={COLORS.text} />
                <Text style={styles.ctaSecondaryText}>MULTIPLAYER</Text>
                <AppIcon name="arrow-right" size={16} color={COLORS.text} />
              </View>
            </AnimatedButton>
          </Animated.View>

          {/* Secondary buttons — staggered fade */}
          <View style={styles.secondaryRow}>
            <Animated.View style={[styles.secondaryBtnWrapper, { opacity: btnAnims[2] }]}>
              <AnimatedButton
                style={styles.secondaryBtn}
                testID="btn-open-rules-from-menu"
                onPress={() => openHelpCenter('como-jogar')}
                hapticStyle="light"
                accessibilityLabel="Abrir central de ajuda"
              >
                <AppIcon name="book-open" size={16} color={COLORS.text} />
                <Text style={styles.secondaryBtnText}>APRENDER</Text>
              </AnimatedButton>
            </Animated.View>

            <Animated.View style={[styles.secondaryBtnWrapper, { opacity: btnAnims[3] }]}>
              <AnimatedButton
                style={styles.secondaryBtn}
                testID="btn-open-customization-from-menu"
                onPress={() => setShowCustomization(true)}
                hapticStyle="light"
                accessibilityLabel="Personalizar personagem"
              >
                <AppIcon name="shirt" size={16} color={COLORS.text} />
                <Text style={styles.secondaryBtnText}>PERSONALIZAR</Text>
              </AnimatedButton>
            </Animated.View>

            <Animated.View style={[styles.secondaryBtnWrapper, { opacity: btnAnims[4] }]}>
              <AnimatedButton
                style={styles.secondaryBtn}
                testID="btn-reset-game-from-menu"
                onPress={resetGame}
                hapticStyle="light"
                accessibilityLabel="Resetar jogo"
              >
                <AppIcon name="clock-rotate-left" size={16} color={COLORS.text} />
                <Text style={styles.secondaryBtnText}>RESETAR JOGO</Text>
              </AnimatedButton>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Styles — Brutalist + Warm Game Palette
// ─────────────────────────────────────────────
const FRAME_OUTER = '#4E2C17';
const FRAME_BG = '#8A5A34';
const PANEL_BG = '#F7EBD9';
const TRACK_BG = '#E5D5BF';
const TRACK_BORDER = '#B78D5F';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Top stripe bar ──
  topStripeBar: {
    flexDirection: 'row',
    height: 6,
    borderBottomWidth: 2,
    borderBottomColor: FRAME_OUTER,
  },
  topStripe: {
    flex: 1,
  },

  // ── Hero block ──
  heroBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'flex-start',
    zIndex: 3,
  },
  brandLabelBox: {
    backgroundColor: BRAND.orange,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.normal,
    borderColor: FRAME_OUTER,
    ...theme.shadows.sm,
    marginBottom: 8,
  },
  brandLabelText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  gameTitle: {
    fontSize: 50,
    lineHeight: 52,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    textShadowColor: FRAME_OUTER,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  taglineBox: {
    marginTop: 10,
    backgroundColor: 'rgba(78,44,23,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.orange,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 17,
    letterSpacing: 0.3,
  },

  // ── Floating decorative shapes ──
  floatingShape: {
    position: 'absolute',
    zIndex: -1,
  },

  // ── Bottom panel — warm wooden frame ──
  panelFrame: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: FRAME_BG,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    borderTopWidth: theme.borderWidth.normal,
    borderLeftWidth: theme.borderWidth.normal,
    borderRightWidth: theme.borderWidth.normal,
    borderColor: FRAME_OUTER,
    zIndex: 10,
    ...theme.shadows.lg,
  },
  panelInner: {
    backgroundColor: PANEL_BG,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.thin,
    borderColor: TRACK_BORDER,
    padding: 16,
    gap: 12,
    borderBottomWidth: 0,
  },

  // Status bar — warm brown
  statusBar: {
    backgroundColor: FRAME_BG,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: FRAME_OUTER,
    marginTop: -4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },

  // Progress
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#5B351E',
    letterSpacing: 2,
  },
  progressBadge: {
    backgroundColor: FRAME_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
    borderWidth: theme.borderWidth.thin,
    borderColor: FRAME_OUTER,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 14,
    backgroundColor: TRACK_BG,
    borderRadius: 7,
    borderWidth: theme.borderWidth.thin,
    borderColor: TRACK_BORDER,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND.orange,
    borderRadius: 7,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  progressSparkle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 2,
  },

  // Stat chips
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFF7EC',
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: TRACK_BORDER,
  },
  statChipComplete: {
    backgroundColor: '#ECFDF5',
    borderColor: BRAND.green,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#5B351E',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#5B351E',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND.orange,
    borderWidth: 2,
    borderColor: FRAME_OUTER,
  },

  // CTA
  ctaWrapper: {
    marginTop: 2,
  },
  ctaWrapperSecondary: {
    marginTop: 10,
  },
  pulseGlow: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: BRAND.orange,
  },
  ctaButton: {
    backgroundColor: BRAND.orange,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.thick,
    borderColor: FRAME_OUTER,
    ...theme.shadows.md,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  ctaButtonSecondary: {
    backgroundColor: '#FFF6EB',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: FRAME_OUTER,
    ...theme.shadows.sm,
  },
  ctaSecondaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.8,
  },

  // Secondary buttons
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  secondaryBtnWrapper: {
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    ...theme.shadows.sm,
  },
  secondaryBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    textAlign: 'center',
    flexShrink: 1,
  },
});
