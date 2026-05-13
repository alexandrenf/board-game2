import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { QuizQuestion, QuizResult } from '@/src/domain/game/quizTypes';
import { theme } from '@/src/styles/theme';
import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QuizOption as QuizOptionCard, QuizOptionState } from './QuizOption';
import type { RevealedQuizAnswer } from './QuizModal';

/** Data describing the player's quiz attempt for review. */
export type QuizReviewData = {
  question: Omit<QuizQuestion, 'correctOptionId'> & { correctOptionId?: string };
  selectedOptionId: string | null;
  correctOptionId: string;
  result: QuizResult;
  sources?: { title: string; url: string }[];
  revealedAnswers?: RevealedQuizAnswer[];
};

type QuizReviewSectionProps = {
  review: QuizReviewData;
};

const getOptionLetter = (index: number, optionId: string): string =>
  optionId.trim().toUpperCase() || String.fromCharCode(65 + index);

const noop = () => {};

/** Embedded post-answer review block: question, options, explanation, sources. */
export const QuizReviewSection: React.FC<QuizReviewSectionProps> = ({ review }) => {
  const { question, selectedOptionId, correctOptionId, result, sources, revealedAnswers } = review;

  const optionLabelById = useMemo(
    () =>
      new Map(
        question.options.map((option, index) => [
          option.id,
          `${getOptionLetter(index, option.id)}. ${option.text}`,
        ]),
      ),
    [question.options],
  );

  const renderOptionState = (optionId: string): QuizOptionState => {
    if (optionId === correctOptionId) return 'correct';
    if (optionId === selectedOptionId && result !== 'correct') return 'incorrect';
    return 'disabled';
  };

  return (
    <View style={styles.panel}>
      <View style={styles.subsection}>
        <Text style={styles.label}>Pergunta</Text>
        <Text style={styles.questionText}>{question.questionText}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.subsection}>
        <Text style={styles.label}>Opções</Text>
        <View style={styles.optionsList}>
          {question.options.map((option, index) => (
            <QuizOptionCard
              key={option.id}
              letter={getOptionLetter(index, option.id)}
              text={option.text}
              state={renderOptionState(option.id)}
              onPress={noop}
            />
          ))}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendSwatchCorrect]} />
            <Text style={styles.legendText}>Resposta correta</Text>
          </View>
          {result !== 'correct' && selectedOptionId ? (
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchIncorrect]} />
              <Text style={styles.legendText}>Sua resposta</Text>
            </View>
          ) : null}
          {selectedOptionId === null ? (
            <View style={styles.legendItem}>
              <AppIcon name="hourglass-end" size={12} color={COLORS.textMuted} />
              <Text style={styles.legendText}>Sem resposta (tempo esgotado)</Text>
            </View>
          ) : null}
        </View>
      </View>

      {question.explanation ? (
        <>
          <View style={styles.divider} />
          <View style={styles.subsection}>
            <Text style={styles.label}>Explicação</Text>
            <Text style={styles.bodyText}>{question.explanation}</Text>
          </View>
        </>
      ) : null}

      {sources && sources.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.subsection}>
            <Text style={styles.label}>Fontes</Text>
            <View style={styles.sourcesList}>
              {sources.map((link, index) => (
                <TouchableOpacity
                  key={link.url}
                  testID={`source-link-${index}`}
                  accessibilityRole="link"
                  accessibilityLabel={`Abrir fonte: ${link.title}`}
                  onPress={async () => {
                    try {
                      const canOpen = await Linking.canOpenURL(link.url);
                      if (canOpen) {
                        await Linking.openURL(link.url);
                      } else {
                        console.warn(`Cannot open URL: ${link.url}`);
                      }
                    } catch (err) {
                      console.warn('Failed to open source link:', link.url, err);
                    }
                  }}
                  hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                  style={styles.sourceRow}
                >
                  <AppIcon name="link" size={12} color="#2563EB" />
                  <Text style={styles.sourceText}>{link.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {revealedAnswers && revealedAnswers.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.subsection}>
            <Text style={styles.label}>Respostas da sala</Text>
            <View style={styles.answersList}>
              {revealedAnswers.map((answer) => {
                const labeled = answer.selectedOptionId
                  ? optionLabelById.get(answer.selectedOptionId) ?? 'Opção enviada'
                  : 'Sem resposta';
                return (
                  <View key={answer.playerId} style={styles.answerRow}>
                    <View style={styles.answerHeader}>
                      <Text style={styles.answerName}>{answer.playerName ?? 'Jogador'}</Text>
                      <Text
                        style={[
                          styles.answerPoints,
                          answer.result === 'correct' ? styles.answerPointsCorrect : styles.answerPointsMuted,
                        ]}
                      >
                        {answer.result === 'correct' ? '+5' : '0'}
                      </Text>
                    </View>
                    <Text style={styles.answerChoice}>{labeled}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255, 250, 240, 0.55)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subsection: {
    gap: 8,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
    color: COLORS.text,
  },
  optionsList: {
    gap: 8,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: theme.borderWidth.thin,
  },
  legendSwatchCorrect: {
    backgroundColor: '#F2FFF6',
    borderColor: '#BDE7C9',
  },
  legendSwatchIncorrect: {
    backgroundColor: '#FFF3F3',
    borderColor: '#F3B0B0',
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: COLORS.text,
  },
  sourcesList: {
    gap: 6,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  sourceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#2563EB',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  answersList: {
    gap: 8,
  },
  answerRow: {
    paddingVertical: 6,
    gap: 2,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  answerPoints: {
    fontSize: 12,
    fontWeight: '900',
  },
  answerPointsCorrect: {
    color: '#1B6F3A',
  },
  answerPointsMuted: {
    color: COLORS.textMuted,
  },
  answerChoice: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
