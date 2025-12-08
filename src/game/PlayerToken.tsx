import { useFrame } from '@react-three/fiber';
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const TILE_SIZE = 1;
const GAP = 0.1;
const MOVE_SPEED = 2.5;

// Color constants
const COLORS = {
  skin: '#FFD5B8',
  outline: '#4A3B5C',
  pants: '#4A5568',
  shoes: '#2D3748',
};

// Trail particle (spawned when moving)
const TrailParticle: React.FC<{
  position: THREE.Vector3;
  delay: number;
}> = ({ position, delay }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(0);
  const startTime = useRef<number | null>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime + delay;
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    
    if (elapsed < 0) return;
    if (elapsed > 1.5) {
      setOpacity(0);
      return;
    }
    
    // Fade in then out
    const fadeIn = Math.min(elapsed * 4, 1);
    const fadeOut = Math.max(0, 1 - (elapsed - 0.5) / 1);
    setOpacity(fadeIn * fadeOut * 0.5);
    
    // Float upward
    meshRef.current.position.y = position.y + elapsed * 0.5;
    
    // Scale down
    const scale = 0.15 * (1 - elapsed / 1.5);
    meshRef.current.scale.setScalar(scale);
  });
  
  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial 
        color="#ffffff" 
        transparent 
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
};

export const PlayerToken: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, finishMovement, boardSize, shirtColor, hairColor } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const characterRef = useRef<THREE.Group>(null);
  
  // Local state for visual progress
  const [visualIndex, setVisualIndex] = useState(playerIndex);
  
  // Trail particles
  const [trails, setTrails] = useState<Array<{ id: number; pos: THREE.Vector3 }>>([]);
  const trailCounter = useRef(0);
  const lastTrailTime = useRef(0);
  
  // Rotation state
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  // Helper to get world position from logical tile index (float)
  const getPositionFromIndex = (idx: number) => {
    const i = Math.max(0, Math.min(idx, path.length - 1));
    
    const floorIdx = Math.floor(i);
    const ceilIdx = Math.ceil(i);
    const fraction = i - floorIdx;
    
    const tileA = path[floorIdx];
    const tileB = path[ceilIdx] || tileA;
    
    const { rows, cols } = boardSize;
    const offsetX = (cols * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    const offsetZ = (rows * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
    
    const posA = new THREE.Vector3(
      tileA.col * (TILE_SIZE + GAP) - offsetX,
      0.2 + 0.5,
      tileA.row * (TILE_SIZE + GAP) - offsetZ
    );
    
    const posB = new THREE.Vector3(
      tileB.col * (TILE_SIZE + GAP) - offsetX,
      0.2 + 0.5,
      tileB.row * (TILE_SIZE + GAP) - offsetZ
    );
    
    const pos = new THREE.Vector3().lerpVectors(posA, posB, fraction);
    
    // Enhanced hop arc (parabola)
    const hopHeight = 0.6 * 4 * fraction * (1 - fraction);
    pos.y += hopHeight;
    
    return { pos, fraction, hopHeight };
  };

  useFrame((state, delta) => {
    if (!groupRef.current || !characterRef.current) return;

    if (isMoving) {
      if (visualIndex < targetIndex) {
        const nextIndex = visualIndex + delta * MOVE_SPEED;
        
        // Calculate direction for rotation
        const { pos: currentPos } = getPositionFromIndex(visualIndex);
        const { pos: futurePos } = getPositionFromIndex(Math.min(visualIndex + 0.1, targetIndex));
        
        const dx = futurePos.x - currentPos.x;
        const dz = futurePos.z - currentPos.z;
        
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          targetRotation.current = Math.atan2(dx, dz);
        }
        
        if (nextIndex >= targetIndex) {
          setVisualIndex(targetIndex);
          finishMovement();
        } else {
          setVisualIndex(nextIndex);
          
          // Spawn trail particles
          if (state.clock.elapsedTime - lastTrailTime.current > 0.1) {
            const { pos } = getPositionFromIndex(visualIndex);
            setTrails(prev => {
              const newTrails = [...prev, { id: trailCounter.current++, pos: pos.clone() }];
              return newTrails.slice(-10); // Keep last 10
            });
            lastTrailTime.current = state.clock.elapsedTime;
          }
        }
      }
    } else {
      if (Math.abs(visualIndex - playerIndex) > 0.01) {
        setVisualIndex(playerIndex);
      }
    }

    // Update position with squash/stretch
    const { pos, fraction, hopHeight } = getPositionFromIndex(visualIndex);
    groupRef.current.position.copy(pos);
    
    // Smooth rotation
    // Shortest path angle interpolation
    let diff = targetRotation.current - currentRotation.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    currentRotation.current += diff * delta * 10;
    groupRef.current.rotation.y = currentRotation.current;
    
    // Squash and stretch based on hop phase
    if (isMoving) {
      // During rise: stretch vertically
      // At peak: normal
      // During fall: stretch vertically  
      // On land: squash
      
      const stretchFactor = 1 + hopHeight * 0.4; // More stretch at peak
      const squashFactor = 1 / Math.sqrt(stretchFactor); // Preserve volume
      
      characterRef.current.scale.set(squashFactor, stretchFactor, squashFactor);
    } else {
      // Idle breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      const breatheX = 1 + Math.sin(state.clock.elapsedTime * 2 + Math.PI) * 0.02;
      characterRef.current.scale.set(breatheX, breathe, breatheX);
    }
    
    // Subtle idle bob
    if (!isMoving) {
      const bob = Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      groupRef.current.position.y += bob;
    }
  });

  return (
    <>
      {/* Trail particles */}
      {trails.map(trail => (
        <TrailParticle key={trail.id} position={trail.pos} delay={0} />
      ))}
      
      <group ref={groupRef} position={[0, 1, 0]}>
        <group ref={characterRef}>
          {/* Body */}
          <mesh position={[0, 0, 0]} castShadow>
            <capsuleGeometry args={[0.15, 0.3, 4, 12]} />
            <meshToonMaterial color={shirtColor} />
          </mesh>
          
          {/* Head */}
          <mesh position={[0, 0.38, 0]} castShadow>
            <sphereGeometry args={[0.17, 16, 16]} />
            <meshToonMaterial color={COLORS.skin} />
          </mesh>
          
          {/* Hair */}
          <mesh position={[0, 0.48, 0]} castShadow>
            <sphereGeometry args={[0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color={hairColor} />
          </mesh>
          
          {/* Simple dot eyes */}
          <mesh position={[-0.06, 0.4, 0.14]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#2D3748" />
          </mesh>
          <mesh position={[0.06, 0.4, 0.14]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#2D3748" />
          </mesh>
          
          {/* Eye highlights */}
          <mesh position={[-0.055, 0.405, 0.16]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.065, 0.405, 0.16]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          
          {/* Rosy cheeks */}
          <mesh position={[-0.1, 0.35, 0.12]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#FFB6C1" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.1, 0.35, 0.12]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#FFB6C1" transparent opacity={0.6} />
          </mesh>
          
          {/* Small smile */}
          <mesh position={[0, 0.32, 0.15]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.03, 0.008, 8, 12, Math.PI]} />
            <meshBasicMaterial color="#D4726A" />
          </mesh>
          
          {/* Arms */}
          <mesh position={[0.22, 0.02, 0]} rotation={[0.2, 0, -0.3]} castShadow>
            <capsuleGeometry args={[0.045, 0.25, 4, 8]} />
            <meshToonMaterial color={COLORS.skin} />
          </mesh>
          <mesh position={[-0.22, 0.02, 0]} rotation={[0.2, 0, 0.3]} castShadow>
            <capsuleGeometry args={[0.045, 0.25, 4, 8]} />
            <meshToonMaterial color={COLORS.skin} />
          </mesh>
          
          {/* Hands (little balls) */}
          <mesh position={[0.28, -0.12, 0.05]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshToonMaterial color={COLORS.skin} />
          </mesh>
          <mesh position={[-0.28, -0.12, 0.05]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshToonMaterial color={COLORS.skin} />
          </mesh>
          
          {/* Legs */}
          <mesh position={[0.08, -0.32, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.25, 4, 8]} />
            <meshToonMaterial color={COLORS.pants} />
          </mesh>
          <mesh position={[-0.08, -0.32, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.25, 4, 8]} />
            <meshToonMaterial color={COLORS.pants} />
          </mesh>
          
          {/* Shoes (little rounded boxes) */}
          <mesh position={[0.08, -0.52, 0.02]} castShadow>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshToonMaterial color={COLORS.shoes} />
          </mesh>
          <mesh position={[-0.08, -0.52, 0.02]} castShadow>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshToonMaterial color={COLORS.shoes} />
          </mesh>
        </group>
      </group>
    </>
  );
};
