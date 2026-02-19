/* global describe, it, expect */
import { advanceWithEffect, resolveLandingEffect, resolveRoll } from '@/src/domain/game/engine';
import { GameSnapshot, Tile } from '@/src/domain/game/types';

const baseSnapshot: GameSnapshot = {
  gameStatus: 'playing',
  pathLength: 10,
  playerIndex: 2,
  targetIndex: 2,
  isMoving: false,
  isRolling: false,
  isApplyingEffect: false,
};

describe('game engine', () => {
  it('resolves roll and clamps at board end', () => {
    const result = resolveRoll({ ...baseSnapshot, playerIndex: 8 }, 6);
    expect(result.targetIndex).toBe(9);
    expect(result.movedBy).toBe(1);
    expect(result.reachedEnd).toBe(true);
  });

  it('resolves color-rule landing effect before tile-level effect', () => {
    const tile: Tile = {
      id: 10,
      index: 5,
      row: 0,
      col: 0,
      color: 'red',
      effect: { advance: 1 },
    };

    const result = resolveLandingEffect(tile, {
      red: { effect: 'retreat', value: 2 },
      green: { effect: 'advance', value: 2 },
    });

    expect(result.source).toBe('rules');
    expect(result.effect).toEqual({ retreat: 2 });
  });

  it('advances and retreats with boundaries', () => {
    const forward = advanceWithEffect({ playerIndex: 1, pathLength: 10 }, { advance: 4 });
    expect(forward.targetIndex).toBe(5);

    const backward = advanceWithEffect({ playerIndex: 1, pathLength: 10 }, { retreat: 6 });
    expect(backward.targetIndex).toBe(0);
  });
});
