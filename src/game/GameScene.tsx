import { Canvas } from '@react-three/fiber/native';
import React from 'react';
import { Board } from './Board';
import { GameCamera } from './GameCamera';
import { PlayerToken } from './PlayerToken';

export const GameScene: React.FC = () => {
  return (
    <Canvas 
      shadows
      camera={{ 
        position: [0, 8, -10],  // Behind and above player
        fov: 50,
        near: 0.1,
        far: 1000
      }}
    >
      <color attach="background" args={['#87CEEB']} />
      
      {/* Lighting Setup */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      
      <GameCamera />
      
      <group position={[0, 0, 0]}>
        <Board />
        <PlayerToken />
      </group>
    </Canvas>
  );
};
