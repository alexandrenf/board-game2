import { MathUtils, Vector3 } from 'three';
import { CELL_SIZE } from './constants';
import { Tile } from './state/gameState';
import { getAnimatedTileCenterY } from './tileMotion';

export const PLAYER_RIDE_HEIGHT = 0.7;
const PLAYER_HOP_HEIGHT = 0.58;
const PATH_CURVE_TANGENT_SCALE = 0.24;

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const hermiteInterpolate = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
  tangentScale: number
): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  const m1 = (p2 - p0) * tangentScale;
  const m2 = (p3 - p1) * tangentScale;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * p1 + h10 * m1 + h01 * p2 + h11 * m2;
};

export const getBoardOffsets = (boardSize: { rows: number; cols: number }) => {
  const offsetX = (boardSize.cols * CELL_SIZE) / 2 - CELL_SIZE / 2;
  const offsetZ = (boardSize.rows * CELL_SIZE) / 2 - CELL_SIZE / 2;

  return { offsetX, offsetZ };
};

export const getPlayerWorldPositionFromIndex = ({
  path,
  boardSize,
  index,
  elapsedTime,
  outPos,
}: {
  path: Tile[];
  boardSize: { rows: number; cols: number };
  index: number;
  elapsedTime: number;
  outPos?: Vector3;
}): { pos: Vector3; hopHeight: number } => {
  const pos = outPos ?? new Vector3();

  if (path.length === 0) {
    pos.set(0, PLAYER_RIDE_HEIGHT, 0);
    return { pos, hopHeight: 0 };
  }

  const i = Math.max(0, Math.min(index, path.length - 1));
  const floorIdx = Math.floor(i);
  const ceilIdx = Math.ceil(i);
  const linearFraction = i - floorIdx;
  const smoothFraction = smoothstep(linearFraction);

  const tileA = path[floorIdx];
  const tileB = path[ceilIdx] || tileA;
  const { offsetX, offsetZ } = getBoardOffsets(boardSize);

  const tileToWorldX = (tile: Tile) => tile.col * CELL_SIZE - offsetX;
  const tileToWorldZ = (tile: Tile) => tile.row * CELL_SIZE - offsetZ;

  let worldX = tileToWorldX(tileA);
  let worldZ = tileToWorldZ(tileA);

  if (floorIdx !== ceilIdx) {
    const prevTile = path[Math.max(0, floorIdx - 1)] || tileA;
    const nextTile = path[Math.min(path.length - 1, ceilIdx + 1)] || tileB;
    worldX = hermiteInterpolate(
      tileToWorldX(prevTile),
      tileToWorldX(tileA),
      tileToWorldX(tileB),
      tileToWorldX(nextTile),
      smoothFraction,
      PATH_CURVE_TANGENT_SCALE
    );
    worldZ = hermiteInterpolate(
      tileToWorldZ(prevTile),
      tileToWorldZ(tileA),
      tileToWorldZ(tileB),
      tileToWorldZ(nextTile),
      smoothFraction,
      PATH_CURVE_TANGENT_SCALE
    );
  }

  const tileCenterYA = getAnimatedTileCenterY({
    tileIndex: floorIdx,
    totalTiles: path.length,
    elapsedTime,
    tileColor: tileA.color,
  });
  const tileCenterYB = getAnimatedTileCenterY({
    tileIndex: ceilIdx,
    totalTiles: path.length,
    elapsedTime,
    tileColor: tileB.color,
  });
  const animatedTileCenterY = MathUtils.lerp(tileCenterYA, tileCenterYB, smoothFraction);

  const hopProgress = floorIdx === ceilIdx ? 0 : smoothFraction;
  const hopHeight = PLAYER_HOP_HEIGHT * 4 * hopProgress * (1 - hopProgress);

  pos.set(worldX, animatedTileCenterY + PLAYER_RIDE_HEIGHT + hopHeight, worldZ);

  return { pos, hopHeight };
};
