import { selectQuestion } from '@/src/domain/game/quizSelector';
import { QuizQuestion } from '@/src/domain/game/quizTypes';

/** Factory helper that creates a minimal QuizQuestion for tests. */
const makeQuestion = (id: string, themeId: string): QuizQuestion => ({
  id,
  themeId,
  difficulty: 'medium',
  questionText: `Question ${id}`,
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
    { id: 'c', text: 'Option C' },
    { id: 'd', text: 'Option D' },
  ],
  correctOptionId: 'a',
  explanation: 'Explanation',
});

const bank: QuizQuestion[] = [
  makeQuestion('green-01', 'green'),
  makeQuestion('green-02', 'green'),
  makeQuestion('green-03', 'green'),
  makeQuestion('red-01', 'red'),
  makeQuestion('red-02', 'red'),
];

describe('quizSelector', () => {
  it('returns a question matching the requested themeId', () => {
    const q = selectQuestion('green', [], bank);
    expect(q?.themeId).toBe('green');
  });

  it('avoids already-used question IDs', () => {
    const q = selectQuestion('green', ['green-01', 'green-02'], bank);
    expect(q?.id).toBe('green-03');
  });

  it('uses all remaining candidates before repeating', () => {
    for (let i = 0; i < 20; i++) {
      const q = selectQuestion('green', ['green-01', 'green-02'], bank);
      expect(q?.id).toBe('green-03');
    }
  });

  it('returns null when all questions for the theme have been used', () => {
    const q = selectQuestion('green', ['green-01', 'green-02', 'green-03'], bank);
    expect(q).toBeNull();
  });

  it('returns null when no questions exist for the theme', () => {
    expect(selectQuestion('blue', [], bank)).toBeNull();
  });

  it('returns null on an empty question bank', () => {
    expect(selectQuestion('green', [], [])).toBeNull();
  });

  it('returns null when bank has questions but none match the theme', () => {
    expect(selectQuestion('yellow', [], bank)).toBeNull();
  });

  it('ignores used IDs from other themes', () => {
    // red IDs should not affect green selection
    const q = selectQuestion('green', ['red-01', 'red-02'], bank);
    expect(q?.themeId).toBe('green');
  });

  it('returns a random question from candidates', () => {
    const MathRandomSpy = jest.spyOn(Math, 'random');
    MathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValueOnce(0.9);
    const results = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const q = selectQuestion('green', [], bank);
      if (q) results.add(q.id);
    }
    MathRandomSpy.mockRestore();
    expect(results.size).toBeGreaterThan(1);
  });
});
