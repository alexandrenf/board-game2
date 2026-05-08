import { QuizQuestion } from './quizTypes';

/**
 * Selects a random unused quiz question for the given theme.
 *
 * When every question for the theme has been asked already, the selector
 * recycles the pool and returns a previously-asked question rather than
 * leaving the player without a quiz. Callers that want to detect this
 * recycling can compare the returned question's id against
 * {@link usedQuestionIds} (a hit means the bank was exhausted) and reset
 * their used-set accordingly to avoid permanently growing memory.
 *
 * Returns `null` only when the bank contains no question for the theme at all.
 *
 * @param themeId - Tile color / theme identifier (e.g. 'red', 'green').
 * @param usedQuestionIds - IDs of questions already asked this session.
 * @param questionBank - Full pool of available questions.
 * @returns A matching question or null if no question of that theme exists.
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

  // All theme questions have been used. Recycle the full pool for this theme
  // so the player still gets a quiz; the alternative would be a silent skip.
  const fallback = questionBank.filter((question) => question.themeId === themeId);
  if (fallback.length === 0) return null;

  return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
}
