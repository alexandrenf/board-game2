/** Difficulty level for a quiz question. */
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

/** A single answer option within a quiz question. */
export type QuizOption = {
  id: string;
  text: string;
};

/** A quiz question with metadata, options, and the correct answer. */
export type QuizQuestion = {
  id: string;
  themeId: string;
  difficulty: QuizDifficulty;
  questionText: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
  sourceIds?: readonly string[];
};

/** Result of a player's quiz answer attempt. */
export type QuizResult = 'correct' | 'incorrect' | 'timeout';

/** Record of a player's answer to a specific quiz question. */
export type QuizAnswer = {
  playerId: string;
  questionId: string;
  selectedOptionId: string | null;
  result: QuizResult;
  timeElapsedMs?: number;
};

/** Describes the board effect resolved from a quiz result on a colored tile. */
export type QuizEffectResolution = {
  tileColor: string;
  quizResult: QuizResult;
  effect: 'advance' | 'retreat' | 'return_to_previous' | 'stay';
  value: number;
  previousIndex?: number;
};

/** Collection of quiz questions versioned for cache-busting or migrations. */
export type QuizBank = {
  version: number;
  questions: QuizQuestion[];
};
