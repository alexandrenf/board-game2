import { RoundedBox } from '@/src/lib/r3f/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const ROTATION_SPEED = 18;

// Pulsing glow ring
const GlowRing: React.FC<{ visible: boolean }> = ({ visible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
    meshRef.current.scale.setScalar(pulse);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
  });
  
  if (!visible) return null;
  
  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <ringGeometry args={[0.35, 0.45, 32]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Pips: React.FC = () => {
  // Use spheres for dimpled appearance - they sit into the surface
  const pipGeo = useMemo(() => new THREE.SphereGeometry(0.055, 12, 12), []);
  const pipMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2D3748' }), []);
  
  // Offset adjusted to be inside the dice surface (dice is 0.6, half = 0.3, rounded radius = 0.1)
  const offset = 0.26;
  const spread = 0.12;
  
  return (
    <group>
      {/* 1 - Front */}
      <mesh geometry={pipGeo} material={pipMat} position={[0, 0, offset]} />
      
      {/* 2 - Back */}
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, -spread, -offset]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, spread, -offset]} />
      
      {/* 3 - Top */}
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, offset, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[0, offset, 0]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, offset, spread]} />
      
      {/* 4 - Bottom */}
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, -offset, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, -offset, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-spread, -offset, spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[spread, -offset, spread]} />
      
      {/* 5 - Right */}
      <mesh geometry={pipGeo} material={pipMat} position={[offset, -spread, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, spread, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, 0, 0]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, -spread, spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[offset, spread, spread]} />
      
      {/* 6 - Left */}
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, -spread, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, spread, -spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, -spread, 0]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, spread, 0]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, -spread, spread]} />
      <mesh geometry={pipGeo} material={pipMat} position={[-offset, spread, spread]} />
    </group>
  );
};

export const Dice3D: React.FC = () => {
  const { isRolling, isMoving, currentRoll, completeRoll } = useGameStore();
  const meshRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const [targetRotation, setTargetRotation] = useState(new THREE.Euler(0, 0, 0));
  const bouncePhase = useRef(0);
  
  const canRoll = !isRolling && !isMoving;

  useEffect(() => {
    if (isRolling) {
      const timeout = setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1;
        completeRoll(val);
        bouncePhase.current = 1; // Start bounce
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isRolling, completeRoll]);

  useEffect(() => {
    if (currentRoll) {
      let rot = new THREE.Euler(0, 0, 0);
      switch (currentRoll) {
        case 1: rot = new THREE.Euler(0, 0, 0); break;
        case 2: rot = new THREE.Euler(0, Math.PI, 0); break;
        case 3: rot = new THREE.Euler(Math.PI / 2, 0, 0); break;
        case 4: rot = new THREE.Euler(-Math.PI / 2, 0, 0); break;
        case 5: rot = new THREE.Euler(0, -Math.PI / 2, 0); break;
        case 6: rot = new THREE.Euler(0, Math.PI / 2, 0); break;
      }
      
      if (meshRef.current) {
        const current = meshRef.current.rotation;
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
        meshRef.current.rotation.y += delta * ROTATION_SPEED * 0.7;
        meshRef.current.rotation.z += delta * ROTATION_SPEED * 0.5;
      } else {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.x, delta * 6);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.y, delta * 6);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.z, delta * 6);
        
        // Subtle idle rotation when can roll
        if (canRoll) {
          meshRef.current.rotation.y += delta * 0.3;
        }
      }
    }
    
    // Bouncy scale animation on result
    if (scaleRef.current) {
      if (bouncePhase.current > 0) {
        bouncePhase.current -= delta * 4;
        const bounce = 1 + Math.sin(bouncePhase.current * Math.PI * 3) * 0.15 * bouncePhase.current;
        scaleRef.current.scale.setScalar(4.0 * bounce);
      } else {
        // Subtle breathing when idle and can roll
        if (canRoll) {
          const breathe = 4.0 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
          scaleRef.current.scale.setScalar(breathe);
        } else {
          scaleRef.current.scale.setScalar(4.0);
        }
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <GlowRing visible={canRoll} />
      
      <group ref={scaleRef} scale={[4.0, 4.0, 4.0]}>
        <group ref={meshRef}>
          {/* Main dice body - CUTE ROUNDED VERSION */}
          <mesh castShadow receiveShadow>
            <RoundedBox args={[0.6, 0.6, 0.6]} radius={0.1} smoothness={4}>
               <meshStandardMaterial color="#FFF5EE" roughness={0.2} metalness={0.0} />
            </RoundedBox>
          </mesh>
          
          <Pips />
        </group>
      </group>
    </group>
  );
};
