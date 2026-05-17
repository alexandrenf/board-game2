import { countTrailingAutoRolls } from '@/src/services/multiplayer/autoRollHistory';

const dice = (cause: 'auto' | 'manual' | undefined) => ({
  type: 'dice_rolled',
  payload: cause === undefined ? {} : { cause },
});

describe('countTrailingAutoRolls', () => {
  test('empty history returns 0', () => {
    expect(countTrailingAutoRolls([])).toBe(0);
  });

  test('history with no dice_rolled events returns 0', () => {
    expect(
      countTrailingAutoRolls([
        { type: 'turn_started', payload: {} },
        { type: 'quiz_started', payload: {} },
      ])
    ).toBe(0);
  });

  test('single trailing auto roll counts as 1', () => {
    expect(countTrailingAutoRolls([dice('auto')])).toBe(1);
  });

  test('two consecutive trailing auto rolls cross the >=2 stuck threshold', () => {
    expect(countTrailingAutoRolls([dice('auto'), dice('auto')])).toBe(2);
  });

  test('most-recent manual roll resets the streak even if older rolls were auto', () => {
    expect(
      countTrailingAutoRolls([dice('auto'), dice('auto'), dice('manual')])
    ).toBe(0);
  });

  test('counts only the trailing auto streak (stops at first non-auto)', () => {
    expect(
      countTrailingAutoRolls([dice('auto'), dice('manual'), dice('auto'), dice('auto')])
    ).toBe(2);
  });

  test('ignores non-dice_rolled events interspersed in the streak', () => {
    expect(
      countTrailingAutoRolls([
        dice('auto'),
        { type: 'turn_started', payload: {} },
        dice('auto'),
        { type: 'quiz_resolved', payload: {} },
        dice('auto'),
      ])
    ).toBe(3);
  });

  test('missing payload is treated as not-auto and stops the count', () => {
    expect(
      countTrailingAutoRolls([dice('auto'), dice('auto'), { type: 'dice_rolled' }])
    ).toBe(0);
  });

  test('missing cause field is treated as not-auto and stops the count', () => {
    expect(
      countTrailingAutoRolls([dice('auto'), dice('auto'), dice(undefined)])
    ).toBe(0);
  });

  test('non-string cause is treated as not-auto', () => {
    expect(
      countTrailingAutoRolls([
        dice('auto'),
        { type: 'dice_rolled', payload: { cause: 1 } },
      ])
    ).toBe(0);
  });

  test('null payload does not throw and stops the count', () => {
    expect(
      countTrailingAutoRolls([dice('auto'), { type: 'dice_rolled', payload: null }])
    ).toBe(0);
  });

  test('cause: "manual" is not auto', () => {
    expect(countTrailingAutoRolls([dice('manual')])).toBe(0);
  });

  test('long mixed history with trailing auto pair', () => {
    const events = [
      dice('manual'),
      { type: 'turn_started', payload: {} },
      dice('manual'),
      { type: 'quiz_resolved', payload: {} },
      dice('auto'),
      { type: 'turn_started', payload: {} },
      dice('auto'),
    ];
    expect(countTrailingAutoRolls(events)).toBe(2);
  });
});
