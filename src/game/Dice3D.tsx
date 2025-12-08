import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const ROTATION_SPEED = 20;

export const Dice3D: React.FC = () => {
  const { isRolling, currentRoll, completeRoll } = useGameStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const [targetRotation, setTargetRotation] = useState(new THREE.Euler(0, 0, 0));
  
  // Timer to stop rolling
  useEffect(() => {
    if (isRolling) {
      const timeout = setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1;
        completeRoll(val);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isRolling, completeRoll]);

  // Determine target rotation based on value
  useEffect(() => {
    if (currentRoll) {
      // Define rotations to show specific faces
      // Assuming standard box mapping where:
      // Front: 1? Right: ? 
      // Let's just create a visual mapping.
      // We'll use Text on faces to be sure, or just know the mapping.
      // Let's assume:
      // 1: Front (0, 0, 0)
      // 2: Back (0, PI, 0)
      // 3: Top (-PI/2, 0, 0)
      // 4: Bottom (PI/2, 0, 0)
      // 5: Right (0, -PI/2, 0)
      // 6: Left (0, PI/2, 0)
      
      // Wait, let's just rotate the cube so the correct number faces UP (Y+).
      // If 1 is Front (Z+), to make it face UP, we rotate X by -PI/2.
      
      let rot = new THREE.Euler(0, 0, 0);
      switch (currentRoll) {
        case 1: rot = new THREE.Euler(-Math.PI / 2, 0, 0); break; // Front -> Up
        case 2: rot = new THREE.Euler(Math.PI / 2, 0, 0); break;  // Back -> Up
        case 3: rot = new THREE.Euler(0, 0, 0); break;            // Top -> Up (Already Up if 3 is Top)
        case 4: rot = new THREE.Euler(Math.PI, 0, 0); break;      // Bottom -> Up
        case 5: rot = new THREE.Euler(0, 0, Math.PI / 2); break;  // Right -> Up
        case 6: rot = new THREE.Euler(0, 0, -Math.PI / 2); break; // Left -> Up
      }
      
      // Add some randomness to full rotations so it spins to the target
      setTargetRotation(new THREE.Euler(
        rot.x + Math.PI * 4, 
        rot.y + Math.PI * 4, 
        rot.z + Math.PI * 4
      ));
    }
  }, [currentRoll]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (isRolling) {
        // Random rotation
        meshRef.current.rotation.x += delta * ROTATION_SPEED;
        meshRef.current.rotation.y += delta * ROTATION_SPEED;
        meshRef.current.rotation.z += delta * ROTATION_SPEED;
      } else {
        // Lerp to target
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.x, delta * 5);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.y, delta * 5);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.z, delta * 5);
      }
    }
  });

  // Simple Dice Face Textures/Materials
  // We'll use a simple box with different colors or just pips.
  // For simplicity and "classic look", white box with black pips.
  // Since creating textures procedurally is complex, I'll use <Text> components attached to the mesh.
  
  return (
    <group position={[0, 3, 0]}> {/* Floating above board */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};
