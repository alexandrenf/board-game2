import { resolveQuizEffect } from '@/src/domain/game/quizEffectResolver';

describe('quizEffectResolver', () => {
  it('only advances green tiles after a correct answer', () => {
    expect(resolveQuizEffect('green', 'correct', 5, 2, 2, 46)).toEqual({
      tileColor: 'green',
      quizResult: 'correct',
      effect: 'advance',
      value: 2,
    });
    expect(resolveQuizEffect('green', 'incorrect', 5, 2, 2, 46)).toEqual({
      tileColor: 'green',
      quizResult: 'incorrect',
      effect: 'stay',
      value: 0,
    });
  });

  it('only retreats red tiles after an incorrect answer or timeout', () => {
    expect(resolveQuizEffect('red', 'correct', 5, 2, 2, 46).effect).toBe('stay');
    expect(resolveQuizEffect('red', 'timeout', 5, 2, 2, 46)).toEqual({
      tileColor: 'red',
      quizResult: 'timeout',
      effect: 'retreat',
      value: 2,
    });
  });

  it('returns blue tiles to the previous dice position after a wrong answer', () => {
    expect(resolveQuizEffect('blue', 'incorrect', 8, 3, 0, 46)).toEqual({
      tileColor: 'blue',
      quizResult: 'incorrect',
      effect: 'return_to_previous',
      value: 5,
      previousIndex: 3,
    });
  });
});
