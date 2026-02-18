import { Canvas } from '@react-three/fiber/native';
import React from 'react';
import { Atmosphere } from './Atmosphere';
import { Board } from './Board';
import { GameCameraControls } from './GameCameraControls';
import { PlayerToken } from './PlayerToken';
import { ScreenEffects } from './ScreenEffects';

/**
 * Main 3D game scene.
 * Note: Real-time shadows are disabled due to expo-gl compatibility.
 * We use stylized blob shadows instead (see BlobShadow.tsx).
 */
export const GameScene: React.FC = () => {
  return (
    <Canvas 
      camera={{ 
        position: [0, 8, -10],
        fov: 50,
        near: 0.1,
        far: 200
      }}
      gl={{ antialias: true }}
      // Disable shader error checking - expo-gl returns undefined for info logs
      onCreated={(state) => {
        state.gl.debug.checkShaderErrors = false;
      }}
    >
      {/* Atmospheric background & effects */}
      <Atmosphere />

      {/* Native-safe lighting setup (avoids PMREM Environment crash on Expo GL) */}
      <ambientLight intensity={0.45} color="#FFF8F0" />
      
      {/* Hemisphere light - sky/ground color blend */}
      <hemisphereLight 
        args={['#FFE8D6', '#7DD87D', 0.35]} 
      />
      
      {/* Main sun light - warm and golden - Key Light */}
      <directionalLight 
        position={[10, 18, 8]} 
        intensity={1.25} 
        color="#FFF0D4"
        castShadow={false}
      />
      
      {/* Rim light for character pop - warm accent */}
      <pointLight 
        position={[0, 12, -18]} 
        intensity={0.8} 
        color="#FFD4B8"
        distance={35}
      />
      
      <GameCameraControls />
      
      <group position={[0, 0, 0]}>
        <Board />
        <PlayerToken />
      </group>
      
      {/* Screen-space effects (vignette, glow) */}
      <ScreenEffects 
        enableVignette={true} 
        enableGlow={true}
        vignetteIntensity={0.3}
        glowIntensity={0.06}
      />
    </Canvas>
  );
};
