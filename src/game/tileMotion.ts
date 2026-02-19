import { getTileVisual } from './constants';

const TILE_WAVE_SPEED = 0.25;
const TILE_WAVE_WIDTH = 5;
const TILE_WAVE_PULSE_HEIGHT = 0.15;

export const getTileWaveIntensity = (tileIndex: number, totalTiles: number, elapsedTime: number): number => {
  if (totalTiles <= 0) return 0;

  const waveProgress = (elapsedTime * TILE_WAVE_SPEED) % 1;
  const wavePosition = waveProgress * totalTiles;
  const distFromWave = Math.abs(tileIndex - wavePosition);
  const circularDist = Math.min(distFromWave, totalTiles - distFromWave);

  return Math.max(0, 1 - circularDist / TILE_WAVE_WIDTH);
};

export const getAnimatedTileCenterY = (params: {
  tileIndex: number;
  totalTiles: number;
  elapsedTime: number;
  tileColor?: string;
}): number => {
  const baseHeight = getTileVisual(params.tileColor).height || 0;
  const waveHeight = getTileWaveIntensity(params.tileIndex, params.totalTiles, params.elapsedTime) * TILE_WAVE_PULSE_HEIGHT;

  return baseHeight + waveHeight;
};

