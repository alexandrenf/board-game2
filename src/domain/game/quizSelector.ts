import { QuizQuestion } from './quizTypes';

/**
 * Selects a random unused quiz question tied to the given board tile.
 *
 * Each board tile owns its own small pool of questions. Within a session the
 * selector prefers questions from that pool that have not been asked yet. Once
 * every question for the tile has been used at least once, the pool is recycled
 * (a previously-used question is returned) so the player still receives a quiz.
 *
 * Callers that want to detect this recycling can compare the returned question's
 * id against {@link usedQuestionIds} (a hit means the tile's pool was exhausted)
 * and reset their used-set entries for this tile to avoid unbounded growth.
 *
 * Returns `null` only when the bank contains no question for the tile at all.
 *
 * @param tileId - Board tile id this round is being played on.
 * @param usedQuestionIds - IDs of questions already asked this session.
 * @param questionBank - Full pool of available questions across all tiles.
 * @returns A matching question or null if no question exists for the tile.
 */
export function selectQuestion(
  tileId: number,
  usedQuestionIds: string[],
  questionBank: QuizQuestion[]
): QuizQuestion | null {
  const tilePool = questionBank.filter((question) => question.tileId === tileId);
  if (tilePool.length === 0) return null;

  const usedSet = new Set(usedQuestionIds);
  const candidates = tilePool.filter((question) => !usedSet.has(question.id));

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  // Every question for this tile has been used. Recycle the full pool so the
  // player still gets a quiz; callers can detect the recycle via id match.
  return tilePool[Math.floor(Math.random() * tilePool.length)] ?? null;
}
