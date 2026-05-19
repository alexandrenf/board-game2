import {
  MIN_QUESTIONS_PER_TILE,
  QUIZ_QUESTIONS,
  QUIZ_QUESTIONS_BY_TILE,
  QUIZ_SOURCES,
  QUIZ_THEMES,
  TILES_WITH_QUESTIONS,
  getQuizQuestionsForTile,
} from '../quizQuestions';

const themeKeys = Object.keys(QUIZ_THEMES);

describe('quiz question bank', () => {
  it('defines question pools for every expected tile', () => {
    expect(TILES_WITH_QUESTIONS.length).toBeGreaterThanOrEqual(40);
    for (const tileId of TILES_WITH_QUESTIONS) {
      expect(QUIZ_QUESTIONS_BY_TILE[tileId].length).toBeGreaterThanOrEqual(
        MIN_QUESTIONS_PER_TILE
      );
    }
  });

  it('exposes the same pool via getQuizQuestionsForTile', () => {
    for (const tileId of TILES_WITH_QUESTIONS) {
      expect(getQuizQuestionsForTile(tileId)).toBe(QUIZ_QUESTIONS_BY_TILE[tileId]);
    }
  });

  it('returns an empty pool for tiles with no questions', () => {
    expect(getQuizQuestionsForTile(9999)).toEqual([]);
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

  it('keeps each answer index valid and tile/theme assignments consistent', () => {
    for (const question of QUIZ_QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(question.options[question.correctOptionIndex]).toBeTruthy();
      expect(themeKeys).toContain(question.theme);

      const pool = QUIZ_QUESTIONS_BY_TILE[question.tileId];
      expect(pool).toBeDefined();
      expect(pool).toContain(question);
      for (const sibling of pool) {
        expect(sibling.theme).toBe(question.theme);
      }
    }
  });

  it('keeps every declared source id resolvable when one is set', () => {
    for (const question of QUIZ_QUESTIONS) {
      for (const sourceId of question.sourceIds ?? []) {
        expect(QUIZ_SOURCES[sourceId]).toBeDefined();
      }
    }
  });
});
