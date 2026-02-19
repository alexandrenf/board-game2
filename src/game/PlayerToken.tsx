import { useGLTF } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyAvatarColors, cloneAvatarScene } from './avatarModel';
import { LayeredShadow } from './BlobShadow';
import { MOVE_SPEED } from './constants';
import { getPlayerWorldPositionFromIndex } from './playerMotion';
import { useGameStore } from './state/gameState';

export const PlayerToken: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, finishMovement, setFocusTileIndex, boardSize, shirtColor, hairColor, skinColor } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const characterRef = useRef<THREE.Group>(null);
  
  // Keep animation progress in refs to avoid re-rendering every frame.
  const visualIndexRef = useRef(playerIndex);
  const lastReportedFocusRef = useRef(playerIndex);
  
  // Load Character model
  // Keep require for expo-asset compatibility with GLB module resolution.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const characterAsset = Asset.fromModule(require('../../assets/character.glb'));
  const { scene } = useGLTF(characterAsset.uri);
  
  const clone = useMemo(() => {
    return cloneAvatarScene(scene);
  }, [scene]);

  useEffect(() => {
    clone.traverse((object) => applyAvatarColors(object, { skinColor, hairColor, shirtColor }));
  }, [clone, skinColor, hairColor, shirtColor]);

  // Rotation state
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current || !characterRef.current) return;
    const visualIndex = visualIndexRef.current;

    if (isMoving) {
      // Support both forward and backward movement
      const movingForward = targetIndex > visualIndex;
      const movingBackward = targetIndex < visualIndex;
      
      if (movingForward) {
        const nextIndex = visualIndex + delta * MOVE_SPEED;
        
        // Calculate direction for rotation
        const { pos: currentPos } = getPlayerWorldPositionFromIndex({
          path,
          boardSize,
          index: visualIndex,
          elapsedTime: state.clock.elapsedTime,
        });
        const { pos: futurePos } = getPlayerWorldPositionFromIndex({
          path,
          boardSize,
          index: Math.min(visualIndex + 0.1, targetIndex),
          elapsedTime: state.clock.elapsedTime,
        });
        
        const dx = futurePos.x - currentPos.x;
        const dz = futurePos.z - currentPos.z;
        
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          targetRotation.current = Math.atan2(dx, dz);
        }
        
        if (nextIndex >= targetIndex) {
          visualIndexRef.current = targetIndex;
          finishMovement();
        } else {
          visualIndexRef.current = nextIndex;
        }
      } else if (movingBackward) {
        // Backward movement (for retreat effects)
        const nextIndex = visualIndex - delta * MOVE_SPEED;
        
        // Calculate direction for rotation (facing backward)
        const { pos: currentPos } = getPlayerWorldPositionFromIndex({
          path,
          boardSize,
          index: visualIndex,
          elapsedTime: state.clock.elapsedTime,
        });
        const { pos: futurePos } = getPlayerWorldPositionFromIndex({
          path,
          boardSize,
          index: Math.max(visualIndex - 0.1, targetIndex),
          elapsedTime: state.clock.elapsedTime,
        });
        
        const dx = futurePos.x - currentPos.x;
        const dz = futurePos.z - currentPos.z;
        
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          targetRotation.current = Math.atan2(dx, dz);
        }
        
        if (nextIndex <= targetIndex) {
          visualIndexRef.current = targetIndex;
          finishMovement();
        } else {
          visualIndexRef.current = nextIndex;
        }
      }
    } else {
      if (Math.abs(visualIndexRef.current - playerIndex) > 0.01) {
        visualIndexRef.current = playerIndex;
      }
    }

    // Update position with squash/stretch
    const { pos, hopHeight } = getPlayerWorldPositionFromIndex({
      path,
      boardSize,
      index: visualIndexRef.current,
      elapsedTime: state.clock.elapsedTime,
    });
    groupRef.current.position.copy(pos);
    
    // Smooth rotation
    // Shortest path angle interpolation
    let diff = targetRotation.current - currentRotation.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    currentRotation.current += diff * delta * 10;
    groupRef.current.rotation.y = currentRotation.current;
    
    // Squash and stretch based on hop phase
    if (isMoving) {
      // During rise: stretch vertically
      // At peak: normal
      // During fall: stretch vertically  
      // On land: squash
      
      const stretchFactor = 1 + hopHeight * 0.4; // More stretch at peak
      const squashFactor = 1 / Math.sqrt(stretchFactor); // Preserve volume
      
      characterRef.current.scale.set(squashFactor, stretchFactor, squashFactor);
    } else {
      // Idle breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      const breatheX = 1 + Math.sin(state.clock.elapsedTime * 2 + Math.PI) * 0.02;
      characterRef.current.scale.set(breatheX, breathe, breatheX);
    }
    
    const focusedIndex = Math.round(visualIndexRef.current);
    if (focusedIndex !== lastReportedFocusRef.current) {
      lastReportedFocusRef.current = focusedIndex;
      setFocusTileIndex(focusedIndex);
    }
  });

  return (
    <>
      {/* Player shadow that follows the character */}
      <LayeredShadow target={groupRef} scale={1.0} />
      
      <group ref={groupRef} position={[0, 1, 0]}>
        <group ref={characterRef}>
          {/* Loaded Character GLB */}
          <primitive 
            object={clone} 
            scale={[0.5, 0.5, 0.5]} 
            position={[0, -0.1, 0]} 
            rotation={[0, 0, 0]} 
          />
        </group>
      </group>
    </>
  );
};
