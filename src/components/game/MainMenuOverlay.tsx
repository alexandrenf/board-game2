import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { BRAND, COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
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

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Top color stripe bar */}
      <View style={{ marginTop: insets.top }} pointerEvents="none">
        <TopStripeBar />
      </View>

      {/* Hero title block */}
      <View style={[styles.heroBlock, { marginTop: insets.top + 40 }]} pointerEvents="none">
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
      </View>

      {/* Bottom panel — warm frame matching TileFocusBanner */}
      <View style={[styles.panelFrame, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.panelInner}>
          {/* Status heading — warm brown bar */}
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

          <View style={styles.ctaWrapperSecondary}>
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
      </View>
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
