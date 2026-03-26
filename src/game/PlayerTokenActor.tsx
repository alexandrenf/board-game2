import { useGLTF } from '@/src/lib/r3f/drei';
import { useFrame } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyAvatarColors, cloneAvatarScene } from './avatarModel';
import { LayeredShadow } from './BlobShadow';
import { CharacterEffects } from './CharacterEffects';
import { MOVEMENT, PLAYER_ANIMATION } from './constants';
import { settleVisualIndex, stepVisualIndex } from './movementProfile';
import { getPlayerWorldPositionFromIndex } from './playerMotion';
import { Tile } from './state/gameState';
import { triggerTileLanding } from './tileMotion';

// Keep require at module scope for Expo asset compatibility with GLB module resolution.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHARACTER_ASSET = Asset.fromModule(require('../../assets/character.glb'));

export type PlayerTokenActorProps = {
  actorId: string;
  path: Tile[];
  boardSize: { rows: number; cols: number };
  playerIndex: number;
  targetIndex: number;
  isMoving: boolean;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  offsetX?: number;
  offsetZ?: number;
  modelScale?: number;
  /** Safety timeout in ms: if isMoving stays true longer than this, force-drain the queue. */
  movementTimeoutMs?: number;
  onArrive?: (actorId: string) => void;
  onFocusTileIndex?: (actorId: string, tileIndex: number) => void;
};

export const PlayerTokenActor: React.FC<PlayerTokenActorProps> = ({
  actorId,
  path,
  boardSize,
  playerIndex,
  targetIndex,
  isMoving,
  shirtColor,
  hairColor,
  skinColor,
  offsetX = 0,
  offsetZ = 0,
  modelScale = 0.5,
  movementTimeoutMs = 5000,
  onArrive,
  onFocusTileIndex,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const characterRef = useRef<THREE.Group>(null);

  const visualIndexRef = useRef(playerIndex);
  const lastReportedFocusRef = useRef(playerIndex);
  const movementSpeedRef = useRef(0);
  const landingImpactRef = useRef(0);
  const lastSegmentRef = useRef(Math.floor(playerIndex));
  const arrivalLockRef = useRef(false);
  const worldPosRef = useRef(new THREE.Vector3());
  const headingFromRef = useRef(new THREE.Vector3());
  const headingToRef = useRef(new THREE.Vector3());

  const { scene } = useGLTF(CHARACTER_ASSET.uri);

  const clone = useMemo(() => cloneAvatarScene(scene), [scene]);

  useEffect(() => {
    clone.traverse((object) => applyAvatarColors(object, { skinColor, hairColor, shirtColor }));
  }, [clone, skinColor, hairColor, shirtColor]);

  useEffect(() => {
    if (isMoving) return;
    visualIndexRef.current = playerIndex;
    lastSegmentRef.current = Math.floor(playerIndex);
    lastReportedFocusRef.current = playerIndex;
  }, [isMoving, playerIndex]);

  // Safety timeout: if onArrive never fires (animation edge case), force-drain the queue
  // by calling onArrive after movementTimeoutMs. The normal onArrive path clears itself first.
  useEffect(() => {
    if (!isMoving) return;

    const timer = setTimeout(() => {
      onArrive?.(actorId);
    }, movementTimeoutMs);

    return () => {
      clearTimeout(timer);
    };
  }, [actorId, isMoving, movementTimeoutMs, onArrive, targetIndex]);

  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current || !characterRef.current) return;
    if (path.length === 0) return;

    let movementDirection = 0;
    let movementSpeedRatio = 0;

    if (isMoving) {
      const step = stepVisualIndex({
        currentIndex: visualIndexRef.current,
        targetIndex,
        currentSpeed: movementSpeedRef.current,
        delta,
      });
      visualIndexRef.current = step.nextIndex;
      movementSpeedRef.current = step.nextSpeed;
      movementDirection = step.direction;
      movementSpeedRatio = step.speedRatio;

      if (step.arrived) {
        if (!arrivalLockRef.current) {
          arrivalLockRef.current = true;
          onArrive?.(actorId);
        }
      } else {
        arrivalLockRef.current = false;
      }
    } else {
      arrivalLockRef.current = false;
      movementSpeedRef.current = 0;
      visualIndexRef.current = settleVisualIndex(visualIndexRef.current, playerIndex, delta);
      lastSegmentRef.current = Math.floor(visualIndexRef.current + MOVEMENT.arrivalEpsilon);
    }

    if (movementDirection !== 0) {
      const headingFromIndex = visualIndexRef.current - movementDirection * MOVEMENT.headingLookBehind;
      const headingToIndex = visualIndexRef.current + movementDirection * MOVEMENT.headingLookAhead;

      const { pos: headingFrom } = getPlayerWorldPositionFromIndex({
        path,
        boardSize,
        index: headingFromIndex,
        elapsedTime: state.clock.elapsedTime,
        outPos: headingFromRef.current,
      });
      const { pos: headingTo } = getPlayerWorldPositionFromIndex({
        path,
        boardSize,
        index: headingToIndex,
        elapsedTime: state.clock.elapsedTime,
        outPos: headingToRef.current,
      });

      const dx = headingTo.x - headingFrom.x;
      const dz = headingTo.z - headingFrom.z;
      if (dx * dx + dz * dz > 0.00001) {
        targetRotation.current = Math.atan2(dx, dz);
      }

      const currentSegment = Math.floor(visualIndexRef.current + MOVEMENT.arrivalEpsilon);
      const crossedSegment =
        (movementDirection > 0 && currentSegment > lastSegmentRef.current) ||
        (movementDirection < 0 && currentSegment < lastSegmentRef.current);

      if (crossedSegment) {
        landingImpactRef.current = 1;
        lastSegmentRef.current = currentSegment;
        triggerTileLanding(currentSegment);
      }
    }

    const { pos, hopHeight } = getPlayerWorldPositionFromIndex({
      path,
      boardSize,
      index: visualIndexRef.current,
      elapsedTime: state.clock.elapsedTime,
      outPos: worldPosRef.current,
    });
    groupRef.current.position.set(pos.x + offsetX, pos.y, pos.z + offsetZ);

    let diff = targetRotation.current - currentRotation.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    currentRotation.current += diff * Math.min(1, delta * PLAYER_ANIMATION.turnResponse);
    groupRef.current.rotation.y = currentRotation.current;

    landingImpactRef.current = Math.max(0, landingImpactRef.current - delta * PLAYER_ANIMATION.landingImpactDecay);

    if (isMoving) {
      const stretchFactor = 1 + hopHeight * 0.4;
      const squashFactor = 1 / Math.sqrt(stretchFactor);
      const landingImpact = landingImpactRef.current * PLAYER_ANIMATION.landingImpactStrength;
      const scaleY = Math.max(0.82, stretchFactor - landingImpact);
      const scaleXZ = squashFactor + landingImpact * 0.5;

      characterRef.current.scale.set(scaleXZ, scaleY, scaleXZ);

      const forwardLeanTarget = -movementSpeedRatio * PLAYER_ANIMATION.maxForwardLean;
      const turnLeanTarget = THREE.MathUtils.clamp(
        -diff * 0.55,
        -PLAYER_ANIMATION.maxTurnLean,
        PLAYER_ANIMATION.maxTurnLean
      );

      characterRef.current.rotation.x = THREE.MathUtils.damp(
        characterRef.current.rotation.x,
        forwardLeanTarget,
        PLAYER_ANIMATION.tiltResponse,
        delta
      );
      characterRef.current.rotation.z = THREE.MathUtils.damp(
        characterRef.current.rotation.z,
        turnLeanTarget,
        PLAYER_ANIMATION.tiltResponse,
        delta
      );
    } else {
      const breathe =
        1 +
        Math.sin(state.clock.elapsedTime * PLAYER_ANIMATION.idleBreathSpeed) * PLAYER_ANIMATION.idleBreathAmountY;
      const breatheX =
        1 +
        Math.sin(state.clock.elapsedTime * PLAYER_ANIMATION.idleBreathSpeed + Math.PI) *
          PLAYER_ANIMATION.idleBreathAmountX;
      characterRef.current.scale.set(breatheX, breathe, breatheX);
      characterRef.current.rotation.x = THREE.MathUtils.damp(
        characterRef.current.rotation.x,
        0,
        PLAYER_ANIMATION.tiltResponse,
        delta
      );
      characterRef.current.rotation.z = THREE.MathUtils.damp(
        characterRef.current.rotation.z,
        0,
        PLAYER_ANIMATION.tiltResponse,
        delta
      );
    }

    const focusedIndex = Math.round(visualIndexRef.current);
    if (focusedIndex !== lastReportedFocusRef.current) {
      lastReportedFocusRef.current = focusedIndex;
      onFocusTileIndex?.(actorId, focusedIndex);
    }
  });

  return (
    <>
      <LayeredShadow target={groupRef} scale={1.0} />

      <group ref={groupRef} position={[0, 1, 0]}>
        <group ref={characterRef}>
          <primitive object={clone} scale={[modelScale, modelScale, modelScale]} position={[0, -0.1, 0]} rotation={[0, 0, 0]} />
        </group>
      </group>

      <CharacterEffects
        target={groupRef}
        isMoving={isMoving}
        landingImpact={landingImpactRef.current}
        landingTileColor={path[Math.min(playerIndex, path.length - 1)]?.color}
      />
    </>
  );
};
