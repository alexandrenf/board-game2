import { triggerHaptic } from '@/src/utils/haptics';
import { OrbitControls } from '@react-three/drei/native';
import { useFrame, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CELL_SIZE } from './constants';
import { useGameStore } from './state/gameState';
export const GameCameraControls: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, isApplyingEffect, boardSize, roamMode, zoomLevel } = useGameStore();
  const { gl } = useThree();
  const controlsRef = useRef<any>(null);
  
  // Track visual index for smooth following
  const visualIndexRef = useRef(playerIndex);
  
  // Track if controls should be enabled
  const shouldEnableRef = useRef(true);
  const activeTouchCountRef = useRef(0);
  const controlsDisabledByMultiTouchRef = useRef(false);
  const reenableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Shake intensity ref
  const shakeIntensity = useRef(0);
  const prevIsMoving = useRef(isMoving);
  const wasEffectMovementRef = useRef(false);
  
  // Trigger shake on land
  useEffect(() => {
    if (isMoving && isApplyingEffect) {
      wasEffectMovementRef.current = true;
    }

    if (prevIsMoving.current && !isMoving) {
        const wasEffectMovement = wasEffectMovementRef.current;
        shakeIntensity.current = wasEffectMovement ? 0.55 : 0.8;
        if (!wasEffectMovement) {
          triggerHaptic('heavy');
        }
        wasEffectMovementRef.current = false;
    }
    prevIsMoving.current = isMoving;
  }, [isApplyingEffect, isMoving]);
  
  // Calculate world position
  const getWorldPos = useCallback((idx: number) => {
    if (!path || path.length === 0) return new THREE.Vector3(0, 0, 0);
    
    // Clamp index
    const i = Math.max(0, Math.min(idx, path.length - 1));
    const tile = path[Math.floor(i)];
    if (!tile) return new THREE.Vector3(0, 0, 0);
    
    // Initialize valid dimensions if boardSize is missing (fallback)
    const rows = boardSize?.rows || 10;
    const cols = boardSize?.cols || 10;

    const offsetX = (cols * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const offsetZ = (rows * CELL_SIZE) / 2 - CELL_SIZE / 2;
    
    return new THREE.Vector3(
      tile.col * CELL_SIZE - offsetX,
      0,
      tile.row * CELL_SIZE - offsetZ
    );
  }, [path, boardSize]);
  
  // --- Multi-touch Protection ---
  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      activeTouchCountRef.current = e.touches.length;
      
      // If multiple touches, disable controls immediately
      if (activeTouchCountRef.current >= 2 && controlsRef.current) {
        controlsDisabledByMultiTouchRef.current = true;
        shouldEnableRef.current = false;
        controlsRef.current.enabled = false;
        // Reset internal state to prevent corruption
        controlsRef.current.state = -1;
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      activeTouchCountRef.current = e.touches.length;
      
      // Re-enable when all extra fingers lifted
      if (activeTouchCountRef.current <= 1 && controlsDisabledByMultiTouchRef.current) {
        // Delay re-enable slightly to let OrbitControls fully reset
        if (reenableTimeoutRef.current) {
          clearTimeout(reenableTimeoutRef.current);
        }
        reenableTimeoutRef.current = setTimeout(() => {
          if (controlsRef.current) {
            controlsDisabledByMultiTouchRef.current = false;
            shouldEnableRef.current = true;
            controlsRef.current.enabled = true;
            controlsRef.current.state = -1;
          }
        }, 100);
      }
    };
    
    const handleTouchCancel = handleTouchEnd;
    
    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    
    return () => {
      if (reenableTimeoutRef.current) {
        clearTimeout(reenableTimeoutRef.current);
      }
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [gl.domElement]);
  
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
    
    // DISABLE two-finger gestures entirely
    controlsRef.current.touches.TWO = undefined as any;
    
    // Reset state when mode changes
    controlsRef.current.state = -1;
  }, [roamMode, isMoving]);

  // Logic Loop
  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    // Safety check
    if (!path || path.length === 0) return;

    // --- Multi-touch Guard: Don't process if disabled by multi-touch ---
    if (controlsDisabledByMultiTouchRef.current) {
      return;
    }
    
    // --- WATCHDOG: Re-enable if manually disabled by multi-touch guard ---
    if (shouldEnableRef.current && controlsRef.current.enabled === false) {
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
    
    // --- SHAKE LOGIC ---
    // Decay shake
    if (shakeIntensity.current > 0.01) {
       const shake = shakeIntensity.current;
       const rx = (Math.random() - 0.5) * shake;
       const ry = (Math.random() - 0.5) * shake;
       const rz = (Math.random() - 0.5) * shake;
       
       cam.position.x += rx;
       cam.position.y += ry;
       cam.position.z += rz;
       
       if (controlsRef.current.target) {
          controlsRef.current.target.x += rx * 0.5;
          controlsRef.current.target.y += ry * 0.5;
          controlsRef.current.target.z += rz * 0.5;
       }
       
       shakeIntensity.current *= 0.9; // Fast decay
    } else {
       shakeIntensity.current = 0;
    }

    try {
       controlsRef.current.update();
    } catch {
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
      
      // DISABLE zoom to prevent two-finger issues
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
