import { Canvas } from '@react-three/fiber/native';
import React, { useEffect, useRef } from 'react';
import { Board } from './Board';
import { Dice3D } from './Dice3D';
import { GameCamera } from './GameCamera';
import { PlayerToken } from './PlayerToken';
import { useGameStore } from './state/gameState';

const GameLogic: React.FC = () => {
  const { isMoving, currentRoll, moveStep, finishMovement } = useGameStore();
  const stepsTakenRef = useRef(0);

  useEffect(() => {
    if (isMoving && currentRoll !== null) {
      stepsTakenRef.current = 0;
      
      const interval = setInterval(() => {
        if (stepsTakenRef.current < currentRoll) {
          moveStep();
          stepsTakenRef.current += 1;
        } else {
          clearInterval(interval);
          finishMovement();
        }
      }, 800); // Time per step (hop duration + pause)
      
      return () => clearInterval(interval);
    }
  }, [isMoving, currentRoll, moveStep, finishMovement]);

  return null;
};

export const GameScene: React.FC = () => {
  return (
    <Canvas shadows>
      <color attach="background" args={['#111']} />
      
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      
      <GameLogic />
      <GameCamera />
      
      <group position={[0, 0, 0]}>
        <Board />
        <PlayerToken />
        <Dice3D />
      </group>
    </Canvas>
  );
};
