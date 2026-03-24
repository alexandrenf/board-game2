import { resolveTurnScript, firstActiveTurn, nextActiveTurn } from '@/src/domain/game/turnResolver';
import { Tile } from '@/src/domain/game/types';

const tiles: Tile[] = [
  {
    id: 1,
    index: 0,
    row: 0,
    col: 0,
    color: 'blue',
    type: 'start',
    text: 'Inicio',
  },
  {
    id: 2,
    index: 1,
    row: 0,
    col: 1,
    color: 'red',
    text: 'Risco',
  },
  {
    id: 3,
    index: 2,
    row: 0,
    col: 2,
    color: 'blue',
    text: 'Atalho',
    effect: { advance: 2 },
  },
  {
    id: 4,
    index: 3,
    row: 0,
    col: 3,
    color: 'green',
    text: 'Protecao',
  },
  {
    id: 5,
    index: 4,
    row: 0,
    col: 4,
    color: 'yellow',
    type: 'end',
    text: 'Fim',
  },
];

describe('turnResolver', () => {
  it('builds a rule-based retreat turn script', () => {
    const script = resolveTurnScript({
      fromIndex: 0,
      rollValue: 1,
      boardLength: tiles.length,
      tiles,
      rules: {
        red: { effect: 'retreat', value: 2 },
      },
    });

    expect(script.baseToIndex).toBe(1);
    expect(script.finalIndex).toBe(0);
    expect(script.effect).toEqual({
      source: 'rules',
      type: 'retreat',
      value: 2,
      fromIndex: 1,
      toIndex: 0,
    });
    expect(script.segments).toHaveLength(2);
  });

  it('builds a tile-effect turn script when no color rule applies', () => {
    const script = resolveTurnScript({
      fromIndex: 0,
      rollValue: 2,
      boardLength: tiles.length,
      tiles,
      rules: {
        red: { effect: 'retreat', value: 2 },
        green: { effect: 'advance', value: 1 },
      },
    });

    expect(script.baseToIndex).toBe(2);
    expect(script.finalIndex).toBe(4);
    expect(script.effect).toEqual({
      source: 'tile',
      type: 'advance',
      value: 2,
      fromIndex: 2,
      toIndex: 4,
    });
    expect(script.reachedEnd).toBe(true);
  });

  it('selects the next active turn deterministically', () => {
    const active = new Set(['player-1', 'player-3']);

    expect(firstActiveTurn(['player-1', 'player-2', 'player-3'], active)).toEqual({
      playerId: 'player-1',
      index: 0,
    });
    expect(nextActiveTurn(['player-1', 'player-2', 'player-3'], 'player-1', active)).toEqual({
      playerId: 'player-3',
      index: 2,
    });
  });
});
