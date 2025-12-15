import { useGLTF } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { LayeredShadow } from './BlobShadow';
import { CELL_SIZE, MOVE_SPEED, PLAYER_COLORS } from './constants';
import { useGameStore } from './state/gameState';

// Use PLAYER_COLORS from centralized constants
const COLORS = PLAYER_COLORS;

// Trail particle (spawned when moving) - enhanced with glow
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
    if (elapsed > 1.2) {
      setOpacity(0);
      return;
    }
    
    // Fade in then out with smoother curve
    const fadeIn = Math.min(elapsed * 5, 1);
    const fadeOut = Math.max(0, 1 - (elapsed - 0.3) / 0.9);
    setOpacity(fadeIn * fadeOut * 0.7);
    
    // Float upward with slight curve
    meshRef.current.position.y = position.y + elapsed * 0.6;
    meshRef.current.position.x = position.x + Math.sin(elapsed * 3) * 0.05;
    
    // Scale down smoothly
    const scale = 0.18 * (1 - elapsed / 1.2);
    meshRef.current.scale.setScalar(scale);
  });
  
  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial 
        color="#FFE4B5" 
        transparent 
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};



// ...

export const PlayerToken: React.FC = () => {
  const { path, playerIndex, targetIndex, isMoving, finishMovement, boardSize, shirtColor, hairColor, skinColor } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const characterRef = useRef<THREE.Group>(null);
  
  // Local state for visual progress
  const [visualIndex, setVisualIndex] = useState(playerIndex);
  
  // Trail particles
  const [trails, setTrails] = useState<Array<{ id: number; pos: THREE.Vector3 }>>([]);
  const trailCounter = useRef(0);
  const lastTrailTime = useRef(0);
  
  // Load Character model
  const characterAsset = Asset.fromModule(require('../../assets/character.glb'));
  const { scene } = useGLTF(characterAsset.uri);
  
  const clone = useMemo(() => {
    const clonedScene = scene.clone();
    clonedScene.traverse((node: any) => {
      if (node.isMesh) {
        node.material = node.material.clone();
      }
    });
    return clonedScene;
  }, [scene]);

  useEffect(() => {
    clone.traverse((node: any) => {
      if (node.isMesh && node.material) {
        const matName = node.material.name;
        
        if (matName.includes('Skin')) {
          node.material.color.set(skinColor);
        } else if (matName.includes('Hair')) {
          node.material.color.set(hairColor);
        } else if (matName.includes('Shirt')) {
          node.material.color.set(shirtColor);
        }
      }
    });
  }, [clone, skinColor, hairColor, shirtColor]);

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
    const offsetX = (cols * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const offsetZ = (rows * CELL_SIZE) / 2 - CELL_SIZE / 2;
    
    const posA = new THREE.Vector3(
      tileA.col * CELL_SIZE - offsetX,
      0.2 + 0.5,
      tileA.row * CELL_SIZE - offsetZ
    );
    
    const posB = new THREE.Vector3(
      tileB.col * CELL_SIZE - offsetX,
      0.2 + 0.5,
      tileB.row * CELL_SIZE - offsetZ
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
      
      {/* Player shadow that follows the character */}
      <LayeredShadow target={groupRef} scale={0.8} />
      
      <group ref={groupRef} position={[0, 1, 0]}>
        <group ref={characterRef}>
          {/* Loaded Character GLB */}
          <primitive 
            object={clone} 
            scale={[0.4, 0.4, 0.4]} 
            position={[0, -0.15, 0]} 
            rotation={[0, 0, 0]} 
          />
        </group>
      </group>
    </>
  );
};
