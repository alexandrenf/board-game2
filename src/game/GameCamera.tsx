import { useFrame } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const OFFSET = new THREE.Vector3(4, 5, 4); // Isometric-ish offset
const LOOK_AT_OFFSET = new THREE.Vector3(0, 0, 0); // Look at player base

const TILE_SIZE = 1;
const GAP = 0.05;

export const GameCamera: React.FC = () => {
  const { path, playerIndex, boardSize } = useGameStore();

  const targetVec = useMemo(() => {
    if (!path[playerIndex]) return new THREE.Vector3(0, 0, 0);
    const { row, col } = path[playerIndex];
    const { rows, cols } = boardSize;
    
    const offsetX = (cols * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    const offsetZ = (rows * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    
    return new THREE.Vector3(
      col * (TILE_SIZE + GAP) - offsetX,
      0,
      row * (TILE_SIZE + GAP) - offsetZ
    );
  }, [path, playerIndex, boardSize]);

  useFrame((state, delta) => {
    // Desired camera position
    const desiredPos = targetVec.clone().add(OFFSET);
    
    // Smoothly interpolate camera position
    state.camera.position.lerp(desiredPos, delta * 2);
    
    // Make camera look at the target (player position)
    // We also want to smooth the lookAt, but lookAt is instant.
    // We can lerp the controls target if we had controls, but here we just set rotation.
    // To smooth lookAt, we can use a dummy target vector and lerp that.
    // But for simplicity, looking at the exact target tile is fine.
    state.camera.lookAt(targetVec);
  });

  return null;
};
