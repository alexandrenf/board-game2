import { selectQuestion } from '@/src/domain/game/quizSelector';
import { QuizQuestion } from '@/src/domain/game/quizTypes';

/** Factory helper that creates a minimal QuizQuestion for tests. */
const makeQuestion = (id: string, tileId: number, themeId = 'blue'): QuizQuestion => ({
  id,
  tileId,
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
  makeQuestion('tile-2-q1', 2),
  makeQuestion('tile-2-q2', 2),
  makeQuestion('tile-2-q3', 2),
  makeQuestion('tile-4-q1', 4, 'red'),
  makeQuestion('tile-4-q2', 4, 'red'),
];

describe('quizSelector', () => {
  it('returns a question tied to the requested tile', () => {
    const q = selectQuestion(2, [], bank);
    expect(q?.tileId).toBe(2);
  });

  it('avoids already-used question IDs for that tile', () => {
    const q = selectQuestion(2, ['tile-2-q1', 'tile-2-q2'], bank);
    expect(q?.id).toBe('tile-2-q3');
  });

  it('uses all remaining candidates before repeating', () => {
    for (let i = 0; i < 20; i++) {
      const q = selectQuestion(2, ['tile-2-q1', 'tile-2-q2'], bank);
      expect(q?.id).toBe('tile-2-q3');
    }
  });

  it('recycles the pool when every question for the tile has been used', () => {
    const q = selectQuestion(2, ['tile-2-q1', 'tile-2-q2', 'tile-2-q3'], bank);
    expect(q).not.toBeNull();
    expect(q?.tileId).toBe(2);
    expect(['tile-2-q1', 'tile-2-q2', 'tile-2-q3']).toContain(q?.id);
  });

  it('returns null when no questions exist for the tile', () => {
    expect(selectQuestion(99, [], bank)).toBeNull();
  });

  it('returns null on an empty question bank', () => {
    expect(selectQuestion(2, [], [])).toBeNull();
  });

  it('ignores used IDs that belong to other tiles', () => {
    const q = selectQuestion(2, ['tile-4-q1', 'tile-4-q2'], bank);
    expect(q?.tileId).toBe(2);
  });

  it('returns a random question from the candidate set', () => {
    const MathRandomSpy = jest.spyOn(Math, 'random');
    MathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValueOnce(0.9);
    const results = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const q = selectQuestion(2, [], bank);
      if (q) results.add(q.id);
    }
    MathRandomSpy.mockRestore();
    expect(results.size).toBeGreaterThan(1);
  });
});
