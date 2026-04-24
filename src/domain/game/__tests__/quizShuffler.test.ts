import { shuffleQuizOptions } from '@/src/domain/game/quizShuffler';
import { QuizQuestion } from '@/src/domain/game/quizTypes';

const makeTestQuestion = (overrides?: Partial<QuizQuestion>): QuizQuestion => ({
  id: 'test-q1',
  themeId: 'red',
  difficulty: 'medium',
  questionText: 'What is HIV?',
  options: [
    { id: 'a', text: 'A virus' },
    { id: 'b', text: 'A bacteria' },
    { id: 'c', text: 'A fungus' },
    { id: 'd', text: 'A protein' },
  ],
  correctOptionId: 'a',
  explanation: 'HIV is a virus.',
  ...overrides,
});

describe('shuffleQuizOptions', () => {
  it('returns all 4 options with no duplicates', () => {
    const q = makeTestQuestion();
    const result = shuffleQuizOptions(q);

    expect(result.options).toHaveLength(4);
    const ids = result.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids.sort()).toEqual(['a', 'b', 'c', 'd']);

    const texts = result.options.map((o) => o.text);
    expect(texts.sort()).toEqual(q.options.map((o) => o.text).sort());
  });

  it('tracks the correct answer after shuffling', () => {
    const q = makeTestQuestion();
    const originalCorrectText = q.options.find(
      (o) => o.id === q.correctOptionId
    )!.text;

    const result = shuffleQuizOptions(q);
    const newCorrectOption = result.options.find(
      (o) => o.id === result.correctOptionId
    )!;

    expect(newCorrectOption.text).toBe(originalCorrectText);
  });

  it('preserves question metadata', () => {
    const q = makeTestQuestion();
    const result = shuffleQuizOptions(q);

    expect(result.id).toBe(q.id);
    expect(result.themeId).toBe(q.themeId);
    expect(result.difficulty).toBe(q.difficulty);
    expect(result.questionText).toBe(q.questionText);
    expect(result.explanation).toBe(q.explanation);
  });

  it('distributes options across positions over many shuffles', () => {
    const q = makeTestQuestion();
    const originalCorrectText = q.options.find(
      (o) => o.id === q.correctOptionId
    )!.text;
    const positionCounts = [0, 0, 0, 0];

    for (let i = 0; i < 1000; i++) {
      const result = shuffleQuizOptions(q);
      const idx = result.options.findIndex(
        (o) => o.text === originalCorrectText
      );
      positionCounts[idx]++;
    }

    for (const count of positionCounts) {
      expect(count).toBeLessThan(400);
    }
  });

  it('does not mutate the original question', () => {
    const q = makeTestQuestion();
    const original = JSON.parse(JSON.stringify(q));

    shuffleQuizOptions(q);

    expect(q).toEqual(original);
  });
});