import { useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA, CELL_SIZE } from './constants';
import { useGameStore } from './state/gameState';



// Gesture store for communication with React Native layer
export const cameraGestureStore = {
  // Current gesture state
  gestureActive: false,
  rotationDelta: { x: 0, y: 0 },
  zoomDelta: 0,
  panDelta: { x: 0, y: 0 },
  
  // Methods to update from React Native gestures
  startGesture: () => {
    cameraGestureStore.gestureActive = true;
  },
  endGesture: () => {
    cameraGestureStore.gestureActive = false;
    cameraGestureStore.rotationDelta = { x: 0, y: 0 };
    cameraGestureStore.zoomDelta = 0;
    cameraGestureStore.panDelta = { x: 0, y: 0 };
  },
  updateRotation: (dx: number, dy: number) => {
    cameraGestureStore.rotationDelta = { x: dx, y: dy };
  },
  updateZoom: (delta: number) => {
    cameraGestureStore.zoomDelta = delta;
  },
  updatePan: (dx: number, dy: number) => {
    cameraGestureStore.panDelta = { x: dx, y: dy };
  },
};

export const CustomCameraControls: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, boardSize, roamMode } = useGameStore();
  const { camera } = useThree();
  
  // Spherical coordinates
  const sphericalRef = useRef({
    radius: 20,
    phi: Math.PI / 3,
    theta: Math.PI,
  });
  
  // Target position
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Pan offset for roam mode
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Visual index for smooth following
  const visualIndexRef = useRef(playerIndex);

  // Calculate world position from path index
  const getWorldPos = (idx: number): THREE.Vector3 => {
    if (!path || path.length === 0) return new THREE.Vector3(0, 0, 0);
    
    const i = Math.max(0, Math.min(Math.floor(idx), path.length - 1));
    const tile = path[i];
    if (!tile) return new THREE.Vector3(0, 0, 0);
    
    const rows = boardSize?.rows || 10;
    const cols = boardSize?.cols || 10;
    const offsetX = (cols * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const offsetZ = (rows * CELL_SIZE) / 2 - CELL_SIZE / 2;
    
    return new THREE.Vector3(
      tile.col * CELL_SIZE - offsetX,
      0,
      tile.row * CELL_SIZE - offsetZ
    );
  };

  // Convert spherical to Cartesian
  const sphericalToPosition = (spherical: typeof sphericalRef.current, target: THREE.Vector3): THREE.Vector3 => {
    const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    const y = spherical.radius * Math.cos(spherical.phi);
    const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    return new THREE.Vector3(x, y, z).add(target);
  };

  // Reset pan when exiting roam mode
  useEffect(() => {
    if (!roamMode) {
      panOffsetRef.current.set(0, 0, 0);
    }
  }, [roamMode]);

  // Animation loop
  useFrame((_, delta) => {
    if (!path || path.length === 0) return;
    
    const effectiveRoam = roamMode && !isMoving;
    const spherical = sphericalRef.current;
    
    // Apply gesture updates
    if (cameraGestureStore.gestureActive) {
      if (effectiveRoam) {
        // Pan mode
        const panSpeed = 0.02 * spherical.radius / 20;
        panOffsetRef.current.x += cameraGestureStore.panDelta.x * panSpeed;
        panOffsetRef.current.z += cameraGestureStore.panDelta.y * panSpeed;
      } else {
        // Rotation mode
        spherical.theta -= cameraGestureStore.rotationDelta.x * 0.01;
        spherical.phi = Math.max(CAMERA.MIN_POLAR, Math.min(CAMERA.MAX_POLAR,
          spherical.phi + cameraGestureStore.rotationDelta.y * 0.01
        ));
      }
      
      // Zoom
      spherical.radius = Math.max(CAMERA.MIN_DISTANCE, Math.min(CAMERA.MAX_DISTANCE,
        spherical.radius * (1 + cameraGestureStore.zoomDelta * 0.01)
      ));
      
      // Clear deltas after applying
      cameraGestureStore.rotationDelta = { x: 0, y: 0 };
      cameraGestureStore.zoomDelta = 0;
      cameraGestureStore.panDelta = { x: 0, y: 0 };
    }
    
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
      
      const playerPos = getWorldPos(visualIndexRef.current);
      targetRef.current.lerp(playerPos, 0.1);
    } else {
      const basePos = getWorldPos(playerIndex);
      const roamTarget = basePos.clone().add(panOffsetRef.current);
      targetRef.current.lerp(roamTarget, 0.1);
    }
    
    // Validate spherical
    if (!Number.isFinite(spherical.radius)) spherical.radius = 20;
    if (!Number.isFinite(spherical.phi)) spherical.phi = Math.PI / 3;
    if (!Number.isFinite(spherical.theta)) spherical.theta = Math.PI;
    
    // Calculate camera position
    const targetPosition = sphericalToPosition(spherical, targetRef.current);
    
    if (!Number.isFinite(targetPosition.x) || !Number.isFinite(targetPosition.y) || !Number.isFinite(targetPosition.z)) {
      camera.position.set(0, 15, -15);
      camera.lookAt(0, 0, 0);
      return;
    }
    
    // Smooth camera movement
    camera.position.lerp(targetPosition, 0.15);
    camera.lookAt(targetRef.current);
  });

  return null;
};
