import { triggerHaptic } from '@/src/utils/haptics';
import { OrbitControls } from '@/src/lib/r3f/drei';
import { useFrame, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MOVE_SPEED } from './constants';
import { getPlayerWorldPositionFromIndex } from './playerMotion';
import { useGameStore } from './state/gameState';

type OrbitControlsStateful = OrbitControlsImpl & { state: number };

export const GameCameraControls: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, isApplyingEffect, boardSize, roamMode, zoomLevel } =
    useGameStore();
  const { gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const visualIndexRef = useRef(playerIndex);

  const shouldEnableRef = useRef(true);
  const activeTouchCountRef = useRef(0);
  const controlsDisabledByMultiTouchRef = useRef(false);

  const shakeIntensity = useRef(0);
  const prevIsMoving = useRef(isMoving);
  const wasEffectMovementRef = useRef(false);

  const getControls = useCallback(() => controlsRef.current as OrbitControlsStateful | null, []);

  const resetControlState = useCallback(() => {
    const controls = getControls();
    if (!controls) return;
    controls.state = -1;
  }, [getControls]);

  const reenableControlsAfterMultiTouch = useCallback(() => {
    controlsDisabledByMultiTouchRef.current = false;
    shouldEnableRef.current = true;

    const controls = getControls();
    if (!controls) return;

    controls.enabled = true;
    resetControlState();
  }, [getControls, resetControlState]);

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

  const getWorldPos = useCallback(
    (idx: number, elapsedTime: number) =>
      getPlayerWorldPositionFromIndex({
        path,
        boardSize,
        index: idx,
        elapsedTime,
      }).pos,
    [boardSize, path]
  );

  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;

    const handleTouchStart = (event: TouchEvent) => {
      const controls = getControls();
      activeTouchCountRef.current = event.touches.length;

      if (activeTouchCountRef.current >= 2 && controls) {
        controlsDisabledByMultiTouchRef.current = true;
        shouldEnableRef.current = false;
        controls.enabled = false;
        resetControlState();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      activeTouchCountRef.current = event.touches.length;

      if (activeTouchCountRef.current <= 1 && controlsDisabledByMultiTouchRef.current) {
        reenableControlsAfterMultiTouch();
      }
    };

    const handleTouchCancel = handleTouchEnd;

    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [gl.domElement, getControls, reenableControlsAfterMultiTouch, resetControlState]);

  useEffect(() => {
    const controls = getControls();
    if (!controls) return;

    const effectiveRoam = roamMode && !isMoving;

    if (effectiveRoam) {
      controls.touches.ONE = THREE.TOUCH.PAN;
      controls.enablePan = true;
    } else {
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.enablePan = false;
    }

    // We still guard multitouch manually; keep a deterministic value here.
    controls.touches.TWO = THREE.TOUCH.PAN;
    resetControlState();
  }, [getControls, isMoving, resetControlState, roamMode]);

  useFrame((state, delta) => {
    const controls = getControls();
    if (!controls) return;
    if (path.length === 0) return;

    if (controlsDisabledByMultiTouchRef.current) return;

    if (shouldEnableRef.current && controls.enabled === false) {
      controls.enabled = true;
    }

    if (!Number.isFinite(visualIndexRef.current)) {
      visualIndexRef.current = playerIndex;
      const safePos = getWorldPos(playerIndex, state.clock.elapsedTime);
      controls.target.copy(safePos);
    }

    const camera = state.camera;
    if (!Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.y) || !Number.isFinite(camera.position.z)) {
      const safeTarget = getWorldPos(playerIndex, state.clock.elapsedTime);
      camera.position.set(safeTarget.x, 15, safeTarget.z - 15);
      camera.lookAt(safeTarget);
      camera.updateMatrix();
      camera.updateMatrixWorld(true);
      controls.target.copy(safeTarget);
      resetControlState();
      controls.update();
      return;
    }

    const target = controls.target;
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) {
      const safePos = getWorldPos(playerIndex, state.clock.elapsedTime);
      target.copy(safePos);
      controls.update();
    }

    const effectiveRoam = roamMode && !isMoving;

    if (!effectiveRoam) {
      if (isMoving) {
        if (visualIndexRef.current < targetIndex) {
          visualIndexRef.current += delta * MOVE_SPEED;
          if (visualIndexRef.current > targetIndex) visualIndexRef.current = targetIndex;
        } else if (visualIndexRef.current > targetIndex) {
          visualIndexRef.current -= delta * MOVE_SPEED;
          if (visualIndexRef.current < targetIndex) visualIndexRef.current = targetIndex;
        }
      } else {
        const distance = Math.abs(playerIndex - visualIndexRef.current);

        if (distance > 5.0) {
          visualIndexRef.current = playerIndex;
        } else if (distance > 0.01) {
          visualIndexRef.current += (playerIndex - visualIndexRef.current) * delta * 7.5;
        } else {
          visualIndexRef.current = playerIndex;
        }
      }

      const targetPos = getWorldPos(visualIndexRef.current, state.clock.elapsedTime);
      targetPos.y = Math.max(0.15, targetPos.y - 0.2);
      controls.target.lerp(targetPos, 0.22);
    }

    const currentDistance = camera.position.distanceTo(controls.target);
    if (Math.abs(currentDistance - zoomLevel) > 0.1) {
      const direction = camera.position.clone().sub(controls.target).normalize();
      const newDistance = THREE.MathUtils.lerp(currentDistance, zoomLevel, 0.08);
      camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
    }

    if (shakeIntensity.current > 0.01) {
      const shake = shakeIntensity.current;
      const randomX = (Math.random() - 0.5) * shake;
      const randomY = (Math.random() - 0.5) * shake;
      const randomZ = (Math.random() - 0.5) * shake;

      camera.position.x += randomX;
      camera.position.y += randomY;
      camera.position.z += randomZ;

      controls.target.x += randomX * 0.5;
      controls.target.y += randomY * 0.5;
      controls.target.z += randomZ * 0.5;

      shakeIntensity.current *= 0.9;
    } else {
      shakeIntensity.current = 0;
    }

    try {
      controls.update();
    } catch {
      const safePos = getWorldPos(playerIndex, state.clock.elapsedTime);
      controls.target.copy(safePos);
      resetControlState();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={5}
      maxDistance={60}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.1}
      enableZoom={false}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.8}
      panSpeed={1.5}
      target={[0, 0, 0]}
    />
  );
};
