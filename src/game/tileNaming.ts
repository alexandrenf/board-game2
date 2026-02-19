import { Tile } from './state/gameState';

export const getTileName = (tile: Tile | undefined, fallbackIndex: number): string => {
  if (!tile) return `Casa ${fallbackIndex + 1}`;
  if (tile.type === 'start') return 'Início';
  if (tile.type === 'end') return 'Chegada';
  if (tile.type === 'bonus') return 'Bônus';

  return `Casa ${tile.index + 1}`;
};

