import { QuizEffectResolution, QuizResult } from './quizTypes';

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
        // previousIndex is authoritative; value is informational only.
        value: Math.abs(clampedCurrent - clampedPrevious),
        previousIndex: clampedPrevious,
      };

    default:
      return { tileColor, quizResult, effect: 'stay', value: 0 };
  }
}
