import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { BRAND, COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
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
// Sparkle Particles Background
// ─────────────────────────────────────────────
const SparkleParticles: React.FC = () => {
  // Create 10 static particles with random initial positions and staggered animations
  const particles = useRef(
    Array.from({ length: 10 }).map(() => ({
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 4 + Math.random() * 6,
      anim: new Animated.Value(0),
      delay: Math.random() * 2000,
      duration: 1500 + Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    const animations = particles.map((p) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, {
            toValue: 1,
            duration: p.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(p.anim, {
            toValue: 0,
            duration: p.duration * 0.8,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    Animated.parallel(animations).start();
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.sparkle,
            {
              left: p.left as any,
              top: p.top as any,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              opacity: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
              transform: [
                {
                  scale: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────
// Floating Game Icons
// ─────────────────────────────────────────────
const FloatingIcons: React.FC<{ introAnim: Animated.Value }> = ({ introAnim }) => {
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim1, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim2, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim1, floatAnim2]);

  const translateY1 = floatAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const translateY2 = floatAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });

  // Appear later in the sequence
  const scale = introAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.01, 0.01, 1],
  });

  return (
    <View style={styles.floatingIconsContainer} pointerEvents="none">
      <Animated.View style={[styles.floatingIconLeft, { transform: [{ translateY: translateY1 }, { scale }] }]}>
        <Text style={styles.emojiIcon}>🎲</Text>
      </Animated.View>
      <Animated.View style={[styles.floatingIconRight, { transform: [{ translateY: translateY2 }, { scale }] }]}>
        <Text style={styles.emojiIcon}>♟️</Text>
      </Animated.View>
    </View>
  );
};

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
// Main export
// ─────────────────────────────────────────────
export const MainMenuOverlay: React.FC = () => {
  const {
    startGame,
    restartGame,
    resetGame,
    setShowCustomization,
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
    ? { icon: 'rotate-right', label: 'NOVA JORNADA' }
    : isContinuing
    ? { icon: 'play', label: 'CONTINUAR' }
    : { icon: 'rocket', label: 'INICIAR' };

  const handleGuidedTour = () => {
    // TODO: implementar o fluxo do guia turistico.
    return;
  };

  // ── Entrance Animations ──
  const introAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(introAnim, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
      delay: 100,
    }).start();
  }, [introAnim]);

  // Derived animation values for stagger
  const logoTranslateY = introAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [-50, 0, 0] });
  const logoOpacity = introAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  
  const titleScale = introAnim.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0.8, 0.8, 1, 1] });
  const titleOpacity = introAnim.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0, 1, 1] });

  const taglineTranslateX = introAnim.interpolate({ inputRange: [0, 0.5, 0.9, 1], outputRange: [-50, -50, 0, 0] });
  const taglineOpacity = introAnim.interpolate({ inputRange: [0, 0.5, 0.9, 1], outputRange: [0, 0, 1, 1] });

  const panelTranslateY = introAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [400, 400, 0] });

  // Title glow pulse animation
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Top color stripe bar */}
      <View style={{ marginTop: insets.top }} pointerEvents="none">
        <TopStripeBar />
      </View>

      {/* Hero title block */}
      <View style={[styles.heroBlock, { marginTop: insets.top + 40 }]} pointerEvents="none">
        <SparkleParticles />

        {/* Brand logo */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }}>
          <Image 
            source={require('@/assets/images/logojp.png')} 
            style={styles.logoImage} 
            resizeMode="contain" 
          />
        </Animated.View>

        {/* Giant game name with glowing shadow */}
        <Animated.View style={{ 
          opacity: titleOpacity, 
          transform: [{ scale: titleScale }],
          marginTop: 10,
        }}>
          {/* Glowing blur behind text */}
          <Animated.Text style={[styles.gameTitleGlow, { opacity: glowOpacity }]}>
            JOGO DA{'\n'}PREVENÇÃO
          </Animated.Text>
          <Text style={styles.gameTitle}>
            JOGO DA{'\n'}PREVENÇÃO
          </Text>
        </Animated.View>

        <FloatingIcons introAnim={introAnim} />

        {/* Tagline */}
        <Animated.View style={[styles.taglineBox, { 
          opacity: taglineOpacity,
          transform: [{ translateX: taglineTranslateX }] 
        }]}>
          <Text style={styles.taglineText}>
            Aprenda brincando sobre HIV/AIDS{'\n'}e outras infecções transmissíveis
          </Text>
        </Animated.View>
      </View>

      {/* Bottom panel */}
      <Animated.View style={[styles.panelFrame, { 
        paddingBottom: insets.bottom + 16,
        transform: [{ translateY: panelTranslateY }]
      }]}>
        <View style={styles.panelInner}>
          {/* Status heading */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {isComplete ? '🏆 PERCURSO CONCLUÍDO' : 'PRONTO PARA JOGAR'}
            </Text>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROGRESSO</Text>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{progress}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
            </View>
          </View>

          {/* Stat chips */}
          <View style={styles.statRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{playerIndex}</Text>
              <Text style={styles.statLabel}>PASSOS</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{stepsRemaining}</Text>
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

          {/* CTA button */}
          <View style={styles.ctaWrapper}>
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
          </View>

          {/* Secondary buttons */}
          <View style={styles.secondaryRow}>
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

            <AnimatedButton
              style={styles.secondaryBtn}
              testID="btn-open-guided-tour-from-menu"
              onPress={handleGuidedTour}
              hapticStyle="light"
              accessibilityLabel="Abrir guia turístico"
            >
              <AppIcon name="compass" size={16} color={COLORS.text} />
              <Text style={styles.secondaryBtnText}>GUIA TURÍSTICO</Text>
            </AnimatedButton>

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
    bottom: '45%', // Positioned relative to bottom to avoid overlapping with panel
    justifyContent: 'flex-end',
    alignItems: 'center', // Center everything in hero
    zIndex: 3,
  },
  logoImage: {
    width: 140,
    height: 80,
    marginBottom: -8,
  },
  gameTitle: {
    fontSize: 50,
    lineHeight: 52,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: FRAME_OUTER,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  gameTitleGlow: {
    position: 'absolute',
    fontSize: 50,
    lineHeight: 52,
    fontWeight: '900',
    color: BRAND.orange,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: BRAND.orange,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  floatingIconsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  floatingIconLeft: {
    position: 'absolute',
    left: '-5%',
    top: '30%',
    transform: [{ rotate: '-15deg' }],
  },
  floatingIconRight: {
    position: 'absolute',
    right: '-5%',
    bottom: '15%',
    transform: [{ rotate: '15deg' }],
  },
  emojiIcon: {
    fontSize: 42,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: '#FFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
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

  // Secondary buttons
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  secondaryBtn: {
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
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
