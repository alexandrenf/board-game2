import { CanvasErrorBoundary } from '@/src/components/game/CanvasErrorBoundary';
import { isWebGLAvailable } from '@/src/utils/webgl';
import { Canvas } from '@/src/lib/r3f/canvas';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
        <ambientLight intensity={renderQuality === 'low' ? 0.58 : 0.45} color="#FFF8F0" />

        {/* Hemisphere light - sky/ground color blend */}
        <hemisphereLight
          args={['#FFE8D6', '#7DD87D', renderQuality === 'low' ? 0.22 : 0.35]}
        />

        {/* Main sun light - warm and golden - Key Light */}
        <directionalLight
          position={[10, 18, 8]}
          intensity={directionalLightIntensity}
          color="#FFF0D4"
          castShadow={false}
        />

        {/* Rim light for character pop - warm accent */}
        {rimLightIntensity > 0 && (
          <pointLight
            position={[0, 12, -18]}
            intensity={rimLightIntensity}
            color="#FFD4B8"
            distance={42}
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
