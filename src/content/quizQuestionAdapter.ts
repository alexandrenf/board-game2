import { QuizQuestion as LegacyQuizQuestion } from '../domain/game/quizTypes';
import { QuizQuestion as ContentQuizQuestion, QUIZ_QUESTIONS } from './quizQuestions';

/** Option identifiers used when mapping content questions to the legacy quiz shape. */
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

/**
 * Adapts a content-layer quiz question into the legacy domain format used by the game engine.
 * All questions are treated as medium difficulty; options are assigned fixed letter IDs.
 */
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

/** Fully adapted question bank ready for consumption by the quiz selector. */
export const ADAPTED_QUESTION_BANK: LegacyQuizQuestion[] = QUIZ_QUESTIONS.map(adaptQuizQuestion);
