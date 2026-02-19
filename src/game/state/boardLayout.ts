import { BoardConfig, Tile } from '@/src/domain/game/types';

export type BoardLayout = {
  path: Tile[];
  boardSize: { rows: number; cols: number };
};

const BOARD_PADDING = 2;

// Layout 4: Wide Loop + Island
const FIXED_PATH_COORDS: { row: number; col: number }[] = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 0 },
  { col: 3, row: 0 },
  { col: 4, row: 0 },
  { col: 5, row: 0 },
  { col: 6, row: 0 },
  { col: 7, row: 0 },
  { col: 8, row: 0 },
  { col: 9, row: 0 },
  { col: 10, row: 0 },
  { col: 11, row: 0 },
  { col: 11, row: 1 },
  { col: 11, row: 2 },
  { col: 11, row: 3 },
  { col: 11, row: 4 },
  { col: 11, row: 5 },
  { col: 11, row: 6 },
  { col: 10, row: 6 },
  { col: 9, row: 6 },
  { col: 8, row: 6 },
  { col: 7, row: 6 },
  { col: 6, row: 6 },
  { col: 5, row: 6 },
  { col: 4, row: 6 },
  { col: 3, row: 6 },
  { col: 2, row: 6 },
  { col: 1, row: 6 },
  { col: 1, row: 5 },
  { col: 1, row: 4 },
  { col: 1, row: 3 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 4, row: 2 },
  { col: 5, row: 2 },
  { col: 6, row: 2 },
  { col: 7, row: 2 },
  { col: 8, row: 2 },
  { col: 8, row: 3 },
  { col: 8, row: 4 },
  { col: 7, row: 4 },
  { col: 6, row: 4 },
  { col: 5, row: 4 },
  { col: 4, row: 4 },
  { col: 3, row: 4 },
];

export const createBoardLayout = (config: BoardConfig, padding: number = BOARD_PADDING): BoardLayout => {
  const tiles = config.tiles;
  const coords = FIXED_PATH_COORDS.slice(0, tiles.length);

  const path: Tile[] = tiles.map((tile, index) => {
    const coord = coords[index] ?? { row: 0, col: 0 };

    return {
      row: coord.row + padding,
      col: coord.col + padding,
      index,
      id: tile.id,
      imageKey: tile.imageKey,
      type: tile.type,
      color: tile.color,
      text: tile.text,
      effect: tile.effect,
      meta: tile.meta,
    };
  });

  const maxRow = Math.max(...coords.map((coord) => coord.row));
  const maxCol = Math.max(...coords.map((coord) => coord.col));

  return {
    path,
    boardSize: {
      rows: maxRow + 1 + padding * 2,
      cols: maxCol + 1 + padding * 2,
    },
  };
};
