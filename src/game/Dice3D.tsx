import { RoundedBox } from '@/src/lib/r3f/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { CanvasTexture, DoubleSide, Euler, Group, MathUtils, Mesh, MeshBasicMaterial, SphereGeometry, SpriteMaterial } from 'three';
import { audioManager } from '@/src/services/audio/audioManager';
import { useGameStore } from './state/gameState';

const ROTATION_SPEED = 18;

// Pulsing glow ring
const GlowRing: React.FC<{ visible: boolean }> = ({ visible }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
    meshRef.current.scale.setScalar(pulse);
    (meshRef.current.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
  });

  if (!visible) return null;

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <ringGeometry args={[0.35, 0.45, 32]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.4} side={DoubleSide} />
    </mesh>
  );
};

// Floating result number that pops up and fades out.
// Uses CanvasTexture which requires DOM canvas — only available on web.
const ResultPopupWeb: React.FC<{ value: number | null }> = ({ value }) => {
  const groupRef = useRef<Group>(null);
  const matRef = useRef<SpriteMaterial>(null);
  const phase = useRef(0);
  const activeValue = useRef<number | null>(null);

  // Create canvas texture for number display — safe here because this
  // component is only rendered when Platform.OS === 'web'.
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const tex = new CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    if (value && value !== activeValue.current) {
      activeValue.current = value;
      phase.current = 1.0;

      // Draw number onto canvas
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#4E2C17';
      ctx.lineWidth = 6;
      ctx.font = 'bold 90px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(String(value), 64, 64);
      ctx.fillText(String(value), 64, 64);
      texture.needsUpdate = true;
    }
  }, [value, texture]);

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return;
    if (phase.current <= 0) {
      matRef.current.opacity = 0;
      return;
    }

    phase.current -= delta * 1.2;
    const t = Math.max(0, phase.current);

    // Float upward and fade out
    groupRef.current.position.y = 0.5 + (1 - t) * 0.6;
    // Pop-in scale
    const scale = t > 0.7 ? 1.0 + (1 - (t - 0.7) / 0.3) * 0.3 : 1.0;
    groupRef.current.scale.setScalar(scale * 0.5);
    matRef.current.opacity = Math.min(1, t * 2.5);
  });

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      <sprite>
        <spriteMaterial
          ref={matRef}
          map={texture}
          transparent
          opacity={0}
          depthTest={false}
        />
      </sprite>
    </group>
  );
};

// Platform guard: CanvasTexture requires DOM canvas (document.createElement),
// which is unavailable on native iOS/Android runtimes.
const ResultPopup: React.FC<{ value: number | null }> = Platform.OS === 'web'
  ? ResultPopupWeb
  : () => null;

const Pips: React.FC = () => {
  // Use spheres for dimpled appearance - they sit into the surface
  const pipGeo = useMemo(() => new SphereGeometry(0.055, 12, 12), []);
  const pipMat = useMemo(() => new MeshBasicMaterial({ color: '#2D3748' }), []);

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

export const Dice3D: React.FC<{ isRollingOverride?: boolean; isMovingOverride?: boolean }> = ({
  isRollingOverride,
  isMovingOverride,
}) => {
  const storeIsRolling = useGameStore((s) => s.isRolling);
  const storeIsMoving = useGameStore((s) => s.isMoving);
  const currentRoll = useGameStore((s) => s.currentRoll);
  const completeRoll = useGameStore((s) => s.completeRoll);
  const isRolling = isRollingOverride ?? storeIsRolling;
  const isMoving = isMovingOverride ?? storeIsMoving;
  const meshRef = useRef<Group>(null);
  const scaleRef = useRef<Group>(null);
  const [targetRotation, setTargetRotation] = useState(new Euler(0, 0, 0));
  const bouncePhase = useRef(0);
  // Anticipation: dice lifts and shakes before rolling
  const anticipationPhase = useRef(0);
  const wasRolling = useRef(false);

  const canRoll = !isRolling && !isMoving;

  // Track rolling start for anticipation
  useEffect(() => {
    if (isRolling && !wasRolling.current) {
      anticipationPhase.current = 1.0;
      void audioManager.playSfx('sfx.dice_roll');
    }
    wasRolling.current = isRolling;
  }, [isRolling]);

  useEffect(() => {
    if (isRolling && isRollingOverride == null) {
      const timeout = setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1;
        completeRoll(val);
        void audioManager.playSfx('sfx.dice_settle');
        bouncePhase.current = 1; // Start bounce
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isRolling, completeRoll, isRollingOverride]);

  useEffect(() => {
    if (currentRoll) {
      let rot = new Euler(0, 0, 0);
      switch (currentRoll) {
        case 1: rot = new Euler(0, 0, 0); break;
        case 2: rot = new Euler(0, Math.PI, 0); break;
        case 3: rot = new Euler(Math.PI / 2, 0, 0); break;
        case 4: rot = new Euler(-Math.PI / 2, 0, 0); break;
        case 5: rot = new Euler(0, -Math.PI / 2, 0); break;
        case 6: rot = new Euler(0, Math.PI / 2, 0); break;
      }

      if (meshRef.current) {
        const current = meshRef.current.rotation;
        const adjust = (curr: number, base: number) => {
          const k = Math.round((curr - base) / (Math.PI * 2));
          return base + k * Math.PI * 2;
        };

        setTargetRotation(new Euler(
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
        // Anticipation: first 0.15s, dice lifts and shakes
        if (anticipationPhase.current > 0) {
          anticipationPhase.current -= delta * 6; // ~0.17s
          const shake = Math.sin(state.clock.elapsedTime * 60) * 0.03 * anticipationPhase.current;
          meshRef.current.position.x = shake;
          meshRef.current.position.y = anticipationPhase.current * 0.08;
        } else {
          meshRef.current.position.x = 0;
          meshRef.current.position.y = 0;
        }

        meshRef.current.rotation.x += delta * ROTATION_SPEED;
        meshRef.current.rotation.y += delta * ROTATION_SPEED * 0.7;
        meshRef.current.rotation.z += delta * ROTATION_SPEED * 0.5;
      } else {
        // Smooth lerp to target rotation with micro-bounce damping
        const lerpSpeed = bouncePhase.current > 0 ? 10 : 6;
        meshRef.current.rotation.x = MathUtils.lerp(meshRef.current.rotation.x, targetRotation.x, delta * lerpSpeed);
        meshRef.current.rotation.y = MathUtils.lerp(meshRef.current.rotation.y, targetRotation.y, delta * lerpSpeed);
        meshRef.current.rotation.z = MathUtils.lerp(meshRef.current.rotation.z, targetRotation.z, delta * lerpSpeed);
        meshRef.current.position.x = MathUtils.lerp(meshRef.current.position.x, 0, delta * 8);
        meshRef.current.position.y = MathUtils.lerp(meshRef.current.position.y, 0, delta * 8);

        // Subtle idle rotation when can roll
        if (canRoll) {
          meshRef.current.rotation.y += delta * 0.3;
        }
      }
    }

    // Bouncy scale animation on result with micro-bounces
    if (scaleRef.current) {
      if (bouncePhase.current > 0) {
        bouncePhase.current -= delta * 3.5;
        // Multiple micro-bounces with decaying amplitude
        const bounce = 1 + Math.sin(bouncePhase.current * Math.PI * 4) * 0.12 * bouncePhase.current;
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
      <ResultPopup value={currentRoll} />

      <group ref={scaleRef} scale={[4.0, 4.0, 4.0]}>
        <group ref={meshRef}>
          {/* Main dice body - CUTE ROUNDED VERSION */}
          <mesh castShadow receiveShadow>
            <RoundedBox args={[0.6, 0.6, 0.6]} radius={0.1} smoothness={4}>
               <meshStandardMaterial color="#FFF5EE" roughness={0.18} metalness={0.05} />
            </RoundedBox>
          </mesh>

          <Pips />
        </group>
      </group>
    </group>
  );
};
