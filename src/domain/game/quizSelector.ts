import { QuizDifficulty, QuizQuestion } from './quizTypes';

const difficultyForTileColor = (tileColor: string): QuizDifficulty[] =>
  tileColor === 'blue' ? ['easy', 'medium'] : ['hard'];

export function selectQuestion(
  themeId: string,
  tileColor: string,
  usedQuestionIds: string[],
  questionBank: QuizQuestion[]
): QuizQuestion | null {
  const targetDifficulties = difficultyForTileColor(tileColor);
  const candidates = questionBank.filter(
    (question) =>
      question.themeId === themeId &&
      targetDifficulties.includes(question.difficulty) &&
      !usedQuestionIds.includes(question.id)
  );

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  const fallback = questionBank.filter(
    (question) =>
      question.themeId === themeId &&
      targetDifficulties.includes(question.difficulty)
  );
  if (fallback.length === 0) return null;

  return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
}
