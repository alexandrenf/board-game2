import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const ROTATION_SPEED = 20;

const Pips = () => {
  // Divots: Black cylinders, very flat, slightly embedded
  const pipGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), []);
  const pipMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111' }), []);
  
  const offset = 0.301; // Just outside the 0.6 box (0.3 half-width)
  const spread = 0.15;
  
  // Helper to place pips on faces
  // We need to rotate them to align with faces
  
  return (
    <group>
      {/* 1 - Front (Z+) */}
      <mesh geometry={pipGeo} material={pipMat} position={[0, 0, offset]} rotation={[Math.PI/2, 0, 0]} />
      
      {/* 2 - Back (Z-) */}
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, -spread, -offset]} rotation={[Math.PI/2, 0, 0]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, spread, -offset]} rotation={[Math.PI/2, 0, 0]} />
      
      {/* 3 - Top (Y+) */}
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, offset, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[0, offset, 0]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, offset, spread]} />
      
      {/* 4 - Bottom (Y-) */}
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, -offset, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, -offset, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, -offset, spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, -offset, spread]} />
      
      {/* 5 - Right (X+) */}
      <mesh geometry={pipGeo} material={pipMat} position={[offset, -spread, -spread]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, spread, -spread]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, 0, 0]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, -spread, spread]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, spread, spread]} rotation={[0, 0, Math.PI/2]} />
      
      {/* 6 - Left (X-) */}
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, -spread, -spread]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, spread, -spread]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, -spread, 0]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, spread, 0]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, -spread, spread]} rotation={[0, 0, Math.PI/2]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, spread, spread]} rotation={[0, 0, Math.PI/2]} />
    </group>
  );
};

export const Dice3D: React.FC = () => {
  const { isRolling, currentRoll, completeRoll } = useGameStore();
  const meshRef = useRef<THREE.Group>(null);
  const [targetRotation, setTargetRotation] = useState(new THREE.Euler(0, 0, 0));
  
  useEffect(() => {
    if (isRolling) {
      const timeout = setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1;
        completeRoll(val);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isRolling, completeRoll]);

  useEffect(() => {
    if (currentRoll) {
      // Rotate to show correct face FRONT (Z+) because camera looks from Z
      let rot = new THREE.Euler(0, 0, 0);
      switch (currentRoll) {
        case 1: rot = new THREE.Euler(0, 0, 0); break;            // Front -> Front
        case 2: rot = new THREE.Euler(0, Math.PI, 0); break;      // Back -> Front
        case 3: rot = new THREE.Euler(Math.PI / 2, 0, 0); break;  // Top -> Front
        case 4: rot = new THREE.Euler(-Math.PI / 2, 0, 0); break; // Bottom -> Front
        case 5: rot = new THREE.Euler(0, -Math.PI / 2, 0); break; // Right -> Front
        case 6: rot = new THREE.Euler(0, Math.PI / 2, 0); break;  // Left -> Front
      }
      
      // Snap current rotation to nearest 2PI to avoid long spins
      if (meshRef.current) {
        const current = meshRef.current.rotation;
        const snap = (val: number, target: number) => {
          const diff = target - val;
          const turns = Math.round(diff / (Math.PI * 2));
          return target - turns * Math.PI * 2; 
          // Wait, we want to set target to be close to current.
          // target = base + k * 2PI
          // We want base + k*2PI approx current
          // k approx (current - base) / 2PI
        };
        
        const adjust = (curr: number, base: number) => {
           const k = Math.round((curr - base) / (Math.PI * 2));
           return base + k * Math.PI * 2;
        };
        
        setTargetRotation(new THREE.Euler(
          adjust(current.x, rot.x),
          adjust(current.y, rot.y),
          adjust(current.z, rot.z)
        ));
      } else {
        setTargetRotation(rot);
      }
    }
  }, [currentRoll]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (isRolling) {
        meshRef.current.rotation.x += delta * ROTATION_SPEED;
        meshRef.current.rotation.y += delta * ROTATION_SPEED;
        meshRef.current.rotation.z += delta * ROTATION_SPEED;
      } else {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.x, delta * 5);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.y, delta * 5);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.z, delta * 5);
        
        // Idle rotation - Disabled to show result
        // if (!isRolling) {
        //      meshRef.current.rotation.y += delta * 0.5;
        // }
      }
    }
  });

  return (
    <group position={[0, 0, 0]} scale={[4.0, 4.0, 4.0]}> {/* Scale up for visibility */}
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.2} metalness={0.1} />
        </mesh>
        <Pips />
      </group>
    </group>
  );
};
