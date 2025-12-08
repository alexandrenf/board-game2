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
  const { path, playerIndex, targetIndex, isMoving, boardSize, roamMode, zoomLevel } = useGameStore();
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
  
  // --- Mode Configuration ---
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const effectiveRoam = roamMode && !isMoving;
    
    if (effectiveRoam) {
      // ROAM MODE: One finger pans
      controlsRef.current.touches.ONE = THREE.TOUCH.PAN;
      controlsRef.current.enablePan = true;
    } else {
      // FOLLOW MODE: One finger rotates around player
      controlsRef.current.touches.ONE = THREE.TOUCH.ROTATE;
      controlsRef.current.enablePan = false;
    }
    
    // DISABLE two-finger gestures entirely to prevent crashes
    // The OrbitControls library has bugs with two-finger tracking in React Native
    controlsRef.current.touches.TWO = undefined as any;
    
    // Reset state when mode changes
    controlsRef.current.state = -1;
  }, [roamMode, isMoving]);

  // Logic Loop
  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    // Safety check
    if (!path || path.length === 0) return;

    // --- WATCHDOG: Prevent Unresponsiveness ---
    if (controlsRef.current.enabled === false) {
        controlsRef.current.enabled = true;
    }

    // Check for corruption
    if (!Number.isFinite(visualIndexRef.current)) {
        visualIndexRef.current = playerIndex;
        const safePos = getWorldPos(playerIndex);
        if (controlsRef.current.target) {
            controlsRef.current.target.copy(safePos);
        }
    }

    // Check camera position corruption
    const cam = state.camera;
    if (!Number.isFinite(cam.position.x) || !Number.isFinite(cam.position.y) || !Number.isFinite(cam.position.z)) {
        const safeTarget = getWorldPos(playerIndex);
        cam.position.set(safeTarget.x, 15, safeTarget.z - 15);
        cam.lookAt(safeTarget);
        cam.updateMatrix();
        cam.updateMatrixWorld(true);
        if (controlsRef.current.target) {
            controlsRef.current.target.copy(safeTarget);
        }
        controlsRef.current.state = -1;
        controlsRef.current.update();
        return;
    }

    // Check target corruption
    const tgt = controlsRef.current.target;
    if (tgt && (!Number.isFinite(tgt.x) || !Number.isFinite(tgt.y) || !Number.isFinite(tgt.z))) {
        const safePos = getWorldPos(playerIndex);
        tgt.copy(safePos);
        controlsRef.current.update();
    }

    const effectiveRoam = roamMode && !isMoving;
    
    // --- Smooth Follow Logic ---
    if (!effectiveRoam) {
        if (isMoving) {
            if (visualIndexRef.current < targetIndex) {
              visualIndexRef.current += delta * 3.0;
              if (visualIndexRef.current > targetIndex) visualIndexRef.current = targetIndex;
            } else if (visualIndexRef.current > targetIndex) {
                 visualIndexRef.current = targetIndex;
            }
        } else {
             const dist = Math.abs(playerIndex - visualIndexRef.current);
             if (dist > 5.0) {
                 visualIndexRef.current = playerIndex;
             } else if (dist > 0.01) {
                visualIndexRef.current += (playerIndex - visualIndexRef.current) * delta * 5.0;
             } else {
                visualIndexRef.current = playerIndex;
             }
        }
        
        const targetPos = getWorldPos(visualIndexRef.current);
        
        if (controlsRef.current.target) {
             controlsRef.current.target.lerp(targetPos, 0.1); 
        }
    }
    
    // --- ZOOM CONTROL: Adjust camera distance based on zoomLevel ---
    const target = controlsRef.current?.target;
    if (target) {
      // Get current distance
      const currentDistance = cam.position.distanceTo(target);
      
      // Smoothly interpolate to target zoom level
      if (Math.abs(currentDistance - zoomLevel) > 0.1) {
        const direction = cam.position.clone().sub(target).normalize();
        const newDistance = THREE.MathUtils.lerp(currentDistance, zoomLevel, 0.08);
        cam.position.copy(target).add(direction.multiplyScalar(newDistance));
      }
    }
    
    try {
       controlsRef.current.update();
    } catch (e) {
       const safePos = getWorldPos(playerIndex);
       if (controlsRef.current.target) {
            controlsRef.current.target.copy(safePos);
       }
       controlsRef.current.state = -1;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      
      // Limits
      minDistance={5}
      maxDistance={60}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.1}
      
      // DISABLE zoom to prevent two-finger crashes
      enableZoom={false}
      
      // Feel
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={0.8}
      panSpeed={1.5}
      
      // Default Target
      target={[0, 0, 0]}
    />
  );
};
