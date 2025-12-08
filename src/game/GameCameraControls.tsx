import { OrbitControls } from '@react-three/drei/native';
import { useFrame, useThree } from '@react-three/fiber';
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
  const { gl } = useThree();
  
  // Track visual index for smooth following
  const visualIndexRef = useRef(playerIndex);
  
  // Track active pointers to detect when all fingers are released
  const activePointersRef = useRef<Set<number>>(new Set());
  
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
  
  // --- Manual Touch Tracking to Fix Release Detection ---
  // OrbitControls in React Native may not receive proper pointerup/touchend events
  // This ensures we detect when all fingers are released and reset the controls state
  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;
    
    // Helper to reset OrbitControls state
    // IMPORTANT: We only reset the state property, NOT the internal pointer tracking
    // Clearing pointers/pointerPositions causes crashes when OrbitControls tries to 
    // access them during ongoing touch move events
    const resetControlsState = () => {
      if (!controlsRef.current) return;
      
      // Reset the state machine to idle (-1 = STATE.NONE)
      controlsRef.current.state = -1;
      
      // Dispatch end event to finalize any pending actions
      if (typeof controlsRef.current.dispatchEvent === 'function') {
        controlsRef.current.dispatchEvent({ type: 'end' });
      }
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      activePointersRef.current.add(e.pointerId);
    };
    
    const handlePointerUp = (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);
      
      // When all fingers are released, force reset the controls state
      if (activePointersRef.current.size === 0) {
        resetControlsState();
      }
    };
    
    const handlePointerCancel = (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);
      
      // Same cleanup on cancel
      if (activePointersRef.current.size === 0) {
        resetControlsState();
      }
    };
    
    // Also handle touch events for extra coverage on mobile
    const handleTouchEnd = (e: TouchEvent) => {
      // Clear all pointers when touchend indicates no remaining touches
      if (e.touches.length === 0) {
        activePointersRef.current.clear();
        resetControlsState();
      }
    };
    
    // Add listeners
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointercancel', handlePointerCancel);
    domElement.addEventListener('pointerout', handlePointerUp); // Also catch pointerout
    domElement.addEventListener('touchend', handleTouchEnd);
    domElement.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointercancel', handlePointerCancel);
      domElement.removeEventListener('pointerout', handlePointerUp);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl.domElement]);
  
  // --- 1. Mode Configuration (Dynamic Touch Mapping) ---
  // Move to useEffect to avoid setting properties every frame
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const effectiveRoam = roamMode && !isMoving;
    
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
    
    // Proactive Safety: Reset interaction state when mode changes
    // This prevents "stuck" gestures if the mode changes while a finger is down
    if (controlsRef.current.state !== -1) {
        controlsRef.current.state = -1;
    }
  }, [roamMode, isMoving]);

  // Logic Loop
  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    // Safety check
    if (!path || path.length === 0) return;

    // --- WATCHDOG: Prevent Unresponsiveness ---
    // 1. Force enabled (unless we explicitly want it off, but usually we want to recover)
    if (controlsRef.current.enabled === false) {
        controlsRef.current.enabled = true;
    }

    // 2. Check for Corruption (NaN/Infinity) in State
    if (!Number.isFinite(visualIndexRef.current)) {
        console.warn("Camera: Visual index corrupted. Resetting.");
        visualIndexRef.current = playerIndex;
        // Snap target immediately for instant recovery
        const safePos = getWorldPos(playerIndex);
        if (controlsRef.current.target) {
            controlsRef.current.target.copy(safePos);
        }
    }

    // 2b. Check for Camera Position Corruption (causes beige screen crash)
    const cam = state.camera;
    const isCameraCorrupted = !Number.isFinite(cam.position.x) || 
                               !Number.isFinite(cam.position.y) || 
                               !Number.isFinite(cam.position.z) ||
                               !Number.isFinite(cam.quaternion.x) ||
                               !Number.isFinite(cam.quaternion.y) ||
                               !Number.isFinite(cam.quaternion.z) ||
                               !Number.isFinite(cam.quaternion.w);
    
    if (isCameraCorrupted) {
        console.warn("Camera: Position/rotation corrupted. Performing full recovery...");
        const safeTarget = getWorldPos(playerIndex);
        
        // 1. Reset camera transform completely
        cam.position.set(safeTarget.x, 15, safeTarget.z - 15);
        cam.quaternion.set(0, 0, 0, 1); // Reset rotation to identity first
        cam.lookAt(safeTarget);
        
        // 2. Force update all camera matrices
        cam.updateMatrix();
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        
        // 3. Reset OrbitControls target
        if (controlsRef.current.target) {
            controlsRef.current.target.copy(safeTarget);
        }
        
        // 4. Reset OrbitControls state (don't clear pointers - causes crashes)
        controlsRef.current.state = -1;
        
        // 5. Reset any internal OrbitControls vectors that might be NaN
        if (controlsRef.current.spherical) {
            const spherical = controlsRef.current.spherical;
            if (!Number.isFinite(spherical.radius)) spherical.radius = 20;
            if (!Number.isFinite(spherical.phi)) spherical.phi = Math.PI / 3;
            if (!Number.isFinite(spherical.theta)) spherical.theta = 0;
        }
        
        // 6. Force controls update
        try {
            controlsRef.current.update();
        } catch (e) {
            console.warn("Camera: OrbitControls update failed during recovery");
        }
        
        // Skip further processing this frame
        return;
    }

    // 2c. Check if camera distance is too extreme (can cause issues)
    if (controlsRef.current.target) {
        const distance = cam.position.distanceTo(controlsRef.current.target);
        if (!Number.isFinite(distance) || distance < 1 || distance > 200) {
            console.warn("Camera: Distance out of bounds:", distance, ". Resetting.");
            const safeTarget = getWorldPos(playerIndex);
            
            // Full position reset
            cam.position.set(safeTarget.x, 15, safeTarget.z - 15);
            cam.lookAt(safeTarget);
            cam.updateMatrix();
            cam.updateMatrixWorld(true);
            
            controlsRef.current.target.copy(safeTarget);
            controlsRef.current.state = -1;
            controlsRef.current.update();
        }
    }

    // 3. Check for Corruption in Target Vector
    const tgt = controlsRef.current.target;
    if (tgt && (!Number.isFinite(tgt.x) || !Number.isFinite(tgt.y) || !Number.isFinite(tgt.z))) {
        console.warn("Camera: Target vector corrupted. Resetting.");
        const safePos = getWorldPos(playerIndex);
        tgt.copy(safePos);
        controlsRef.current.update();
    }

    // 4. Safety check for stuck gesture state
    // If controls are in an active state but we have no tracked pointers, reset
    if (controlsRef.current.state !== -1 && activePointersRef.current.size === 0) {
        // This catches edge cases where release events were missed
        controlsRef.current.state = -1;
        // Note: Don't clear pointers/pointerPositions - causes crashes during touch events
    }

    const effectiveRoam = roamMode && !isMoving;
    
    // --- 2. Smooth Follow Logic ---
    if (!effectiveRoam) {
        // Calculate where the player is visually (interpolated)
        if (isMoving) {
            // Simple approach: slide visual index towards target
            if (visualIndexRef.current < targetIndex) {
              visualIndexRef.current += delta * 3.0; // Speed of token tracking
              if (visualIndexRef.current > targetIndex) visualIndexRef.current = targetIndex;
            } else if (visualIndexRef.current > targetIndex) {
                 visualIndexRef.current = targetIndex;
            }
        } else {
             // Snapping when stopped or RESET
             // Detect large jumps (like reset) to snap instantly
             const dist = Math.abs(playerIndex - visualIndexRef.current);
             if (dist > 5.0) {
                 // Snap immediately if distance is large (Reset case)
                 visualIndexRef.current = playerIndex;
             } else if (dist > 0.01) {
                // Smooth catch up for small drifts
                visualIndexRef.current += (playerIndex - visualIndexRef.current) * delta * 5.0;
             } else {
                visualIndexRef.current = playerIndex;
             }
        }
        
        const targetPos = getWorldPos(visualIndexRef.current);
        
        // Smoothly interpolate the OrbitControls TARGET to follow the player
        if (controlsRef.current.target) {
             controlsRef.current.target.lerp(targetPos, 0.1); 
        }
    }
    
    
    try {
       controlsRef.current.update();
    } catch (e) {
       // console.warn("Camera controls update failed", e);
       // Attempt to recover:
       const safePos = getWorldPos(playerIndex);
       if (controlsRef.current.target) {
            controlsRef.current.target.copy(safePos);
       }
       // Force reset interaction state to release "stuck" fingers
       // -1 is typically NONE in OrbitControls
       if (controlsRef.current.state !== -1) {
           controlsRef.current.state = -1; 
       }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      
      // Limits
      minDistance={5}
      maxDistance={60} // Increased from 25 to prevent "freezing" feeling at mid-range
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
      
      // Feel
      enableDamping={true}
      dampingFactor={0.05} // Slightly lower damping for less "sticky" feel at limits
      rotateSpeed={0.8}
      zoomSpeed={0.8}
      panSpeed={1.5}
      
      // Default Target (will be overwritten by lerp in Follow mode)
      target={[0, 0, 0]}
    />
  );
};
