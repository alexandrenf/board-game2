import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

const MAX_TRAIL = 20;
const MAX_DUST = 12;
const MAX_TILE_BURST = 10;
const TRAIL_LIFETIME = 0.6;
const DUST_LIFETIME = 0.5;
const BURST_LIFETIME = 0.7;

// Tile type colors for burst particles
const TILE_BURST_COLORS: Record<string, string> = {
  red: '#FF6B6B',
  green: '#4ADE80',
  blue: '#60A5FA',
  yellow: '#FBBF24',
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  alive: boolean;
}

/**
 * Movement trail sparkles + landing dust puffs + impact ring + tile-type burst.
 * Follows a target ref (the player group).
 */
export const CharacterEffects: React.FC<{
  target: React.RefObject<THREE.Group | null>;
  isMoving: boolean;
  landingImpact: number; // 0-1, set to 1 on landing
  landingTileColor?: string; // tile color for type-specific burst
}> = ({ target, isMoving, landingImpact, landingTileColor }) => {
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const burstRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Particle pools
  const trailParticles = useRef<Particle[]>(
    Array.from({ length: MAX_TRAIL }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 999,
      maxAge: TRAIL_LIFETIME,
      alive: false,
    }))
  );

  const dustParticles = useRef<Particle[]>(
    Array.from({ length: MAX_DUST }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 999,
      maxAge: DUST_LIFETIME,
      alive: false,
    }))
  );

  const burstParticles = useRef<Particle[]>(
    Array.from({ length: MAX_TILE_BURST }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 999,
      maxAge: BURST_LIFETIME,
      alive: false,
    }))
  );

  const spawnTimer = useRef(0);
  const lastLandingImpact = useRef(0);
  const lastPos = useRef(new THREE.Vector3());
  // Impact ring state
  const ringPhase = useRef(0);
  const ringPos = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!target.current) return;
    const pos = target.current.position;

    // ---- TRAIL PARTICLES ---- spawn while moving
    if (isMoving) {
      spawnTimer.current += delta;
      if (spawnTimer.current > 0.06) {
        spawnTimer.current = 0;
        const p = trailParticles.current.find((p) => !p.alive);
        if (p) {
          p.alive = true;
          p.age = 0;
          p.maxAge = TRAIL_LIFETIME + Math.random() * 0.2;
          p.position.set(
            pos.x + (Math.random() - 0.5) * 0.2,
            pos.y - 0.3 + Math.random() * 0.15,
            pos.z + (Math.random() - 0.5) * 0.2
          );
          p.velocity.set(
            (Math.random() - 0.5) * 0.3,
            0.4 + Math.random() * 0.3,
            (Math.random() - 0.5) * 0.3
          );
        }
      }
    } else {
      spawnTimer.current = 0;
    }

    // ---- DUST PUFF + IMPACT RING + TILE BURST ---- on landing
    if (landingImpact > 0.5 && lastLandingImpact.current < 0.3) {
      // Dust puffs
      for (let i = 0; i < 6; i++) {
        const p = dustParticles.current.find((p) => !p.alive);
        if (p) {
          const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
          p.alive = true;
          p.age = 0;
          p.maxAge = DUST_LIFETIME + Math.random() * 0.15;
          p.position.set(pos.x, pos.y - 0.4, pos.z);
          p.velocity.set(
            Math.cos(angle) * (0.8 + Math.random() * 0.5),
            0.15 + Math.random() * 0.2,
            Math.sin(angle) * (0.8 + Math.random() * 0.5)
          );
        }
      }

      // Impact ring
      ringPhase.current = 1.0;
      ringPos.current.set(pos.x, pos.y - 0.35, pos.z);

      // Tile-type burst particles
      const burstColor = TILE_BURST_COLORS[(landingTileColor || 'blue').toLowerCase()] || TILE_BURST_COLORS.blue;
      if (burstRef.current) {
        // Set burst color dynamically
        const mat = burstRef.current.material as THREE.MeshBasicMaterial;
        mat.color.set(burstColor);
      }
      for (let i = 0; i < MAX_TILE_BURST; i++) {
        const p = burstParticles.current[i];
        const angle = (i / MAX_TILE_BURST) * Math.PI * 2 + Math.random() * 0.3;
        p.alive = true;
        p.age = 0;
        p.maxAge = BURST_LIFETIME + Math.random() * 0.2;
        p.position.set(pos.x, pos.y - 0.2, pos.z);
        p.velocity.set(
          Math.cos(angle) * (0.6 + Math.random() * 0.4),
          0.8 + Math.random() * 0.5,
          Math.sin(angle) * (0.6 + Math.random() * 0.4)
        );
      }
    }
    lastLandingImpact.current = landingImpact;

    // ---- UPDATE IMPACT RING ----
    if (ringRef.current) {
      if (ringPhase.current > 0) {
        ringPhase.current -= delta * 2.5;
        const t = 1 - ringPhase.current;
        const scale = 0.3 + t * 1.2;
        ringRef.current.position.copy(ringPos.current);
        ringRef.current.scale.set(scale, scale, 1);
        const mat = ringRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = ringPhase.current * 0.5;
        ringRef.current.visible = true;
      } else {
        ringRef.current.visible = false;
      }
    }

    // ---- UPDATE TRAIL ----
    if (trailRef.current) {
      trailParticles.current.forEach((p, i) => {
        if (p.alive) {
          p.age += delta;
          if (p.age >= p.maxAge) {
            p.alive = false;
          }
          p.position.x += p.velocity.x * delta;
          p.position.y += p.velocity.y * delta;
          p.position.z += p.velocity.z * delta;
          p.velocity.y -= delta * 0.5;
        }

        if (p.alive) {
          const life = 1 - p.age / p.maxAge;
          dummy.position.copy(p.position);
          dummy.scale.setScalar(0.04 * life);
          dummy.updateMatrix();
          trailRef.current!.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          trailRef.current!.setMatrixAt(i, dummy.matrix);
        }
      });
      trailRef.current.instanceMatrix.needsUpdate = true;
    }

    // ---- UPDATE DUST ----
    if (dustRef.current) {
      dustParticles.current.forEach((p, i) => {
        if (p.alive) {
          p.age += delta;
          if (p.age >= p.maxAge) {
            p.alive = false;
          }
          p.position.x += p.velocity.x * delta;
          p.position.y += p.velocity.y * delta;
          p.position.z += p.velocity.z * delta;
          p.velocity.x *= 0.95;
          p.velocity.z *= 0.95;
          p.velocity.y -= delta * 0.3;
        }

        if (p.alive) {
          const life = 1 - p.age / p.maxAge;
          dummy.position.copy(p.position);
          dummy.scale.setScalar(0.06 * life + 0.02);
          dummy.updateMatrix();
          dustRef.current!.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          dustRef.current!.setMatrixAt(i, dummy.matrix);
        }
      });
      dustRef.current.instanceMatrix.needsUpdate = true;
    }

    // ---- UPDATE TILE BURST ----
    if (burstRef.current) {
      burstParticles.current.forEach((p, i) => {
        if (p.alive) {
          p.age += delta;
          if (p.age >= p.maxAge) {
            p.alive = false;
          }
          p.position.x += p.velocity.x * delta;
          p.position.y += p.velocity.y * delta;
          p.position.z += p.velocity.z * delta;
          p.velocity.y -= delta * 1.5; // stronger gravity for arc
          p.velocity.x *= 0.97;
          p.velocity.z *= 0.97;
        }

        if (p.alive) {
          const life = 1 - p.age / p.maxAge;
          dummy.position.copy(p.position);
          dummy.scale.setScalar(0.035 * life + 0.01);
          dummy.updateMatrix();
          burstRef.current!.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          burstRef.current!.setMatrixAt(i, dummy.matrix);
        }
      });
      burstRef.current.instanceMatrix.needsUpdate = true;
    }

    lastPos.current.copy(pos);
  });

  return (
    <group>
      {/* Trail sparkles */}
      <instancedMesh ref={trailRef} args={[undefined, undefined, MAX_TRAIL]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color="#FFE066"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Dust puffs */}
      <instancedMesh ref={dustRef} args={[undefined, undefined, MAX_DUST]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color="#E8D5BC"
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Tile-type burst particles */}
      <instancedMesh ref={burstRef} args={[undefined, undefined, MAX_TILE_BURST]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#60A5FA"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Impact ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.4, 0.55, 24]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
