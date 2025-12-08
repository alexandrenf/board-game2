import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const TILE_SIZE = 1;
const GAP = 0.05;
const SPEED = 10; // Speed of interpolation

export const PlayerToken: React.FC = () => {
  const { path, playerIndex, shirtColor, hairColor, boardSize } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate target position based on playerIndex
  const targetPos = useMemo(() => {
    if (!path[playerIndex]) return new THREE.Vector3(0, 0, 0);
    const { row, col } = path[playerIndex];
    const { rows, cols } = boardSize;
    
    // Same offset logic as Board.tsx
    const offsetX = (cols * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    const offsetZ = (rows * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    
    return new THREE.Vector3(
      col * (TILE_SIZE + GAP) - offsetX,
      0.2 + 0.5, // 0.2 (tile height) + 0.5 (half player height)
      row * (TILE_SIZE + GAP) - offsetZ
    );
  }, [path, playerIndex, boardSize]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smoothly interpolate position
      const currentPos = groupRef.current.position;
      
      // Simple lerp for X and Z
      currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetPos.x, delta * SPEED);
      currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetPos.z, delta * SPEED);
      
      // Hop effect for Y
      // If we are moving (distance is significant), add a hop
      const dist = new THREE.Vector2(currentPos.x - targetPos.x, currentPos.z - targetPos.z).length();
      
      if (dist > 0.05) {
        // Simple hop: max height when halfway
        // We can approximate a hop by adding a sine wave based on distance or time
        // But since we are lerping, it's harder to get a perfect arc without a dedicated animation controller.
        // Let's just add a small offset based on distance to simulate a "lift"
        // This is a cheat but looks okay for simple movement
        const hopHeight = Math.sin(dist * Math.PI * 2) * 0.5; 
        // Actually, simpler:
        // If dist is large, we are in the middle of a move.
        // Let's just set Y to base + some function of distance.
        // But dist decreases as we arrive.
        // A better way for "discrete hops" is to have the GameLoop handle the animation progress.
        // For now, let's just lerp Y to target Y (which is flat).
        // And maybe add a bobbing motion if we want.
        // The prompt asks for "small upward arc".
        // Let's try to base it on the distance to target.
        // If dist is 0.5 (halfway), height is max.
        // dist starts at ~1.0 and goes to 0.
        // So sin(dist * PI) should give an arc.
        currentPos.y = targetPos.y + Math.sin(dist * Math.PI) * 0.5;
      } else {
        currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetPos.y, delta * SPEED);
      }
      
      // Face the target?
      // groupRef.current.lookAt(targetPos); // Might be too jittery
    }
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
