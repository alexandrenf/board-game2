import { getTileVisual } from './constants';

const TILE_WAVE_SPEED = 0.25;
const TILE_WAVE_WIDTH = 6;
const TILE_WAVE_PULSE_HEIGHT = 0.28;

// Landing impact state — shared between PlayerTokenActor (writes) and Board (reads)
const LANDING_IMPACT_DECAY = 6.0;
const tileLandingImpacts = new Map<number, number>();

export const triggerTileLanding = (tileIndex: number): void => {
  tileLandingImpacts.set(tileIndex, 1.0);
};

export const getTileLandingSquash = (tileIndex: number, delta: number): number => {
  const impact = tileLandingImpacts.get(tileIndex);
  if (!impact || impact < 0.001) {
    tileLandingImpacts.delete(tileIndex);
    return 0;
  }
  const decayed = impact * Math.exp(-LANDING_IMPACT_DECAY * delta);
  tileLandingImpacts.set(tileIndex, decayed);
  return impact;
};

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

