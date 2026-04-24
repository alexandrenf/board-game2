import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { RenderQuality, useGameStore } from './state/gameState';

export type SceneQualityProfile = {
  dpr: number;
  antialias: boolean;
  atmosphere: RenderQuality;
  enableScreenEffects: boolean;
  vignetteIntensity: number;
  glowIntensity: number;
};

export const SCENE_QUALITY_PROFILES: Record<RenderQuality, SceneQualityProfile> = {
  pwa: {
    dpr: 0.8,
    antialias: false,
    atmosphere: 'pwa',
    enableScreenEffects: false,
    vignetteIntensity: 0,
    glowIntensity: 0,
  },
  low: {
    dpr: 1,
    antialias: false,
    atmosphere: 'low',
    enableScreenEffects: false,
    vignetteIntensity: 0,
    glowIntensity: 0,
  },
  medium: {
    dpr: 1.2,
    antialias: true,
    atmosphere: 'medium',
    enableScreenEffects: true,
    vignetteIntensity: 0.2,
    glowIntensity: 0.06,
  },
  high: {
    dpr: 1.6,
    antialias: true,
    atmosphere: 'high',
    enableScreenEffects: true,
    vignetteIntensity: 0.3,
    glowIntensity: 0.13,
  },
};

const SAMPLE_WINDOW = 60;
const QUALITY_SWITCH_COOLDOWN_MS = 8_000;
const PWA_FPS_THRESHOLD = 30;
const LOW_FPS_THRESHOLD = 42;
const MEDIUM_FPS_THRESHOLD = 52;
const HIGH_FPS_THRESHOLD = 58;
const UPGRADE_STREAK_TARGET = 180;

const QUALITY_ORDER: RenderQuality[] = ['pwa', 'low', 'medium', 'high'];

export const useAdaptiveRenderQuality = () => {
  const renderQuality = useGameStore((state) => state.renderQuality);
  const qualityCeiling = useGameStore((state) => state.qualityCeiling);
  const setRenderQuality = useGameStore((state) => state.setRenderQuality);

  const fpsWindowRef = useRef<number[]>([]);
  const cooldownUntilRef = useRef(0);
  const stableHighFramesRef = useRef(0);

  useFrame((_, delta) => {
    if (delta <= 0) return;

    const now = Date.now();
    const fps = 1 / Math.max(delta, 1 / 240);
    fpsWindowRef.current.push(fps);
    if (fpsWindowRef.current.length > SAMPLE_WINDOW) {
      fpsWindowRef.current.shift();
    }

    if (fpsWindowRef.current.length < SAMPLE_WINDOW) return;

    const avgFps =
      fpsWindowRef.current.reduce((sum, sample) => sum + sample, 0) / fpsWindowRef.current.length;

    if (avgFps >= HIGH_FPS_THRESHOLD) {
      stableHighFramesRef.current += 1;
    } else {
      stableHighFramesRef.current = 0;
    }

    if (now < cooldownUntilRef.current) return;

    if (renderQuality === 'high' && avgFps < MEDIUM_FPS_THRESHOLD) {
      setRenderQuality('medium');
      cooldownUntilRef.current = now + QUALITY_SWITCH_COOLDOWN_MS;
      stableHighFramesRef.current = 0;
      return;
    }

    if (renderQuality === 'medium' && avgFps < LOW_FPS_THRESHOLD) {
      setRenderQuality('low');
      cooldownUntilRef.current = now + QUALITY_SWITCH_COOLDOWN_MS;
      stableHighFramesRef.current = 0;
      return;
    }

    if (renderQuality === 'low' && avgFps < PWA_FPS_THRESHOLD) {
      setRenderQuality('pwa');
      cooldownUntilRef.current = now + QUALITY_SWITCH_COOLDOWN_MS;
      stableHighFramesRef.current = 0;
      return;
    }

    if (stableHighFramesRef.current < UPGRADE_STREAK_TARGET) return;

    if (renderQuality === 'pwa') {
      const target: RenderQuality = 'low';
      if (QUALITY_ORDER.indexOf(target) <= QUALITY_ORDER.indexOf(qualityCeiling)) {
        setRenderQuality(target);
        cooldownUntilRef.current = now + QUALITY_SWITCH_COOLDOWN_MS;
        stableHighFramesRef.current = 0;
      }
      return;
    }

    if (renderQuality === 'low') {
      const target: RenderQuality = 'medium';
      if (QUALITY_ORDER.indexOf(target) <= QUALITY_ORDER.indexOf(qualityCeiling)) {
        setRenderQuality(target);
        cooldownUntilRef.current = now + QUALITY_SWITCH_COOLDOWN_MS;
        stableHighFramesRef.current = 0;
      }
      return;
    }

    if (renderQuality === 'medium') {
      const target: RenderQuality = 'high';
      if (QUALITY_ORDER.indexOf(target) <= QUALITY_ORDER.indexOf(qualityCeiling)) {
        setRenderQuality(target);
        cooldownUntilRef.current = now + QUALITY_SWITCH_COOLDOWN_MS;
        stableHighFramesRef.current = 0;
      }
    }
  });
};
