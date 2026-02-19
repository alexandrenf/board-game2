import * as THREE from 'three';
import { CELL_SIZE } from './constants';
import { Tile } from './state/gameState';
import { getAnimatedTileCenterY } from './tileMotion';

export const PLAYER_RIDE_HEIGHT = 0.7;

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
}: {
  path: Tile[];
  boardSize: { rows: number; cols: number };
  index: number;
  elapsedTime: number;
}): { pos: THREE.Vector3; hopHeight: number } => {
  if (path.length === 0) {
    return { pos: new THREE.Vector3(0, PLAYER_RIDE_HEIGHT, 0), hopHeight: 0 };
  }

  const i = Math.max(0, Math.min(index, path.length - 1));
  const floorIdx = Math.floor(i);
  const ceilIdx = Math.ceil(i);
  const fraction = i - floorIdx;

  const tileA = path[floorIdx];
  const tileB = path[ceilIdx] || tileA;
  const { offsetX, offsetZ } = getBoardOffsets(boardSize);

  const posA = new THREE.Vector3(
    tileA.col * CELL_SIZE - offsetX,
    0,
    tileA.row * CELL_SIZE - offsetZ
  );

  const posB = new THREE.Vector3(
    tileB.col * CELL_SIZE - offsetX,
    0,
    tileB.row * CELL_SIZE - offsetZ
  );

  const pos = new THREE.Vector3().lerpVectors(posA, posB, fraction);

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
  const animatedTileCenterY = THREE.MathUtils.lerp(tileCenterYA, tileCenterYB, fraction);

  const hopHeight = 0.6 * 4 * fraction * (1 - fraction);
  pos.y = animatedTileCenterY + PLAYER_RIDE_HEIGHT + hopHeight;

  return { pos, hopHeight };
};

