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

  it('times out on green tiles and behaves like incorrect (stay)', () => {
    expect(resolveQuizEffect('green', 'timeout', 5, 2, 2, 46)).toEqual({
      tileColor: 'green',
      quizResult: 'timeout',
      effect: 'stay',
      value: 0,
    });
  });

  it('times out on blue tiles and behaves like incorrect (return_to_previous)', () => {
    expect(resolveQuizEffect('blue', 'timeout', 10, 7, 0, 46)).toEqual({
      tileColor: 'blue',
      quizResult: 'timeout',
      effect: 'return_to_previous',
      value: 3,
      previousIndex: 7,
    });
  });

  it('stays on blue tiles after a correct answer', () => {
    expect(resolveQuizEffect('blue', 'correct', 8, 3, 0, 46)).toEqual({
      tileColor: 'blue',
      quizResult: 'correct',
      effect: 'stay',
      value: 0,
    });
  });

  it('defaults to stay for unknown tile colors', () => {
    expect(resolveQuizEffect('yellow', 'correct', 5, 2, 3, 46)).toEqual({
      tileColor: 'yellow',
      quizResult: 'correct',
      effect: 'stay',
      value: 0,
    });
    expect(resolveQuizEffect('yellow', 'incorrect', 5, 2, 3, 46)).toEqual({
      tileColor: 'yellow',
      quizResult: 'incorrect',
      effect: 'stay',
      value: 0,
    });
  });

  it('does not crash when pathLength is 0 or 1', () => {
    expect(resolveQuizEffect('blue', 'incorrect', 3, 2, 0, 0)).toEqual({
      tileColor: 'blue',
      quizResult: 'incorrect',
      effect: 'return_to_previous',
      value: 0,
      previousIndex: 0,
    });
    expect(resolveQuizEffect('blue', 'incorrect', 3, 2, 0, 1)).toEqual({
      tileColor: 'blue',
      quizResult: 'incorrect',
      effect: 'return_to_previous',
      value: 0,
      previousIndex: 0,
    });
  });

  it('handles previousIndex greater than currentIndex defensively', () => {
    expect(resolveQuizEffect('blue', 'incorrect', 5, 8, 0, 46)).toEqual({
      tileColor: 'blue',
      quizResult: 'incorrect',
      effect: 'return_to_previous',
      value: 3,
      previousIndex: 8,
    });
  });

  it('asserts full object for red correct answer', () => {
    expect(resolveQuizEffect('red', 'correct', 5, 2, 2, 46)).toEqual({
      tileColor: 'red',
      quizResult: 'correct',
      effect: 'stay',
      value: 0,
    });
  });
});
