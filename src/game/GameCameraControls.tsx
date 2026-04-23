import { triggerHaptic } from '@/src/utils/haptics';
import { OrbitControls } from '@/src/lib/r3f/drei';
import { useFrame, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useRef } from 'react';
import { MathUtils, TOUCH, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { settleVisualIndex, stepVisualIndex } from './movementProfile';
import { getPlayerWorldPositionFromIndex } from './playerMotion';
import { useGameStore } from './state/gameState';

type OrbitControlsStateful = OrbitControlsImpl & { state: number };

export const GameCameraControls: React.FC = () => {
  const path = useGameStore((state) => state.path);
  const boardSize = useGameStore((state) => state.boardSize);
  const roamMode = useGameStore((state) => state.roamMode);
  const zoomLevel = useGameStore((state) => state.zoomLevel);
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const gameStatus = useGameStore((state) => state.gameStatus);
  const playerIndex = useGameStore((state) => state.playerIndex);
  const targetIndex = useGameStore((state) => state.targetIndex);
  const isMoving = useGameStore((state) => state.isMoving);
  const isApplyingEffect = useGameStore((state) => state.isApplyingEffect);
  const multiplayerEnabled = useMultiplayerRuntimeStore((state) => state.enabled);
  const multiplayerActors = useMultiplayerRuntimeStore((state) => state.actors);
  const focusActorId = useMultiplayerRuntimeStore((state) => state.focusActorId);
  const autoFollowActorId = useMultiplayerRuntimeStore((state) => state.autoFollowActorId);
  const mePlayerId = useMultiplayerRuntimeStore((state) => state.mePlayerId);
  const { gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const visualIndexRef = useRef(playerIndex);
  const movementSpeedRef = useRef(0);
  const worldPosRef = useRef(new Vector3());
  const zoomDirectionRef = useRef(new Vector3());

  const shouldEnableRef = useRef(true);
  const activeTouchCountRef = useRef(0);
  const controlsDisabledByMultiTouchRef = useRef(false);

  const shakeIntensity = useRef(0);
  const prevIsMoving = useRef(isMoving);
  const wasEffectMovementRef = useRef(false);
  const savedCameraPositionRef = useRef(new Vector3());
  const savedCameraTargetRef = useRef(new Vector3());
  const wasFollowingRef = useRef(false);
  const restoreCameraRef = useRef(false);
  // Smooth mode transition: easing factor ramps up when switching modes
  const modeTransitionRef = useRef(0);
  const prevRoamMode = useRef(roamMode);

  const multiplayerCameraMode = gameStatus === 'multiplayer' && multiplayerEnabled;
  const selectedActorId = autoFollowActorId ?? focusActorId;
  const selectedActor =
    multiplayerActors.length > 0
      ? selectedActorId
        ? multiplayerActors.find((actor) => actor.id === selectedActorId) ?? multiplayerActors[0]
        : multiplayerActors[0]
      : undefined;
  const activePlayerIndex = multiplayerCameraMode && selectedActor ? selectedActor.position : playerIndex;
  const activeTargetIndex = multiplayerCameraMode && selectedActor ? selectedActor.targetIndex : targetIndex;
  const shouldAutoFollow = Boolean(multiplayerCameraMode && autoFollowActorId && selectedActor);
  const activeIsMoving = shouldAutoFollow ? Boolean(selectedActor?.isMoving) : isMoving;

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
    if (activeIsMoving && isApplyingEffect) {
      wasEffectMovementRef.current = true;
    }

    if (prevIsMoving.current && !activeIsMoving) {
      const wasEffectMovement = wasEffectMovementRef.current;
      // Enhanced landing shake: slightly stronger for more satisfying impact
      shakeIntensity.current = wasEffectMovement ? 0.6 : 0.9;
      if (!wasEffectMovement) {
        triggerHaptic('heavy');
      }
      wasEffectMovementRef.current = false;
    }

    prevIsMoving.current = activeIsMoving;
  }, [isApplyingEffect, activeIsMoving]);

  // Smooth mode transition when switching between follow/roam
  useEffect(() => {
    if (roamMode !== prevRoamMode.current) {
      modeTransitionRef.current = 1.0; // Start transition ease
      prevRoamMode.current = roamMode;
    }
  }, [roamMode]);

  const getWorldPos = useCallback(
    (idx: number, elapsedTime: number, outPos?: Vector3) =>
      getPlayerWorldPositionFromIndex({
        path,
        boardSize,
        index: idx,
        elapsedTime,
        outPos,
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

    const effectiveRoam = !shouldAutoFollow && roamMode && !activeIsMoving;

    if (effectiveRoam) {
      controls.touches.ONE = TOUCH.PAN;
      controls.enablePan = true;
    } else {
      controls.touches.ONE = TOUCH.ROTATE;
      controls.enablePan = false;
    }

    // We still guard multitouch manually; keep a deterministic value here.
    controls.touches.TWO = TOUCH.PAN;
    resetControlState();
  }, [activeIsMoving, getControls, resetControlState, roamMode, shouldAutoFollow]);

  useFrame((state, delta) => {
    const controls = getControls();
    if (!controls) return;
    if (path.length === 0) return;

    if (controlsDisabledByMultiTouchRef.current) return;

    if (shouldEnableRef.current && controls.enabled === false) {
      controls.enabled = true;
    }

    if (!Number.isFinite(visualIndexRef.current)) {
      visualIndexRef.current = activePlayerIndex;
      movementSpeedRef.current = 0;
      const safePos = getWorldPos(activePlayerIndex, state.clock.elapsedTime, worldPosRef.current);
      controls.target.copy(safePos);
    }

    const camera = state.camera;
    if (!Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.y) || !Number.isFinite(camera.position.z)) {
      const safeTarget = getWorldPos(activePlayerIndex, state.clock.elapsedTime, worldPosRef.current);
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
      const safePos = getWorldPos(activePlayerIndex, state.clock.elapsedTime, worldPosRef.current);
      target.copy(safePos);
      controls.update();
    }

    const isSpectatorFollowing = Boolean(mePlayerId && autoFollowActorId && mePlayerId !== autoFollowActorId);
    if (shouldAutoFollow && !wasFollowingRef.current && isSpectatorFollowing) {
      savedCameraPositionRef.current.copy(camera.position);
      savedCameraTargetRef.current.copy(controls.target);
      restoreCameraRef.current = false;
    }
    if (!shouldAutoFollow && wasFollowingRef.current && isSpectatorFollowing) {
      restoreCameraRef.current = true;
    }
    wasFollowingRef.current = shouldAutoFollow;

    const effectiveRoam = !shouldAutoFollow && roamMode && !activeIsMoving;

    if (!effectiveRoam && (!multiplayerCameraMode || shouldAutoFollow || Boolean(selectedActor))) {
      let followStrength = 0.2;

      if (activeIsMoving) {
        const step = stepVisualIndex({
          currentIndex: visualIndexRef.current,
          targetIndex: activeTargetIndex,
          currentSpeed: movementSpeedRef.current,
          delta,
        });
        visualIndexRef.current = step.nextIndex;
        movementSpeedRef.current = step.nextSpeed;
        followStrength = MathUtils.lerp(0.2, 0.34, step.speedRatio);
      } else {
        movementSpeedRef.current = 0;
        visualIndexRef.current = settleVisualIndex(visualIndexRef.current, activePlayerIndex, delta);
        // Use a gentler pan when idling between turns in multiplayer so the
        // camera smoothly drifts to whichever player's turn is next.
        followStrength = multiplayerCameraMode && !shouldAutoFollow ? 0.05 : 0.2;
      }

      const targetPos = getWorldPos(visualIndexRef.current, state.clock.elapsedTime, worldPosRef.current);
      targetPos.y = Math.max(0.15, targetPos.y - 0.2);
      controls.target.lerp(targetPos, followStrength);
    }

    if (!shouldAutoFollow && restoreCameraRef.current && isSpectatorFollowing) {
      controls.target.lerp(savedCameraTargetRef.current, 0.14);
      camera.position.lerp(savedCameraPositionRef.current, 0.12);

      const positionDistance = camera.position.distanceTo(savedCameraPositionRef.current);
      const targetDistance = controls.target.distanceTo(savedCameraTargetRef.current);
      if (positionDistance <= 0.08 && targetDistance <= 0.08) {
        restoreCameraRef.current = false;
      }
    }

    const currentDistance = camera.position.distanceTo(controls.target);
    if (Math.abs(currentDistance - zoomLevelRef.current) > 0.1) {
      const direction = zoomDirectionRef.current.subVectors(camera.position, controls.target);
      if (direction.lengthSq() < 0.000001) {
        direction.set(0, 1, 0);
      } else {
        direction.normalize();
      }
      const newDistance = MathUtils.lerp(currentDistance, zoomLevelRef.current, 0.08);
      camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
    }

    // Decay mode transition factor for smooth camera behavior during switch
    if (modeTransitionRef.current > 0.01) {
      modeTransitionRef.current *= 1 - delta * 3; // ~0.3s ease
    } else {
      modeTransitionRef.current = 0;
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
      const safePos = getWorldPos(activePlayerIndex, state.clock.elapsedTime, worldPosRef.current);
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
