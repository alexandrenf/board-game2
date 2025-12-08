import { OrbitControls } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

// Local camera constants
const TILE_SIZE = 1;
const GAP = 0.1;
const LOCAL_CELL_SIZE = TILE_SIZE + GAP;

export const GameCameraControls: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, boardSize, roamMode } = useGameStore();
  const controlsRef = useRef<any>(null);
  
  // Track visual index for smooth following
  const visualIndexRef = useRef(playerIndex);
  
  // Calculate world position
  const getWorldPos = (idx: number) => {
    if (!path || path.length === 0) return new THREE.Vector3(0, 0, 0);
    
    // Clamp index
    const i = Math.max(0, Math.min(idx, path.length - 1));
    const tile = path[Math.floor(i)];
    if (!tile) return new THREE.Vector3(0, 0, 0);
    
    // Initialize valid dimensions if boardSize is missing (fallback)
    const rows = boardSize?.rows || 10;
    const cols = boardSize?.cols || 10;

    const offsetX = (cols * LOCAL_CELL_SIZE) / 2 - LOCAL_CELL_SIZE / 2;
    const offsetZ = (rows * LOCAL_CELL_SIZE) / 2 - LOCAL_CELL_SIZE / 2;
    
    return new THREE.Vector3(
      tile.col * LOCAL_CELL_SIZE - offsetX,
      0,
      tile.row * LOCAL_CELL_SIZE - offsetZ
    );
  };
  
  // Initial Camera Setup
  useEffect(() => {
    // Optionally set initial camera look here if needed, 
    // but OrbitControls usually handles it via 'target' prop or default.
  }, []);
  
  // Logic Loop
  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    const effectiveRoam = roamMode && !isMoving;
    
    // --- 1. Mode Configuration (Dynamic Touch Mapping) ---
    // OrbitControls uses .touches = { ONE: ..., TWO: ... }
    // We update this dynamically to switch between Pan and Rotate on one finger.
    
    if (effectiveRoam) {
        // ROAM MODE: One finger pans (slides), Two fingers zoom/rotate
        controlsRef.current.touches.ONE = THREE.TOUCH.PAN;
        controlsRef.current.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
        controlsRef.current.enablePan = true;
    } else {
        // FOLLOW MODE: One finger rotates around player, Two fingers zoom
        controlsRef.current.touches.ONE = THREE.TOUCH.ROTATE;
        controlsRef.current.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
        controlsRef.current.enablePan = false; // Disable panning to keep focus on player
    }

    // --- 2. Smooth Follow Logic ---
    if (!effectiveRoam) {
        // Calculate where the player is visually (interpolated)
        if (isMoving) {
            // Simple approach: slide visual index towards target
            if (visualIndexRef.current < targetIndex) {
              visualIndexRef.current += delta * 3.0; // Speed of token tracking
              if (visualIndexRef.current > targetIndex) visualIndexRef.current = targetIndex;
            } else if (visualIndexRef.current > targetIndex) {
                // Handle backward movement if needed? Usually we move forward.
                 visualIndexRef.current = targetIndex;
            }
        } else {
            // Snapping when stopped
            const diff = playerIndex - visualIndexRef.current;
            if (Math.abs(diff) > 0.01) {
                visualIndexRef.current += diff * delta * 5.0;
            } else {
                visualIndexRef.current = playerIndex;
            }
        }
        
        const targetPos = getWorldPos(visualIndexRef.current);
        
        // Smoothly interpolate the OrbitControls TARGET to follow the player
        // We use simple lerp towards the player position
        // This keeps the camera looking AT the player while preserving the user's rotation angle.
        
        // Note: OrbitControls target is a Vector3
        controlsRef.current.target.lerp(targetPos, 0.1); 
    }
    
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      
      // Limits
      minDistance={5}
      maxDistance={40}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
      
      // Feel
      enableDamping={true}
      dampingFactor={0.1}
      rotateSpeed={0.8}
      zoomSpeed={0.8}
      panSpeed={1.5}
      
      // Default Target (will be overwritten by lerp in Follow mode)
      target={[0, 0, 0]}
    />
  );
};
