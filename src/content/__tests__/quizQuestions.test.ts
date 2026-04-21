import {
  MIN_QUESTIONS_PER_THEME,
  QUIZ_QUESTION_BANK,
  QUIZ_QUESTIONS,
  QUIZ_SOURCES,
  QUIZ_THEMES,
  QuizTheme,
} from '../quizQuestions';

const themes = Object.keys(QUIZ_THEMES) as QuizTheme[];

describe('quiz question bank', () => {
  it.each(themes)('has at least the minimum questions for %s', (theme) => {
    expect(QUIZ_QUESTION_BANK[theme].length).toBeGreaterThanOrEqual(MIN_QUESTIONS_PER_THEME);
  });

  it('has unique question ids and prompts', () => {
    const ids = new Set<string>();
    const prompts = new Set<string>();

    for (const question of QUIZ_QUESTIONS) {
      expect(ids.has(question.id)).toBe(false);
      expect(prompts.has(question.prompt)).toBe(false);

      ids.add(question.id);
      prompts.add(question.prompt);
    }
  });

  it('keeps each answer index and source reference valid', () => {
    for (const question of QUIZ_QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(question.options[question.correctOptionIndex]).toBeTruthy();
      expect(question.explanation.length).toBeGreaterThan(24);
      expect(question.sourceIds.length).toBeGreaterThan(0);

      for (const sourceId of question.sourceIds) {
        expect(QUIZ_SOURCES[sourceId]).toBeDefined();
      }
    }
  });

  it.each(themes)('stores every %s question under the matching theme key', (theme) => {
    for (const question of QUIZ_QUESTION_BANK[theme]) {
      expect(question.theme).toBe(theme);
    }
  });
});
