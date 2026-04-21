import { QuizEffectResolution, QuizResult } from './quizTypes';

/**
 * Resolves the board movement effect based on tile color and quiz result.
 *
 * Green tiles reward correct answers with advancement.
 * Red tiles penalize incorrect answers with retreat.
 * Blue tiles return the player to their previous position on incorrect answers.
 *
 * @param tileColor - Color of the landed tile.
 * @param quizResult - Whether the player answered correctly, incorrectly, or timed out.
 * @param currentIndex - Player's current board index.
 * @param previousIndex - Player's index before the dice roll.
 * @param ruleValue - Configured movement value for the tile color.
 * @param pathLength - Total number of tiles on the board path.
 * @returns The resolved effect describing how the player should move.
 */
export function resolveQuizEffect(
  tileColor: string,
  quizResult: QuizResult,
  currentIndex: number,
  previousIndex: number,
  ruleValue: number,
  pathLength: number
): QuizEffectResolution {
  const clamp = (index: number) => Math.max(0, Math.min(index, pathLength - 1));

  switch (tileColor) {
    case 'green':
      return quizResult === 'correct'
        ? { tileColor, quizResult, effect: 'advance', value: ruleValue }
        : { tileColor, quizResult, effect: 'stay', value: 0 };

    case 'red':
      return quizResult === 'correct'
        ? { tileColor, quizResult, effect: 'stay', value: 0 }
        : { tileColor, quizResult, effect: 'retreat', value: ruleValue };

    case 'blue':
      if (quizResult === 'correct') {
        return { tileColor, quizResult, effect: 'stay', value: 0 };
      }

      const clampedPrevious = clamp(previousIndex);
      const clampedCurrent = clamp(currentIndex);

      return {
        tileColor,
        quizResult,
        effect: 'return_to_previous',
        value: Math.abs(clampedCurrent - clampedPrevious),
        previousIndex: clampedPrevious,
      };

    case 'yellow':
      return { tileColor, quizResult, effect: 'stay', value: 0 };

    default:
      return { tileColor, quizResult, effect: 'stay', value: 0 };
  }
}
