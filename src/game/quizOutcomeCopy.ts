import { QuizResult } from '@/src/domain/game/quizTypes';

/** One outcome line shown in the intro splash or review header. */
export type OutcomeLine = {
  result: 'correct' | 'incorrect';
  text: string;
  shorthand: string;
  tone: 'positive' | 'neutral' | 'negative';
};

/**
 * Two outcome lines summarising what happens for correct vs. incorrect answers,
 * keyed off the tile color. Used by {@link QuizIntroOverlay} and the quiz
 * review header in the educational modal.
 */
export const getCategoryOutcomeLines = (tileColor: string | undefined): OutcomeLine[] => {
  if (tileColor === 'green') {
    return [
      { result: 'correct', text: 'Avança 2 casas', shorthand: '+2', tone: 'positive' },
      { result: 'incorrect', text: 'Permanece na mesma casa', shorthand: '—', tone: 'neutral' },
    ];
  }

  if (tileColor === 'red') {
    return [
      { result: 'correct', text: 'Permanece na mesma casa', shorthand: '—', tone: 'neutral' },
      { result: 'incorrect', text: 'Recua 2 casas', shorthand: '−2', tone: 'negative' },
    ];
  }

  if (tileColor === 'blue') {
    return [
      { result: 'correct', text: 'Permanece na mesma casa', shorthand: '—', tone: 'neutral' },
      { result: 'incorrect', text: 'Retorna à casa anterior', shorthand: '↩', tone: 'negative' },
    ];
  }

  if (tileColor === 'yellow') {
    return [
      { result: 'correct', text: 'Casa educativa especial', shorthand: '★', tone: 'neutral' },
      { result: 'incorrect', text: 'Casa educativa especial', shorthand: '★', tone: 'neutral' },
    ];
  }

  return [
    { result: 'correct', text: 'Permanece na mesma casa', shorthand: '—', tone: 'neutral' },
    { result: 'incorrect', text: 'Permanece na mesma casa', shorthand: '—', tone: 'neutral' },
  ];
};

/** Single-line effect description for the post-answer summary. */
export const getDefaultEffectDescription = (
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

  if (tileColor === 'yellow') {
    return 'Permanece na mesma casa. Esta é uma casa educativa especial.';
  }

  return 'Permanece na mesma casa.';
};
