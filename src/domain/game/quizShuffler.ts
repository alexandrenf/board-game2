import { QuizOption, QuizQuestion } from './quizTypes';

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleQuizOptions(question: QuizQuestion): QuizQuestion {
  const shuffledOptions = fisherYatesShuffle<QuizOption>(question.options);

  const correctIndex = shuffledOptions.findIndex(
    (o) => o.id === question.correctOptionId
  );

  const reassignedOptions: QuizOption[] = shuffledOptions.map((option, i) => ({
    id: OPTION_IDS[i],
    text: option.text,
  }));

  const correctOptionId = OPTION_IDS[correctIndex];

  return {
    ...question,
    options: reassignedOptions,
    correctOptionId,
  };
}