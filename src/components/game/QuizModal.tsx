import { AppIcon } from '@/src/components/ui/AppIcon';
import { GlassPanel } from '@/src/components/ui/GlassPanel';
import { COLORS, GLASS } from '@/src/constants/colors';
import { QuizQuestion, QuizResult } from '@/src/domain/game/quizTypes';
import { getTileVisual } from '@/src/game/constants';
import { getCategoryOutcomeLines } from '@/src/game/quizOutcomeCopy';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuizOption as QuizOptionCard, QuizOptionState } from './QuizOption';
import { QuizTimer } from './QuizTimer';

/** Question shape used inside the modal; correctOptionId may be hidden during answering. */
type QuizModalQuestion = Omit<QuizQuestion, 'correctOptionId'> & {
  correctOptionId?: string;
};

/** Active quiz session data passed to the modal. */
type QuizModalQuiz = {
  question: QuizModalQuestion;
  startedAt: number;
  tileColor: string;
  deadlineAt?: number;
};

/** Answer revealed for other players in a multiplayer quiz round. */
export type RevealedQuizAnswer = {
  playerId: string;
  playerName?: string;
  selectedOptionId: string | null;
  result: QuizResult;
  pointsAwarded?: number;
};

/** Props for the {@link QuizModal} component. */
type QuizModalProps = {
  visible: boolean;
  quiz: QuizModalQuiz | null;
  /** Locally selected option (used to highlight while multiplayer waits for others). */
  selectedOptionId?: string | null;
  onSubmitAnswer: (optionId: string | null) => void;
  answerLocked?: boolean;
  footerMessage?: string | null;
  errorMessage?: string | null;
};

const QUIZ_DURATION_MS = 90_000;

/** Animated quiz option that fades and slides up with staggered timing. */
const StaggeredOption: React.FC<{ index: number; visible: boolean; children: React.ReactNode }> = ({
  index,
  visible,
  children,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    const delay = 150 + index * 70;
    const timeout = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 65,
        friction: 10,
      }).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [anim, index, visible]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
};

/** Single-letter label for an option, falling back to A, B, C... by index. */
const getOptionLetter = (index: number, optionId: string): string =>
  optionId.trim().toUpperCase() || String.fromCharCode(65 + index);

/**
 * Modal that presents a focused quiz question. Hero imagery and tile metadata
 * are intentionally absent — those live in the post-answer review modal.
 */
export const QuizModal: React.FC<QuizModalProps> = ({
  visible,
  quiz,
  selectedOptionId = null,
  onSubmitAnswer,
  answerLocked = false,
  footerMessage,
  errorMessage,
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.min(height - insets.top - 10, height * 0.92);
  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slideAnim.stopAnimation();
      fadeAnim.stopAnimation();
      slideAnim.setValue(420);
      fadeAnim.setValue(0);
      return;
    }

    triggerHaptic('light');

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 70,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, visible]);

  const handleSubmit = useCallback(
    (optionId: string | null) => {
      if (answerLocked) return;
      triggerHaptic('light');
      onSubmitAnswer(optionId);
    },
    [answerLocked, onSubmitAnswer],
  );

  const optionState = useCallback(
    (optionId: string): QuizOptionState => {
      if (answerLocked) return selectedOptionId === optionId ? 'selected' : 'disabled';
      return selectedOptionId === optionId ? 'selected' : 'idle';
    },
    [answerLocked, selectedOptionId],
  );

  const tileVisual = useMemo(
    () => (quiz ? getTileVisual(quiz.tileColor) : getTileVisual('blue')),
    [quiz],
  );
  const outcomes = useMemo(
    () => (quiz ? getCategoryOutcomeLines(quiz.tileColor) : []),
    [quiz],
  );

  const durationMs = quiz?.deadlineAt
    ? Math.max(1000, quiz.deadlineAt - quiz.startedAt)
    : QUIZ_DURATION_MS;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        /* answering phase has no dismiss action */
      }}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Animated.View testID="overlay-quiz-modal" style={[styles.backdrop, { opacity: fadeAnim }]}>
          <GlassPanel intensity="strong" radius={0} style={StyleSheet.absoluteFillObject} />
          <View style={styles.backdropTint} />
        </Animated.View>

        <GestureHandlerRootView style={styles.gestureRoot}>
          <Animated.View
            style={[
              styles.sheet,
              {
                height: modalMaxHeight,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[styles.colorStrip, { backgroundColor: tileVisual.base }]} />

            {!quiz ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando quiz...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: Math.max(insets.bottom + 32, 48) },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryBadge, { borderColor: COLORS.text, backgroundColor: tileVisual.base }]}>
                    <AppIcon name={tileVisual.icon} size={14} color={COLORS.text} />
                    <Text style={styles.categoryBadgeText}>{tileVisual.label}</Text>
                  </View>
                  <View style={styles.outcomePills}>
                    {outcomes.map((line) => {
                      const positive = line.tone === 'positive';
                      const negative = line.tone === 'negative';
                      return (
                        <View
                          key={line.result}
                          style={[
                            styles.outcomePill,
                            {
                              backgroundColor: positive
                                ? 'rgba(189, 231, 201, 0.7)'
                                : negative
                                  ? 'rgba(243, 176, 176, 0.7)'
                                  : 'rgba(255,255,255,0.65)',
                              borderColor: positive
                                ? 'rgba(56, 161, 105, 0.65)'
                                : negative
                                  ? 'rgba(176, 60, 60, 0.55)'
                                  : 'rgba(0,0,0,0.12)',
                            },
                          ]}
                        >
                          <AppIcon
                            name={line.result === 'correct' ? 'check' : 'xmark'}
                            size={10}
                            color={COLORS.text}
                          />
                          <Text style={styles.outcomePillText}>{line.shorthand}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.timerWrap}>
                  <QuizTimer
                    durationMs={durationMs}
                    startedAt={quiz.startedAt}
                    paused={answerLocked}
                    onTimeout={() => handleSubmit(null)}
                  />
                </View>

                <Text style={styles.questionText}>{quiz.question.questionText}</Text>

                <View style={styles.optionsList}>
                  {quiz.question.options.map((option, index) => (
                    <StaggeredOption key={option.id} index={index} visible={true}>
                      <QuizOptionCard
                        letter={getOptionLetter(index, option.id)}
                        text={option.text}
                        state={optionState(option.id)}
                        onPress={() => handleSubmit(option.id)}
                      />
                    </StaggeredOption>
                  ))}
                </View>

                {footerMessage ? <Text style={styles.footerMessage}>{footerMessage}</Text> : null}

                {errorMessage ? (
                  <View style={styles.errorCard}>
                    <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </GestureHandlerRootView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gestureRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(252, 246, 235, 0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: theme.borderWidth.normal,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  colorStrip: {
    height: 6,
    width: '100%',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    gap: 18,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: theme.borderWidth.thin,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  outcomePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 'auto',
  },
  outcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  outcomePillText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  timerWrap: {
    marginTop: -4,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  optionsList: {
    gap: 10,
  },
  footerMessage: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 234, 234, 0.85)',
    borderColor: 'rgba(216,160,160,0.7)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
});
