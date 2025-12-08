import { OrbitControls } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

// Configuration
const TILE_SIZE = 1;
const GAP = 0.1;
const CELL_SIZE = TILE_SIZE + GAP;
const FOLLOW_SPEED = 2.5;

export const GameCamera: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, boardSize, roamMode } = useGameStore();
  const controlsRef = useRef<any>(null);
  
  // Track visual position for smooth following
  const visualPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const visualIndexRef = useRef(playerIndex);
  
  // Effective roam mode: disabled during movement
  const effectiveRoam = roamMode && !isMoving;
  
  // Calculate world position from tile index
  const getWorldPos = (idx: number) => {
    if (!path || path.length === 0) return new THREE.Vector3(0, 0, 0);
    
    const i = Math.max(0, Math.min(idx, path.length - 1));
    const tile = path[Math.floor(i)];
    if (!tile) return new THREE.Vector3(0, 0, 0);
    
    const { rows, cols } = boardSize;
    const offsetX = (cols * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const offsetZ = (rows * CELL_SIZE) / 2 - CELL_SIZE / 2;
    
    return new THREE.Vector3(
      tile.col * CELL_SIZE - offsetX,
      0,
      tile.row * CELL_SIZE - offsetZ
    );
  };
  
  // Initialize camera position on mount
  useEffect(() => {
    const initialPos = getWorldPos(playerIndex);
    visualPosRef.current.copy(initialPos);
    
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialPos);
    }
  }, []);
  
  // When exiting roam mode OR when movement starts, snap to player
  useEffect(() => {
    if (!effectiveRoam && controlsRef.current) {
      const playerPos = getWorldPos(playerIndex);
      controlsRef.current.target.copy(playerPos);
      visualPosRef.current.copy(playerPos);
      visualIndexRef.current = playerIndex;
    }
  }, [effectiveRoam, playerIndex]);

  useFrame((_, delta) => {
    // Always follow when NOT in effective roam mode (i.e., when following OR when moving)
    if (effectiveRoam) return;
    if (!controlsRef.current) return;
    
    // Update visual index to follow player movement
    if (isMoving) {
      if (visualIndexRef.current < targetIndex) {
        visualIndexRef.current += delta * FOLLOW_SPEED;
        if (visualIndexRef.current > targetIndex) {
          visualIndexRef.current = targetIndex;
        }
      }
    } else {
      visualIndexRef.current = playerIndex;
    }
    
    // Get target position
    const targetPos = getWorldPos(visualIndexRef.current);
    
    // Smoothly move the orbit target towards player
    visualPosRef.current.lerp(targetPos, delta * FOLLOW_SPEED);
    
    // Update OrbitControls target
    controlsRef.current.target.copy(visualPosRef.current);
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={4}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={0.2}
      
      // Follow Mode (or during movement): Rotate + Zoom
      // Roam Mode (only when not moving): Pan ONLY
      enableRotate={!effectiveRoam}
      enablePan={effectiveRoam}
      enableZoom={!effectiveRoam}
      
      // Pan on XZ plane (ground)
      screenSpacePanning={false}
      panSpeed={2.0}
      rotateSpeed={0.6}
      
      // Touch settings
      touches={{
        ONE: effectiveRoam ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
        TWO: effectiveRoam ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE
      }}
    />
  );
};
