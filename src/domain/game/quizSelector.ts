import { QuizQuestion } from './quizTypes';

export function selectQuestion(
  themeId: string,
  usedQuestionIds: string[],
  questionBank: QuizQuestion[]
): QuizQuestion | null {
  const candidates = questionBank.filter(
    (question) =>
      question.themeId === themeId &&
      !usedQuestionIds.includes(question.id)
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
