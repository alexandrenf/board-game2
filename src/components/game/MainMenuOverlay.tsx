import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { BRAND, COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


// ─────────────────────────────────────────────
// Decorative brutalist stripe bar across the top
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
      <View
        key={i}
        style={[
          styles.topStripe,
          { backgroundColor: color },
        ]}
      />
    ))}
  </View>
);

// ─────────────────────────────────────────────
// Pulsing outline behind CTA
// ─────────────────────────────────────────────
const PulseOutline: React.FC = () => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.15, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.pulseOutline,
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

  // Entrance animations
  const heroSlide = useRef(new Animated.Value(-60)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.spring(heroSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(panelSlide, { toValue: 0, useNativeDriver: true, tension: 60, friction: 13 }),
    ]).start();
  }, [heroSlide, heroOpacity, panelSlide]);

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Top color stripe bar */}
      <View style={{ marginTop: insets.top }} pointerEvents="none">
        <TopStripeBar />
      </View>

      {/* Hero title block — raw brutalist typography */}
      <Animated.View
        style={[
          styles.heroBlock,
          { marginTop: insets.top + 40, transform: [{ translateY: heroSlide }], opacity: heroOpacity },
        ]}
        pointerEvents="none"
      >
        {/* BRAND LABEL — offset box */}
        <View style={styles.brandLabelBox}>
          <Text style={styles.brandLabelText}>JUVENTUDE PROTAGONISTA</Text>
        </View>

        {/* Giant game name */}
        <Text style={styles.gameTitle}>
          JOGO DA{'\n'}PREVENÇÃO
        </Text>

        {/* Tagline — raw style */}
        <View style={styles.taglineBox}>
          <Text style={styles.taglineText}>
            Aprenda brincando sobre HIV/AIDS{'\n'}e outras infecções transmissíveis
          </Text>
        </View>
      </Animated.View>

      {/* Bottom panel — brutal card */}
      <Animated.View
        style={[styles.panel, { paddingBottom: insets.bottom + 20, transform: [{ translateY: panelSlide }] }]}
      >
        {/* Status heading — uppercase brutal */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {isComplete ? '🏆 PERCURSO CONCLUÍDO' : 'PRONTO PARA JOGAR'}
          </Text>
        </View>

        {/* PROGRESS SECTION */}
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

        {/* STAT BLOCKS — raw grid */}
        <View style={styles.statGrid}>
          <View style={styles.statBlock}>
            <Text style={styles.statNumber}>{playerIndex}</Text>
            <Text style={styles.statLabel}>PASSOS</Text>
          </View>
          <View style={[styles.statBlock, styles.statBlockMiddle]}>
            <Text style={styles.statNumber}>{stepsRemaining}</Text>
            <Text style={styles.statLabel}>FALTAM</Text>
          </View>
          <View style={[styles.statBlock, styles.statBlockLast, isComplete && styles.statBlockComplete]}>
            {isComplete ? (
              <AppIcon name="check" size={18} color={BRAND.green} />
            ) : (
              <View style={styles.statusDot} />
            )}
            <Text style={[styles.statLabel, { marginTop: 4 }]}>
              {isComplete ? 'FIM' : 'EM JOGO'}
            </Text>
          </View>
        </View>

        {/* CTA BUTTON — loud & brutal */}
        <View style={styles.ctaWrapper}>
          <PulseOutline />
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
              <AppIcon name={mainAction.icon} size={24} color="#000" />
              <Text style={styles.ctaText}>{mainAction.label}</Text>
              <AppIcon name="arrow-right" size={18} color="#000" />
            </View>
          </AnimatedButton>
        </View>

        {/* SECONDARY ACTIONS — brutal small blocks */}
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
            testID="btn-open-customization-from-menu"
            onPress={() => setShowCustomization(true)}
            hapticStyle="light"
            accessibilityLabel="Personalizar personagem"
          >
            <AppIcon name="shirt" size={16} color={COLORS.text} />
            <Text style={styles.secondaryBtnText}>PERSONALIZAR</Text>
          </AnimatedButton>
        </View>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Styles — True Brutalist
// ─────────────────────────────────────────────
const BORDER = 3;
const SHADOW_OFFSET = 5;

const brutalistShadow = (size: number = SHADOW_OFFSET) => ({
  shadowColor: '#000',
  shadowOffset: { width: size, height: size },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: size,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Top stripe bar ──
  topStripeBar: {
    flexDirection: 'row',
    height: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: BORDER,
    borderColor: '#000',
    ...brutalistShadow(4),
    marginBottom: 8,
  },
  brandLabelText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 3,
  },
  gameTitle: {
    fontSize: 52,
    lineHeight: 52,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  taglineBox: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
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

  // ── Bottom panel ──
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFDF5',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: BORDER + 1,
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: '#000',
    zIndex: 10,
    // Brutal upward shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },

  // Status bar
  statusBar: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: -20,
    marginTop: -16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    textAlign: 'center',
  },

  // Progress
  progressSection: {
    gap: 6,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
  },
  progressBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 16,
    backgroundColor: '#E8E4DC',
    borderWidth: BORDER,
    borderColor: '#000',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND.orange,
    borderRightWidth: BORDER,
    borderRightColor: '#000',
  },

  // Stat blocks
  statGrid: {
    flexDirection: 'row',
    gap: 0,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderWidth: BORDER,
    borderColor: '#000',
    marginRight: -BORDER,
  },
  statBlockMiddle: {
    // Middle block inherits shared border via negative margin
  },
  statBlockLast: {
    marginRight: 0,
  },
  statBlockComplete: {
    backgroundColor: '#D4EDDA',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    backgroundColor: BRAND.orange,
    borderWidth: 2,
    borderColor: '#000',
  },

  // CTA
  ctaWrapper: {
    marginTop: 2,
  },
  pulseOutline: {
    borderWidth: BORDER,
    borderColor: BRAND.orange,
  },
  ctaButton: {
    backgroundColor: BRAND.orange,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: BORDER + 1,
    borderColor: '#000',
    ...brutalistShadow(6),
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 3,
  },

  // Secondary
  secondaryRow: {
    flexDirection: 'row',
    gap: 0,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderWidth: BORDER,
    borderColor: '#000',
    ...brutalistShadow(4),
  },
  secondaryBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
  },
});
