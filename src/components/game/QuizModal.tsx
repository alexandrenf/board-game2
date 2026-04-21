import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { QuizQuestion, QuizResult } from '@/src/domain/game/quizTypes';
import { getTileVisual } from '@/src/game/constants';
import { Tile, TileContent } from '@/src/game/state/gameState';
import { resolveTileImage } from '@/src/game/tileImages';
import { getTileName } from '@/src/game/tileNaming';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuizOption as QuizOptionCard, QuizOptionState } from './QuizOption';
import { QuizTimer } from './QuizTimer';

type QuizModalQuestion = Omit<QuizQuestion, 'correctOptionId'> & {
  correctOptionId?: string;
};

type QuizModalQuiz = {
  question: QuizModalQuestion;
  startedAt: number;
  tileColor: string;
  deadlineAt?: number;
};

export type RevealedQuizAnswer = {
  playerId: string;
  playerName?: string;
  selectedOptionId: string | null;
  result: QuizResult;
  pointsAwarded?: number;
};

type QuizModalProps = {
  visible: boolean;
  tileContent: TileContent | null;
  quiz: QuizModalQuiz | null;
  quizAnswer: { selectedOptionId: string | null; result: QuizResult } | null;
  quizPhase: 'answering' | 'feedback';
  path: Tile[];
  focusTileIndex: number;
  onSubmitAnswer: (optionId: string | null) => void;
  onDismissFeedback: () => void;
  answerLocked?: boolean;
  correctOptionId?: string;
  effectDescription?: string;
  footerMessage?: string | null;
  revealedAnswers?: RevealedQuizAnswer[];
  dismissLabel?: string;
  dismissDisabled?: boolean;
  errorMessage?: string | null;
};

const QUIZ_DURATION_MS = 90_000;

const getOptionLetter = (index: number, optionId: string): string =>
  optionId.trim().toUpperCase() || String.fromCharCode(65 + index);

const getResultCopy = (result: QuizResult | undefined) => {
  if (result === 'correct') {
    return {
      title: 'Correto!',
      icon: 'circle-check',
      cardStyle: styles.correctCard,
      text: 'Voce ganhou 5 pontos no quiz.',
    };
  }

  if (result === 'timeout') {
    return {
      title: 'Tempo esgotado',
      icon: 'hourglass-end',
      cardStyle: styles.incorrectCard,
      text: 'A resposta foi registrada como tempo esgotado.',
    };
  }

  return {
    title: 'Incorreto',
    icon: 'circle-xmark',
    cardStyle: styles.incorrectCard,
    text: 'Revise a explicacao e o conteudo da casa.',
  };
};

const getDefaultEffectDescription = (
  tileColor: string | undefined,
  result: QuizResult | undefined
): string => {
  if (!tileColor || !result) return 'Permanece na mesma casa.';
  const didAnswerCorrectly = result === 'correct';

  if (tileColor === 'green') {
    return didAnswerCorrectly ? 'Avance 2 casas!' : 'Permanece na mesma casa.';
  }

  if (tileColor === 'red') {
    return didAnswerCorrectly ? 'Permanece na mesma casa.' : 'Recue 2 casas.';
  }

  if (tileColor === 'blue') {
    return didAnswerCorrectly ? 'Permanece na mesma casa.' : 'Retorne para a casa anterior.';
  }

  return 'Permanece na mesma casa.';
};

export const QuizModal: React.FC<QuizModalProps> = ({
  visible,
  tileContent,
  quiz,
  quizAnswer,
  quizPhase,
  path,
  focusTileIndex,
  onSubmitAnswer,
  onDismissFeedback,
  answerLocked = false,
  correctOptionId,
  effectDescription,
  footerMessage,
  revealedAnswers,
  dismissLabel = 'Continuar',
  dismissDisabled = false,
  errorMessage,
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.min(height - insets.top - 10, height * 0.92);
  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastFeedbackResultRef = useRef<QuizResult | null>(null);

  const resolvedTileContent = useMemo(() => {
    if (tileContent) return tileContent;
    if (path.length === 0) return null;

    const clampedIndex = Math.max(0, Math.min(focusTileIndex, path.length - 1));
    const tile = path[clampedIndex];
    if (!tile) return null;

    return {
      name: getTileName(tile, clampedIndex),
      step: clampedIndex + 1,
      text: tile.text ?? '',
      color: tile.color ?? 'blue',
      imageKey: tile.imageKey,
      type: tile.type,
      effect: tile.effect ?? null,
      meta: tile.meta,
    };
  }, [focusTileIndex, path, tileContent]);

  useEffect(() => {
    if (!visible) {
      lastFeedbackResultRef.current = null;
      slideAnim.setValue(420);
      fadeAnim.setValue(0);
      return;
    }

    triggerHaptic('medium');
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, visible]);

  useEffect(() => {
    if (!visible || quizPhase !== 'feedback' || !quizAnswer) return;
    if (lastFeedbackResultRef.current === quizAnswer.result) return;

    lastFeedbackResultRef.current = quizAnswer.result;
    triggerHaptic(quizAnswer.result === 'correct' ? 'success' : 'heavy');
  }, [quizAnswer, quizPhase, visible]);

  const handleSubmit = useCallback(
    (optionId: string | null) => {
      if (quizPhase !== 'answering' || answerLocked) return;
      triggerHaptic('light');
      onSubmitAnswer(optionId);
    },
    [answerLocked, onSubmitAnswer, quizPhase]
  );

  const handleRequestClose = useCallback(() => {
    if (quizPhase === 'feedback' && !dismissDisabled) {
      onDismissFeedback();
    }
  }, [dismissDisabled, onDismissFeedback, quizPhase]);

  if (!visible || !resolvedTileContent || !quiz) return null;

  const tileVisual = getTileVisual(resolvedTileContent.color);
  const imageSource = resolveTileImage({
    imageKey: resolvedTileContent.imageKey,
    color: resolvedTileContent.color,
    type: resolvedTileContent.type,
  });
  const totalSteps = Math.max(path.length, resolvedTileContent.step, 1);
  const tileLabel =
    typeof resolvedTileContent.meta?.label === 'string'
      ? resolvedTileContent.meta.label
      : resolvedTileContent.text || 'Sem conteudo informativo nesta casa.';
  const themeTitle =
    typeof resolvedTileContent.meta?.themeTitle === 'string'
      ? resolvedTileContent.meta.themeTitle
      : null;
  const selectedOptionId = quizAnswer?.selectedOptionId ?? null;
  const resolvedCorrectOptionId = correctOptionId ?? quiz.question.correctOptionId;
  const resultCopy = getResultCopy(quizAnswer?.result);
  const resolvedEffectDescription =
    effectDescription ?? getDefaultEffectDescription(quiz.tileColor, quizAnswer?.result);
  const durationMs = quiz.deadlineAt ? Math.max(1000, quiz.deadlineAt - quiz.startedAt) : QUIZ_DURATION_MS;

  const optionState = (optionId: string): QuizOptionState => {
    if (quizPhase === 'answering') {
      if (answerLocked) return selectedOptionId === optionId ? 'selected' : 'disabled';
      return selectedOptionId === optionId ? 'selected' : 'idle';
    }

    if (optionId === resolvedCorrectOptionId) return 'correct';
    if (selectedOptionId === optionId && quizAnswer?.result !== 'correct') return 'incorrect';
    return 'disabled';
  };

  const optionLabelById = new Map(quiz.question.options.map((option, index) => [
    option.id,
    `${getOptionLetter(index, option.id)}. ${option.text}`,
  ]));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Animated.View testID="overlay-quiz-modal" style={[styles.backdrop, { opacity: fadeAnim }]} />

        <Animated.View
          style={[
            styles.sheet,
            {
              height: modalMaxHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleRequestClose}
            disabled={quizPhase === 'answering' || dismissDisabled}
            style={[
              styles.floatingCloseButton,
              (quizPhase === 'answering' || dismissDisabled) && styles.floatingCloseButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Fechar quiz da casa"
          >
            <AppIcon name="xmark" size={16} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={[styles.headerBadge, { backgroundColor: tileVisual.base }]}>
                  <AppIcon name={tileVisual.icon} size={14} color={COLORS.text} />
                  <Text style={styles.headerBadgeText}>{tileVisual.label}</Text>
                </View>
                <View style={styles.quizBadge}>
                  <AppIcon name="question" size={12} color={COLORS.text} />
                  <Text style={styles.quizBadgeText}>Quiz</Text>
                </View>
              </View>

              <View style={styles.imageFrame}>
                <Image source={imageSource} style={styles.image} contentFit="cover" transition={200} />
              </View>

              <Text style={styles.heroProgressText}>
                Casa {resolvedTileContent.step} de {totalSteps}
              </Text>
              {themeTitle ? <Text style={styles.themeText}>{themeTitle}</Text> : null}
              <Text style={styles.titleText}>{tileLabel}</Text>
            </View>

            {quizPhase === 'answering' ? (
              <View style={styles.sectionCard}>
                <QuizTimer
                  durationMs={durationMs}
                  startedAt={quiz.startedAt}
                  paused={answerLocked}
                  onTimeout={() => handleSubmit(null)}
                />
                {footerMessage ? <Text style={styles.centerText}>{footerMessage}</Text> : null}
              </View>
            ) : null}

            {quizPhase === 'feedback' ? (
              <View style={[styles.sectionCard, resultCopy.cardStyle]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name={resultCopy.icon} size={15} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>{resultCopy.title}</Text>
                </View>
                <Text style={styles.sectionText}>{resultCopy.text}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="circle-question" size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Pergunta</Text>
              </View>
              <Text style={styles.questionText}>{quiz.question.questionText}</Text>
            </View>

            {quizPhase === 'feedback' ? (
              <>
                {quiz.question.explanation ? (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionTitleRow}>
                      <AppIcon name="lightbulb" size={14} color={COLORS.text} />
                      <Text style={styles.sectionTitle}>Explicacao</Text>
                    </View>
                    <Text style={styles.sectionText}>{quiz.question.explanation}</Text>
                  </View>
                ) : null}

                <View style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <AppIcon name="book-open" size={14} color={COLORS.text} />
                    <Text style={styles.sectionTitle}>Conteudo educativo</Text>
                  </View>
                  <Text style={styles.sectionText}>
                    {resolvedTileContent.text || 'Sem conteudo informativo nesta casa.'}
                  </Text>
                </View>

                <View style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <AppIcon name="route" size={14} color={COLORS.text} />
                    <Text style={styles.sectionTitle}>Efeito</Text>
                  </View>
                  <Text style={styles.sectionText}>{resolvedEffectDescription}</Text>
                </View>
              </>
            ) : null}

            <View style={styles.optionsList}>
              {quiz.question.options.map((option, index) => (
                <QuizOptionCard
                  key={option.id}
                  letter={getOptionLetter(index, option.id)}
                  text={option.text}
                  state={optionState(option.id)}
                  onPress={() => handleSubmit(option.id)}
                />
              ))}
            </View>

            {quizPhase === 'feedback' && revealedAnswers && revealedAnswers.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="users" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Respostas da sala</Text>
                </View>
                {revealedAnswers.map((answer) => (
                  <View key={answer.playerId} style={styles.answerRow}>
                    <Text style={styles.answerPlayerName}>{answer.playerName ?? 'Jogador'}</Text>
                    <Text style={styles.answerText}>
                      {answer.selectedOptionId
                        ? optionLabelById.get(answer.selectedOptionId) ?? 'Opcao enviada'
                        : 'Sem resposta'}
                    </Text>
                    <Text style={styles.answerPoints}>
                      {answer.result === 'correct' ? '+5' : '+0'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {errorMessage ? (
              <View style={[styles.sectionCard, styles.errorCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Erro</Text>
                </View>
                <Text style={styles.sectionText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={{ height: Math.max(insets.bottom + 86, 100) }} />
          </ScrollView>

          {quizPhase === 'feedback' ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
              <TouchableOpacity
                testID="btn-continue-quiz-feedback"
                style={[styles.continueButton, dismissDisabled && styles.continueButtonDisabled]}
                onPress={onDismissFeedback}
                disabled={dismissDisabled}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
              >
                <Text style={styles.continueButtonText}>{dismissLabel}</Text>
                <AppIcon name="arrow-right" size={14} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          ) : null}
        </Animated.View>
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
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  sheet: {
    backgroundColor: '#F4EADB',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#4E2C17',
    overflow: 'hidden',
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    backgroundColor: '#F7EBD9',
    zIndex: 20,
  },
  floatingCloseButtonDisabled: {
    opacity: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#FFF8EE',
    borderRadius: 16,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
    padding: 14,
    gap: 12,
    ...theme.shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 1,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    flexShrink: 1,
  },
  quizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#8A6744',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  quizBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
    backgroundColor: '#F0E2CF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heroProgressText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7A4E2D',
  },
  themeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    color: COLORS.text,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#E3D1B8',
    padding: 14,
    gap: 8,
  },
  correctCard: {
    borderColor: '#BDE7C9',
    backgroundColor: '#F2FFF6',
  },
  incorrectCard: {
    borderColor: '#F3B0B0',
    backgroundColor: '#FFF3F3',
  },
  errorCard: {
    borderColor: '#D8A0A0',
    backgroundColor: '#FFEAEA',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    color: COLORS.text,
  },
  questionText: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
    color: COLORS.text,
  },
  centerText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  optionsList: {
    gap: 10,
  },
  answerRow: {
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: '#E3D1B8',
    paddingTop: 8,
    gap: 2,
  },
  answerPlayerName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  answerPoints: {
    position: 'absolute',
    right: 0,
    top: 8,
    fontSize: 12,
    fontWeight: '900',
    color: '#5B351E',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: '#D2B895',
    backgroundColor: '#F4EADB',
  },
  continueButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#8A6744',
    backgroundColor: '#FFF8EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#5B351E',
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
