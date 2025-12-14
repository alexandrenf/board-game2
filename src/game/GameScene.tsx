import { Canvas } from '@react-three/fiber/native';
import React from 'react';
import { Atmosphere } from './Atmosphere';
import { Board } from './Board';
import { GameCamera } from './GameCamera';
import { PlayerToken } from './PlayerToken';

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
      
      {/* Warm, cozy lighting setup */}
      <ambientLight intensity={0.5} color="#fff5e6" />
      <hemisphereLight 
        args={['#ffeedd', '#88aa88', 0.4]} 
      />
      
      {/* Main sun light - warm and golden */}
      <directionalLight 
        position={[8, 15, 5]} 
        intensity={1.0} 
        color="#fff4e0"
      />
      
      {/* Soft fill light from opposite side */}
      <directionalLight 
        position={[-5, 8, -5]} 
        intensity={0.3} 
        color="#e6f0ff"
      />
      
      {/* Subtle rim light for character pop */}
      <pointLight 
        position={[0, 10, -15]} 
        intensity={0.4} 
        color="#ffccaa"
        distance={30}
      />
      
      <GameCamera />
      
      <group position={[0, 0, 0]}>
        <Board />
        <PlayerToken />
      </group>
    </Canvas>
  );
};
