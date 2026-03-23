import { parseTurnScript } from '@/src/services/multiplayer/turnScriptUtils';

const validScript = {
  turnId: 'turn_123',
  actorPlayerId: 'player_1',
  turnNumber: 4,
  roll: {
    value: 6,
    startedAt: 1000,
    durationMs: 1000,
  },
  movement: {
    fromIndex: 3,
    baseToIndex: 9,
    finalIndex: 11,
    segments: [
      {
        kind: 'dice',
        fromIndex: 3,
        toIndex: 9,
        value: 6,
        durationMs: 900,
      },
      {
        kind: 'effect',
        fromIndex: 9,
        toIndex: 11,
        value: 2,
        durationMs: 600,
        effectType: 'advance',
      },
    ],
  },
  effect: {
    source: 'tile',
    type: 'advance',
    value: 2,
    fromIndex: 9,
    toIndex: 11,
  },
  result: {
    gameFinished: false,
  },
  deadlineAt: 5000,
};

describe('parseTurnScript', () => {
  it('returns the script when the payload has the expected shape', () => {
    expect(parseTurnScript(validScript)).toEqual(validScript);
  });

  it('returns null when movement.segments is not an array', () => {
    const malformed = {
      ...validScript,
      movement: {
        ...validScript.movement,
        segments: { toIndex: 9 },
      },
    };

    expect(parseTurnScript(malformed)).toBeNull();
  });

  it('returns null when required numeric fields are malformed', () => {
    const malformedRoll = {
      ...validScript,
      roll: {
        ...validScript.roll,
        value: '6',
      },
    };

    const malformedSegment = {
      ...validScript,
      movement: {
        ...validScript.movement,
        segments: [
          {
            ...validScript.movement.segments[0],
            toIndex: '9',
          },
        ],
      },
    };

    expect(parseTurnScript(malformedRoll)).toBeNull();
    expect(parseTurnScript(malformedSegment)).toBeNull();
  });
});
