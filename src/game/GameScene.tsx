import { CanvasErrorBoundary } from '@/src/components/game/CanvasErrorBoundary';
import { isWebGLAvailable } from '@/src/utils/webgl';
import { Canvas } from '@/src/lib/r3f/canvas';
import { useFrame } from '@react-three/fiber';
import React, { Suspense, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AmbientLight, Color, DirectionalLight } from 'three';
import { Platform, StyleSheet, View } from 'react-native';
import { audioManager } from '@/src/services/audio/audioManager';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { Atmosphere } from './Atmosphere';
import { Board } from './Board';
import { GameCameraControls } from './GameCameraControls';
import { PostFX } from './PostFX';
import { SCENE_QUALITY_PROFILES, useAdaptiveRenderQuality } from './renderQuality';

import { SessionPlayerTokens } from './SessionPlayerTokens';
import { safeDisposeRenderer } from '@/src/utils/three';
import { useGameStore } from './state/gameState';

/** Empty fallback rendered inside Canvas while Suspense-held 3D assets load. */
const LoadingFallback = () => {
  return null;
};

/** Calls onReady once when mounted to signal that the scene is ready. */
const SceneReadySignal: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
};

/** Monitors frame rate and adjusts render quality automatically. */
const AdaptiveQualityController: React.FC = () => {
  useAdaptiveRenderQuality();
  return null;
};

// Progress-based color grading: subtly shifts ambient color
// from cooler tones (start) to warmer golden tones (near end)
/** Progress-based color grading that shifts ambient color from cool to warm as the player advances. */
const ProgressColorGrading: React.FC<{
  ambientRef: React.RefObject<AmbientLight | null>;
}> = ({ ambientRef }) => {
  const coolColor = useRef(new Color('#EBF0FF')).current; // Cool blue-white start
  const warmColor = useRef(new Color('#FFF5E0')).current; // Warm golden end
  const lerpedColor = useRef(new Color()).current;
  const targetProgress = useRef(0);
  const lastUpdateAt = useRef(0);

  useFrame((state) => {
    const elapsedMs = state.clock.elapsedTime * 1000;
    if (elapsedMs - lastUpdateAt.current < 100) return;
    lastUpdateAt.current = elapsedMs;

    const { playerIndex, path } = useGameStore.getState();
    const pathLength = path.length;
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
/** Subtle periodic modulation of sun and ambient light intensity and color. */
const LightingBreathing: React.FC<{
  sunRef: React.RefObject<DirectionalLight | null>;
  ambientRef: React.RefObject<AmbientLight | null>;
  baseIntensity: number;
}> = ({ sunRef, ambientRef, baseIntensity }) => {
  const warmColor = useRef(new Color('#FFF0D4')).current;
  const coolColor = useRef(new Color('#FFF5E6')).current;
  const lerpedColor = useRef(new Color()).current;
  const lastUpdateAt = useRef(0);

  useFrame((state) => {
    const elapsedMs = state.clock.elapsedTime * 1000;
    if (elapsedMs - lastUpdateAt.current < 50) return;
    lastUpdateAt.current = elapsedMs;

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
  const multiplayerRoomStatus = useMultiplayerRuntimeStore((state) => state.roomStatus);
  const renderQuality = useGameStore((state) => state.renderQuality);
  const qualityProfile = SCENE_QUALITY_PROFILES[renderQuality];
  const directionalLightIntensity = renderQuality === 'high' ? 1.25 : renderQuality === 'medium' ? 1.1 : renderQuality === 'low' ? 0.95 : 0.85;
  const rimLightIntensity = renderQuality === 'high' ? 1.2 : renderQuality === 'medium' ? 0.6 : 0;
  const setSceneReady = useGameStore((state) => state.setSceneReady);
  const setModelsReady = useGameStore((state) => state.setModelsReady);
  const canRender3D = isWebGLAvailable();
  const sunLightRef = useRef<DirectionalLight>(null);
  const ambientLightRef = useRef<AmbientLight>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const markSceneReady = useCallback(() => {
    setModelsReady(true);
    setSceneReady(true);
  }, [setModelsReady, setSceneReady]);

  useEffect(() => {
    if (!canRender3D) {
      markSceneReady();
    }
  }, [canRender3D, markSceneReady]);

  useEffect(() => {
    return () => safeDisposeRenderer(rendererRef);
  }, []);

  useEffect(() => {
    const isActiveMultiplayerGame =
      gameStatus === 'multiplayer' &&
      (multiplayerRoomStatus === 'playing' || multiplayerRoomStatus === 'finished');
    const shouldUseMenuAudio = gameStatus === 'menu' || (gameStatus === 'multiplayer' && !isActiveMultiplayerGame);

    if (shouldUseMenuAudio) {
      void audioManager.stopAmbient(0);
      void audioManager.stopMusic(0);
      void audioManager.playMusic('music.menu', { fade: 800, loop: true });
      return;
    }

    if (gameStatus === 'playing' || isActiveMultiplayerGame) {
      void audioManager.stopAmbient(0);
      void audioManager.stopMusic(0);
      void audioManager.playAmbient('ambient.nature', { fade: 800, loop: true });
      void audioManager.playMusic('music.gameplay', { fade: 800, loop: true });
    }
  }, [gameStatus, multiplayerRoomStatus]);

  if (!canRender3D) {
    return <View style={styles.sceneFallback} />;
  }

  return (
    <CanvasErrorBoundary
      onError={() => {
        markSceneReady();
      }}
      onRetry={() => {
        setModelsReady(false);
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
          rendererRef.current = state.gl;
          try {
            state.gl.toneMapping = THREE.ACESFilmicToneMapping;
            state.gl.toneMappingExposure = 1.05;
            state.gl.outputColorSpace = THREE.SRGBColorSpace;
          } catch {
            // Tone mapping not supported on this GL context
          }
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <AdaptiveQualityController />

          {/* Atmospheric background & effects */}
          <Atmosphere quality={qualityProfile.atmosphere} />

          {/* Post-processing (web + high tier only, safe fallback) */}
          {renderQuality === 'high' && Platform.OS === 'web' && <PostFX />}

          {/* Native-safe lighting setup (avoids PMREM Environment crash on Expo GL) */}
          <ambientLight ref={ambientLightRef} intensity={renderQuality === 'pwa' ? 0.7 : renderQuality === 'low' ? 0.55 : 0.4} color="#FFF5E8" />

          {/* Hemisphere light - warm sky / cool-green ground bounce */}
          <hemisphereLight
            args={['#FFDDC1', '#6BB870', renderQuality === 'pwa' ? 0.35 : renderQuality === 'low' ? 0.25 : 0.38]}
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
            <Suspense fallback={null}>
              <Board />
            </Suspense>
            {(gameStatus === 'multiplayer' || gameStatus === 'playing' || gameStatus === 'menu') && (
              <Suspense fallback={null}>
                <SessionPlayerTokens />
              </Suspense>
            )}
          </group>

          <SceneReadySignal onReady={markSceneReady} />
        </Suspense>
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
