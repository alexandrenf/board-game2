export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  themeId: string;
  difficulty: QuizDifficulty;
  questionText: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
};

export type QuizResult = 'correct' | 'incorrect' | 'timeout';

export type QuizAnswer = {
  playerId: string;
  questionId: string;
  selectedOptionId: string | null;
  result: QuizResult;
  timeElapsedMs: number;
};

export type QuizEffectResolution = {
  tileColor: string;
  quizResult: QuizResult;
  effect: 'advance' | 'retreat' | 'return_to_previous' | 'stay';
  value: number;
  previousIndex?: number;
};

export type QuizBank = {
  version: number;
  questions: QuizQuestion[];
};
