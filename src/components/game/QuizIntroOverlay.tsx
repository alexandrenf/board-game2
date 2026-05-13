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

const AUTO_DISMISS_MS = 1000;

/** Props for {@link QuizIntroOverlay}. */
type QuizIntroOverlayProps = {
  visible: boolean;
  tileColor: string | undefined;
  /** When true, tapping anywhere on the card skips the intro early. */
  allowSkip?: boolean;
  /** Called when the intro completes (auto-dismiss or user skip). */
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
 * Brief "Quiz Time" preparation splash shown after the player lands on a
 * quiz-eligible tile. Auto-dismisses after {@link AUTO_DISMISS_MS} or sooner
 * if the user taps the card (only when `allowSkip` is true).
 */
export const QuizIntroOverlay: React.FC<QuizIntroOverlayProps> = ({
  visible,
  tileColor,
  allowSkip = false,
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
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!visible) {
      completedRef.current = false;
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
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

    dismissTimeoutRef.current = setTimeout(() => {
      finish();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    cardOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    cardScale.value = withTiming(0.92, { duration: 220, easing: Easing.in(Easing.cubic) });
    cardTranslateY.value = withTiming(-6, { duration: 220, easing: Easing.in(Easing.cubic) }, () => {
      // No-op finisher — the JS-side onComplete fires immediately after.
    });

    setTimeout(() => {
      onCompleteRef.current?.();
    }, 220);
  };

  const handleSkip = () => {
    if (!allowSkip) return;
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
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <GlassPanel intensity="strong" radius={0} style={StyleSheet.absoluteFillObject} />
          <View style={styles.backdropTint} />
        </Animated.View>

        <Pressable
          accessibilityRole={allowSkip ? 'button' : undefined}
          accessibilityLabel={allowSkip ? 'Iniciar quiz agora' : undefined}
          accessibilityHint={allowSkip ? 'Toque para começar imediatamente' : undefined}
          onPress={handleSkip}
          disabled={!allowSkip}
          style={styles.cardWrap}
        >
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

            {allowSkip ? (
              <Text style={styles.skipHint}>Toque para começar</Text>
            ) : (
              <View style={styles.waitDots}>
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotDelay1]} />
                <View style={[styles.dot, styles.dotDelay2]} />
              </View>
            )}
          </Animated.View>
        </Pressable>
      </View>
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
  skipHint: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  waitDots: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
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
