import { AppIcon } from '@/src/components/ui/AppIcon';
import { GlassPanel } from '@/src/components/ui/GlassPanel';
import { COLORS, GLASS } from '@/src/constants/colors';
import { getTileVisual } from '@/src/game/constants';
import { getCategoryOutcomeLines, OutcomeLine } from '@/src/game/quizOutcomeCopy';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Props for {@link QuizIntroOverlay}. */
type QuizIntroOverlayProps = {
  visible: boolean;
  tileColor: string | undefined;
  /**
   * When true, tapping anywhere on the overlay dismisses it. When false,
   * taps do nothing — the overlay only closes via `autoDismissMs` or by going
   * not-visible from above.
   */
  tapToDismiss?: boolean;
  /**
   * When set, the overlay auto-dismisses after this many ms. Use together
   * with `tapToDismiss=false` for the multiplayer flow where every client
   * needs to close at the same fixed cadence without user interaction.
   */
  autoDismissMs?: number;
  /** Called once the exit animation has finished. */
  onComplete: () => void;
};

type OutcomeRowProps = {
  line: OutcomeLine;
  accentColor: string;
};

const OutcomeRow: React.FC<OutcomeRowProps> = ({ line, accentColor }) => {
  const positive = line.tone === 'positive';
  const negative = line.tone === 'negative';
  const isCorrect = line.result === 'correct';

  return (
    <View style={styles.outcomeRow}>
      <View
        style={[
          styles.outcomeBadge,
          isCorrect ? styles.outcomeBadgeCorrect : styles.outcomeBadgeIncorrect,
        ]}
      >
        <AppIcon
          name={isCorrect ? 'check' : 'xmark'}
          size={11}
          color={isCorrect ? '#1B6F3A' : '#7A2424'}
        />
      </View>
      <View style={styles.outcomeBody}>
        <Text style={styles.outcomeLabel}>{isCorrect ? 'Acertar' : 'Errar'}</Text>
        <Text style={styles.outcomeText}>{line.text}</Text>
      </View>
      <View
        style={[
          styles.outcomePill,
          {
            backgroundColor: positive
              ? 'rgba(154, 230, 180, 0.55)'
              : negative
                ? 'rgba(248, 165, 165, 0.55)'
                : 'rgba(255,255,255,0.55)',
            borderColor: positive
              ? 'rgba(56, 161, 105, 0.6)'
              : negative
                ? 'rgba(176, 60, 60, 0.55)'
                : accentColor,
          },
        ]}
      >
        <Text style={styles.outcomePillText}>{line.shorthand}</Text>
      </View>
    </View>
  );
};

/**
 * "Quiz Time" preparation splash shown when the player lands on a quiz tile.
 *
 * Dismissal model is intentionally explicit per surface:
 * - Solo: `tapToDismiss=true` (no timer) — players read at their own pace.
 * - Multiplayer: `autoDismissMs=3000`, no taps — every client closes on the
 *   same fixed cadence without needing server-side coordination.
 */
export const QuizIntroOverlay: React.FC<QuizIntroOverlayProps> = ({
  visible,
  tileColor,
  tapToDismiss = false,
  autoDismissMs,
  onComplete,
}) => {
  const tileVisual = getTileVisual(tileColor);
  const outcomes = useMemo(() => getCategoryOutcomeLines(tileColor), [tileColor]);

  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);
  const stripPulse = useSharedValue(1);

  const completedRef = useRef(false);
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!visible) {
      completedRef.current = false;
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
        autoDismissTimeoutRef.current = null;
      }
      cancelAnimation(backdropOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardTranslateY);
      cancelAnimation(stripPulse);
      backdropOpacity.value = 0;
      cardScale.value = 0.85;
      cardOpacity.value = 0;
      cardTranslateY.value = 24;
      stripPulse.value = 1;
      return;
    }

    triggerHaptic('medium');

    backdropOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    cardTranslateY.value = withSpring(0, { damping: 14, stiffness: 200 });
    stripPulse.value = withDelay(
      120,
      withSequence(
        withTiming(1.06, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    if (typeof autoDismissMs === 'number' && autoDismissMs > 0) {
      autoDismissTimeoutRef.current = setTimeout(() => {
        autoDismissTimeoutRef.current = null;
        finish();
      }, autoDismissMs);
    }

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
        autoDismissTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoDismissMs]);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    cardOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    cardScale.value = withTiming(0.92, { duration: 220, easing: Easing.in(Easing.cubic) });
    cardTranslateY.value = withTiming(-6, { duration: 220, easing: Easing.in(Easing.cubic) });

    setTimeout(() => {
      onCompleteRef.current?.();
    }, 220);
  };

  const handleTap = () => {
    if (!tapToDismiss) return;
    triggerHaptic('light');
    finish();
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateY: cardTranslateY.value },
      { scale: cardScale.value },
    ],
  }));
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stripPulse.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" accessibilityViewIsModal>
      <Pressable
        style={styles.container}
        onPress={tapToDismiss ? handleTap : undefined}
        accessibilityRole={tapToDismiss ? 'button' : undefined}
        accessibilityLabel={tapToDismiss ? 'Começar quiz' : undefined}
        accessibilityHint={
          tapToDismiss ? 'Toque em qualquer lugar para iniciar a pergunta.' : undefined
        }
      >
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]} pointerEvents="none">
          <GlassPanel intensity="strong" radius={0} style={StyleSheet.absoluteFillObject} />
          <View style={styles.backdropTint} />
        </Animated.View>

        <View style={styles.cardWrap} pointerEvents="none">
          <Animated.View style={[styles.card, cardStyle]}>
            <Animated.View
              style={[styles.colorStrip, { backgroundColor: tileVisual.base }, stripStyle]}
            >
              <AppIcon name={tileVisual.icon} size={14} color={COLORS.text} />
              <Text style={styles.colorStripText}>{tileVisual.label.toUpperCase()}</Text>
            </Animated.View>

            <Text style={styles.eyebrow}>Quiz Time</Text>
            <Text style={styles.title}>Prepare-se para a pergunta</Text>
            <Text style={styles.subtitle}>
              Você caiu em uma casa de{' '}
              <Text style={styles.subtitleEmphasis}>{tileVisual.label.toLowerCase()}</Text>.
            </Text>

            <View style={styles.outcomes}>
              {outcomes.map((line) => (
                <OutcomeRow key={line.result} line={line} accentColor={tileVisual.base} />
              ))}
            </View>

            {tapToDismiss ? (
              <Text style={styles.tapHint}>Toque para começar</Text>
            ) : (
              <View style={styles.waitingRow}>
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotDelay1]} />
                <View style={[styles.dot, styles.dotDelay2]} />
              </View>
            )}
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 12, 5, 0.5)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: 'rgba(255, 250, 240, 0.97)',
    borderRadius: 24,
    borderWidth: theme.borderWidth.thin,
    borderColor: GLASS.border,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    gap: 12,
    ...theme.shadows.lg,
    overflow: 'hidden',
  },
  colorStrip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
  },
  colorStripText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  subtitleEmphasis: {
    color: COLORS.text,
    fontWeight: '900',
  },
  outcomes: {
    marginTop: 6,
    gap: 8,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  outcomeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  outcomeBadgeCorrect: {
    backgroundColor: 'rgba(189, 231, 201, 0.85)',
    borderColor: 'rgba(56, 161, 105, 0.55)',
  },
  outcomeBadgeIncorrect: {
    backgroundColor: 'rgba(243, 176, 176, 0.85)',
    borderColor: 'rgba(176, 60, 60, 0.5)',
  },
  outcomeBody: {
    flex: 1,
    gap: 1,
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  outcomeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 18,
  },
  outcomePill: {
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomePillText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  tapHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  waitingRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
    opacity: 0.55,
  },
  dotDelay1: { opacity: 0.75 },
  dotDelay2: { opacity: 0.95 },
});
