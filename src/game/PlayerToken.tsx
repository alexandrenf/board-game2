import { useFrame } from '@react-three/fiber';
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const TILE_SIZE = 1;
const GAP = 0.1;
const MOVE_SPEED = 2.0; // Tiles per second

export const PlayerToken: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, finishMovement, boardSize, shirtColor, hairColor } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  
  // Local state to track visual progress
  // We track the "current tile index" as a float
  const [visualIndex, setVisualIndex] = useState(playerIndex);

  // Helper to get world position from logical tile index (float)
  const getPositionFromIndex = (idx: number) => {
    // Clamp index
    const i = Math.max(0, Math.min(idx, path.length - 1));
    
    // Find the two tiles we are between
    const floorIdx = Math.floor(i);
    const ceilIdx = Math.ceil(i);
    const fraction = i - floorIdx;
    
    const tileA = path[floorIdx];
    const tileB = path[ceilIdx] || tileA; // Handle end of path
    
    const { rows, cols } = boardSize;
    const offsetX = (cols * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    const offsetZ = (rows * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    
    const posA = new THREE.Vector3(
      tileA.col * (TILE_SIZE + GAP) - offsetX,
      0.2 + 0.5, // Base height
      tileA.row * (TILE_SIZE + GAP) - offsetZ
    );
    
    const posB = new THREE.Vector3(
      tileB.col * (TILE_SIZE + GAP) - offsetX,
      0.2 + 0.5,
      tileB.row * (TILE_SIZE + GAP) - offsetZ
    );
    
    // Lerp between A and B
    const pos = new THREE.Vector3().lerpVectors(posA, posB, fraction);
    
    // Add Hop (Parabola)
    // Height is max at fraction 0.5
    // 4 * x * (1 - x) gives a parabola from 0 to 1 with max 1 at 0.5
    const hopHeight = 0.5 * 4 * fraction * (1 - fraction);
    pos.y += hopHeight;
    
    return pos;
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isMoving) {
      // Move visual index towards target index
      if (visualIndex < targetIndex) {
        const nextIndex = visualIndex + delta * MOVE_SPEED;
        
        if (nextIndex >= targetIndex) {
          // Arrived
          setVisualIndex(targetIndex);
          finishMovement();
        } else {
          setVisualIndex(nextIndex);
        }
      }
    } else {
      // If not moving, sync visual with logical (in case of reset or snap)
      if (Math.abs(visualIndex - playerIndex) > 0.01) {
         setVisualIndex(playerIndex);
      }
    }

    // Update mesh position
    const pos = getPositionFromIndex(visualIndex);
    groupRef.current.position.copy(pos);
    
    // Optional: Look at next tile
    // const nextPos = getPositionFromIndex(visualIndex + 0.1);
    // groupRef.current.lookAt(nextPos.x, pos.y, nextPos.z);
  });

  return (
    <group ref={groupRef} position={[0, 1, 0]}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      
      {/* Hair */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[0.2, 0.05, 0]} rotation={[0, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      <mesh position={[-0.2, 0.05, 0]} rotation={[0, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      
      {/* Legs */}
      <mesh position={[0.08, -0.3, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.08, -0.3, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
};
