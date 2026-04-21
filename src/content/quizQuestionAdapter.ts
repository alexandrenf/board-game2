import { QuizQuestion as LegacyQuizQuestion } from '../domain/game/quizTypes';
import { QuizQuestion as ContentQuizQuestion, QUIZ_QUESTIONS } from './quizQuestions';

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

export function adaptQuizQuestion(q: ContentQuizQuestion): LegacyQuizQuestion {
  return {
    id: q.id,
    themeId: q.theme,
    difficulty: 'medium',
    questionText: q.prompt,
    options: q.options.map((text, i) => ({ id: OPTION_IDS[i], text })),
    correctOptionId: OPTION_IDS[q.correctOptionIndex],
    explanation: q.explanation,
    sourceIds: q.sourceIds,
  };
}

export const ADAPTED_QUESTION_BANK: LegacyQuizQuestion[] = QUIZ_QUESTIONS.map(adaptQuizQuestion);
