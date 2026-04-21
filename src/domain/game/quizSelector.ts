import { QuizQuestion } from './quizTypes';

/**
 * Selects a random unused quiz question for the given theme.
 * Falls back to any question of that theme if all have been used.
 *
 * @param themeId - Tile color / theme identifier (e.g. 'red', 'green').
 * @param usedQuestionIds - IDs of questions already asked this session.
 * @param questionBank - Full pool of available questions.
 * @returns A matching question or null if none exist for the theme.
 */
export function selectQuestion(
  themeId: string,
  usedQuestionIds: string[],
  questionBank: QuizQuestion[]
): QuizQuestion | null {
  const usedSet = new Set(usedQuestionIds);
  const candidates = questionBank.filter(
    (question) => question.themeId === themeId && !usedSet.has(question.id)
  );

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  const fallback = questionBank.filter(
    (question) => question.themeId === themeId
  );
  if (fallback.length === 0) return null;

  return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
}
