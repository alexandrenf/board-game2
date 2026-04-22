import { CanvasErrorBoundary } from '@/src/components/game/CanvasErrorBoundary';
import { isWebGLAvailable } from '@/src/utils/webgl';
import { Canvas } from '@/src/lib/r3f/canvas';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { AmbientLight, Color, DirectionalLight } from 'three';
import { Atmosphere } from './Atmosphere';
import { Board } from './Board';
import { GameCameraControls } from './GameCameraControls';
import { SCENE_QUALITY_PROFILES, useAdaptiveRenderQuality } from './renderQuality';
import { ScreenEffects } from './ScreenEffects';
import { SessionPlayerTokens } from './SessionPlayerTokens';
import { useGameStore } from './state/gameState';

const AdaptiveQualityController: React.FC = () => {
  useAdaptiveRenderQuality();
  return null;
};

// Progress-based color grading: subtly shifts ambient color
// from cooler tones (start) to warmer golden tones (near end)
const ProgressColorGrading: React.FC<{
  ambientRef: React.RefObject<AmbientLight | null>;
}> = ({ ambientRef }) => {
  const playerIndex = useGameStore((state) => state.playerIndex);
  const pathLength = useGameStore((state) => state.path.length);
  const coolColor = useRef(new Color('#EBF0FF')).current; // Cool blue-white start
  const warmColor = useRef(new Color('#FFF5E0')).current; // Warm golden end
  const lerpedColor = useRef(new Color()).current;
  const targetProgress = useRef(0);

  useFrame(() => {
    if (!ambientRef.current || pathLength <= 1) return;
    const progress = playerIndex / (pathLength - 1);
    // Smooth transition
    targetProgress.current += (progress - targetProgress.current) * 0.02;
    lerpedColor.copy(coolColor).lerp(warmColor, targetProgress.current);
    ambientRef.current.color.copy(lerpedColor);
  });

  return null;
};

// Subtle lighting breathing — modulates sun intensity and color temperature
const LightingBreathing: React.FC<{
  sunRef: React.RefObject<DirectionalLight | null>;
  ambientRef: React.RefObject<AmbientLight | null>;
  baseIntensity: number;
}> = ({ sunRef, ambientRef, baseIntensity }) => {
  const warmColor = useRef(new Color('#FFF0D4')).current;
  const coolColor = useRef(new Color('#FFF5E6')).current;
  const lerpedColor = useRef(new Color()).current;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // ~40s full cycle, very subtle
    const breath = Math.sin(t * 0.15) * 0.5 + 0.5;

    if (sunRef.current) {
      sunRef.current.intensity = baseIntensity + Math.sin(t * 0.15) * 0.05;
      lerpedColor.copy(warmColor).lerp(coolColor, breath);
      sunRef.current.color.copy(lerpedColor);
    }
    if (ambientRef.current) {
      // Opposite phase for subtle variation
      ambientRef.current.intensity = 0.45 + Math.sin(t * 0.15 + Math.PI) * 0.02;
    }
  });

  return null;
};

/**
 * Main 3D game scene.
 * Note: Real-time shadows are disabled due to expo-gl compatibility.
 * We use stylized blob shadows instead (see BlobShadow.tsx).
 */
export const GameScene: React.FC = () => {
  const gameStatus = useGameStore((state) => state.gameStatus);
  const renderQuality = useGameStore((state) => state.renderQuality);
  const qualityProfile = SCENE_QUALITY_PROFILES[renderQuality];
  const directionalLightIntensity = renderQuality === 'high' ? 1.25 : renderQuality === 'medium' ? 1.1 : 0.95;
  const rimLightIntensity = renderQuality === 'high' ? 1.2 : renderQuality === 'medium' ? 0.6 : 0;
  const sceneReady = useGameStore((state) => state.sceneReady);
  const canRender3D = isWebGLAvailable();
  const sunLightRef = useRef<DirectionalLight>(null);
  const ambientLightRef = useRef<AmbientLight>(null);

  useEffect(() => {
    if (!canRender3D && !sceneReady) {
      useGameStore.getState().setSceneReady(true);
    }
  }, [canRender3D, sceneReady]);

  if (!canRender3D) {
    return <View style={styles.sceneFallback} />;
  }

  return (
    <CanvasErrorBoundary
      fallback={<View style={styles.sceneFallback} />}
      onError={() => {
        useGameStore.getState().setSceneReady(true);
      }}
    >
      <Canvas
        camera={{
          position: [0, 8, -10],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        gl={{ antialias: qualityProfile.antialias }}
        // Disable shader error checking - expo-gl returns undefined for info logs
        onCreated={(state) => {
          state.gl.debug.checkShaderErrors = false;
          useGameStore.getState().setSceneReady(true);
        }}
      >
        <AdaptiveQualityController />

        {/* Atmospheric background & effects */}
        <Atmosphere quality={qualityProfile.atmosphere} />

        {/* Native-safe lighting setup (avoids PMREM Environment crash on Expo GL) */}
        <ambientLight ref={ambientLightRef} intensity={renderQuality === 'low' ? 0.55 : 0.4} color="#FFF5E8" />

        {/* Hemisphere light - warm sky / cool-green ground bounce */}
        <hemisphereLight
          args={['#FFDDC1', '#6BB870', renderQuality === 'low' ? 0.25 : 0.38]}
        />

        {/* Main sun — warm golden key light (golden-hour angle) */}
        <directionalLight
          ref={sunLightRef}
          position={[8, 15, 6]}
          intensity={directionalLightIntensity}
          color="#FFE8C0"
          castShadow={false}
        />

        {/* Cool fill light — opposite side for depth and dimension */}
        {renderQuality !== 'low' && (
          <directionalLight
            position={[-8, 10, -6]}
            intensity={renderQuality === 'high' ? 0.35 : 0.2}
            color="#C8D8F0"
            castShadow={false}
          />
        )}

        {/* Subtle lighting breathing (medium/high quality only) */}
        {renderQuality !== 'low' && (
          <LightingBreathing
            sunRef={sunLightRef}
            ambientRef={ambientLightRef}
            baseIntensity={directionalLightIntensity}
          />
        )}

        {/* Progress-based color grading (medium/high) */}
        {renderQuality !== 'low' && (
          <ProgressColorGrading ambientRef={ambientLightRef} />
        )}

        {/* Rim light for character pop — warm backlight */}
        {rimLightIntensity > 0 && (
          <pointLight
            position={[-2, 14, -16]}
            intensity={rimLightIntensity}
            color="#FFD0A8"
            distance={45}
          />
        )}

        {/* Ground bounce light — subtle upward warm fill */}
        {renderQuality === 'high' && (
          <pointLight
            position={[0, -2, 0]}
            intensity={0.15}
            color="#C8E6C0"
            distance={25}
          />
        )}

        <GameCameraControls />

        <group position={[0, 0, 0]}>
          <Board />
          {(gameStatus === 'multiplayer' || gameStatus === 'playing' || gameStatus === 'menu') && (
            <SessionPlayerTokens />
          )}
        </group>

        {/* Screen-space effects (vignette, glow) */}
        {qualityProfile.enableScreenEffects && (
          <ScreenEffects
            enableVignette={true}
            enableGlow={true}
            vignetteIntensity={qualityProfile.vignetteIntensity}
            glowIntensity={qualityProfile.glowIntensity}
          />
        )}
      </Canvas>
    </CanvasErrorBoundary>
  );
};

const styles = StyleSheet.create({
  sceneFallback: {
    flex: 1,
    backgroundColor: '#DDEAF5',
  },
});
