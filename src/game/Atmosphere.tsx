import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, Color, DoubleSide, InstancedMesh, Mesh, Object3D, ShaderMaterial } from 'three';

type AtmosphereQuality = 'low' | 'medium' | 'high';

// Particle color palette
const PARTICLE_COLORS = [
  new Color('#FFFACD'), // Warm gold
  new Color('#FFB3BA'), // Soft pink
  new Color('#E2B6FF'), // Light lavender
];

// Floating sparkle particles with color variation
const Particles: React.FC<{ count?: number }> = ({ count = 60 }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 45,
      y: Math.random() * 18 + 1.5,
      z: (Math.random() - 0.5) * 45,
      speed: 0.15 + Math.random() * 0.35,
      offset: Math.random() * Math.PI * 2,
      scale: 0.04 + Math.random() * 0.12,
      colorIndex: i % 3,
    }));
  }, [count]);

  // Set per-instance colors on mount
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      meshRef.current!.setColorAt(i, PARTICLE_COLORS[p.colorIndex]);
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [particles]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(time * 0.25 + p.offset) * 0.8,
        p.y + Math.sin(time * p.speed + p.offset) * 2.0 + Math.sin(time * 0.5 + p.offset * 2) * 0.5,
        p.z + Math.cos(time * 0.18 + p.offset) * 0.8
      );
      const pulse = 0.6 + Math.sin(time * 2.5 + p.offset) * 0.4;
      dummy.scale.setScalar(p.scale * pulse);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial
        transparent
        opacity={0.7}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// Falling leaf particles — tumbling flat planes
const LEAF_COLORS = [
  new Color('#7DD87D'), // Fresh green
  new Color('#A8E6CF'), // Mint
  new Color('#FFB86C'), // Warm orange
];

const FallingLeaves: React.FC<{ count?: number }> = ({ count = 12 }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const leaves = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 40,
      y: Math.random() * 12 + 2,
      z: (Math.random() - 0.5) * 40,
      speed: 0.08 + Math.random() * 0.12,
      tumbleSpeed: 0.5 + Math.random() * 1.5,
      offset: Math.random() * Math.PI * 2,
      scale: 0.08 + Math.random() * 0.06,
      colorIndex: i % 3,
    }));
  }, [count]);

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    leaves.forEach((l, i) => {
      meshRef.current!.setColorAt(i, LEAF_COLORS[l.colorIndex]);
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [leaves]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    leaves.forEach((l, i) => {
      // Slow horizontal drift + gentle vertical floating
      dummy.position.set(
        l.x + Math.sin(time * 0.15 + l.offset) * 2.5,
        l.y + Math.sin(time * l.speed + l.offset) * 1.5,
        l.z + Math.cos(time * 0.12 + l.offset) * 2.0
      );
      // Tumbling rotation
      dummy.rotation.set(
        time * l.tumbleSpeed + l.offset,
        time * l.tumbleSpeed * 0.7,
        Math.sin(time * 0.3 + l.offset) * 0.5
      );
      dummy.scale.setScalar(l.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 0.5]} />
      <meshBasicMaterial
        transparent
        opacity={0.65}
        depthWrite={false}
        side={DoubleSide}
      />
    </instancedMesh>
  );
};

// Animated gradient sky dome
const SkyGradient: React.FC<{ segments: number }> = ({ segments }) => {
  const meshRef = useRef<Mesh>(null);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTopColor: { value: new Color('#C4B5F5') },    // Soft lavender
        uBottomColor: { value: new Color('#FFE4D4') }, // Warm peach
        uSunColor: { value: new Color('#FFD699') },    // Golden sun glow
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunColor;
        uniform float uTime;
        varying vec3 vWorldPosition;
        
        void main() {
          float height = normalize(vWorldPosition).y;
          
          // Base gradient
          vec3 color = mix(uBottomColor, uTopColor, smoothstep(-0.2, 0.8, height));
          
          // Subtle animated sun glow at horizon
          float sunFactor = smoothstep(0.0, 0.3, height) * (1.0 - smoothstep(0.3, 0.6, height));
          sunFactor *= 0.3 + 0.1 * sin(uTime * 0.2);
          color = mix(color, uSunColor, sunFactor * 0.3);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: BackSide,
    });
  }, []);
  
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  
  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[100, segments, segments]} />
    </mesh>
  );
};

// Soft ground fog
const GroundFog: React.FC = () => {
  const meshRef = useRef<Mesh>(null);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uFogColor: { value: new Color('#ffffff') },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uFogColor;
        uniform float uTime;
        varying vec2 vUv;
        
        void main() {
          // Center-to-edge falloff
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          
          // Animated noise-like pattern
          float pattern = sin(vUv.x * 10.0 + uTime * 0.2) * 
                         cos(vUv.y * 8.0 - uTime * 0.15) * 0.5 + 0.5;
          
          float alpha = (1.0 - smoothstep(0.3, 1.0, dist)) * 0.25 * pattern;
          
          gl_FragColor = vec4(uFogColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, []);
  
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  
  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.1, 0]} 
      material={material}
    >
      <planeGeometry args={[80, 80]} />
    </mesh>
  );
};

// Low-altitude fireflies that pulse and drift near the ground
const Fireflies: React.FC<{ count?: number }> = ({ count = 15 }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const flies = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 30,
      y: 0.3 + Math.random() * 2.5,
      z: (Math.random() - 0.5) * 30,
      speed: 0.3 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
      pulseSpeed: 1.5 + Math.random() * 2.5,
      driftRadius: 0.5 + Math.random() * 1.5,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    flies.forEach((f, i) => {
      // Lazy drifting path
      const dx = Math.sin(time * f.speed * 0.3 + f.offset) * f.driftRadius;
      const dy = Math.sin(time * f.speed * 0.5 + f.offset * 2) * 0.4;
      const dz = Math.cos(time * f.speed * 0.25 + f.offset * 1.5) * f.driftRadius;
      dummy.position.set(f.x + dx, f.y + dy, f.z + dz);

      // Pulsing glow (scale in and out)
      const pulse = Math.max(0, Math.sin(time * f.pulseSpeed + f.offset));
      const s = 0.03 + pulse * 0.06;
      dummy.scale.setScalar(s);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#FFFAAA"
        transparent
        opacity={0.85}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// Puffy clouds made of overlapping flattened spheres (instanced)
const PUFFS_PER_CLOUD = 4;

const Clouds: React.FC<{ count?: number }> = ({ count = 8 }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const totalPuffs = count * PUFFS_PER_CLOUD;

  // Generate cloud centers and their puff offsets
  const cloudsData = useMemo(() => {
    return Array.from({ length: count }, () => {
      const cx = (Math.random() - 0.5) * 60;
      const cy = 12 + Math.random() * 8;
      const cz = (Math.random() - 0.5) * 60;
      const baseScale = 2.5 + Math.random() * 3;
      const speed = 0.08 + Math.random() * 0.08;
      // Generate puff offsets within the cloud
      const puffs = Array.from({ length: PUFFS_PER_CLOUD }, (_, j) => ({
        dx: (Math.random() - 0.5) * baseScale * 0.7,
        dy: (Math.random() - 0.3) * baseScale * 0.15,
        dz: (Math.random() - 0.5) * baseScale * 0.3,
        scale: (0.6 + Math.random() * 0.5) * baseScale * 0.45,
      }));
      return { cx, cy, cz, speed, puffs };
    });
  }, [count]);

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    let idx = 0;
    cloudsData.forEach((cloud) => {
      cloud.puffs.forEach((puff) => {
        dummy.position.set(
          cloud.cx + puff.dx,
          cloud.cy + puff.dy,
          cloud.cz + puff.dz
        );
        dummy.scale.set(puff.scale, puff.scale * 0.4, puff.scale * 0.7);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(idx, dummy.matrix);
        idx++;
      });
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [cloudsData, dummy]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    let idx = 0;
    cloudsData.forEach((cloud) => {
      const driftX = Math.sin(time * cloud.speed) * 2;
      cloud.puffs.forEach((puff) => {
        dummy.position.set(
          cloud.cx + puff.dx + driftX,
          cloud.cy + puff.dy,
          cloud.cz + puff.dz
        );
        dummy.scale.set(puff.scale, puff.scale * 0.4, puff.scale * 0.7);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(idx, dummy.matrix);
        idx++;
      });
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalPuffs]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// Animated butterflies — small colored planes with wing-flap rotation
const BUTTERFLY_COLORS = [
  new Color('#FFB3BA'), // Pink
  new Color('#BAE1FF'), // Sky blue
  new Color('#FFFACD'), // Light yellow
];

const Butterflies: React.FC<{ count?: number }> = ({ count = 8 }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const butterflies = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 35,
      y: 1.0 + Math.random() * 3.5,
      z: (Math.random() - 0.5) * 35,
      speed: 0.2 + Math.random() * 0.3,
      flapSpeed: 8 + Math.random() * 6,
      offset: Math.random() * Math.PI * 2,
      circleRadius: 1.5 + Math.random() * 2.5,
      scale: 0.06 + Math.random() * 0.04,
      colorIndex: i % 3,
    }));
  }, [count]);

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    butterflies.forEach((b, i) => {
      meshRef.current!.setColorAt(i, BUTTERFLY_COLORS[b.colorIndex]);
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [butterflies]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    butterflies.forEach((b, i) => {
      // Circular path with vertical bobbing
      const angle = time * b.speed + b.offset;
      dummy.position.set(
        b.x + Math.cos(angle) * b.circleRadius,
        b.y + Math.sin(time * b.speed * 1.5 + b.offset) * 0.6,
        b.z + Math.sin(angle) * b.circleRadius
      );

      // Wing flap via scale oscillation on X axis
      const flapPhase = Math.abs(Math.sin(time * b.flapSpeed + b.offset));
      dummy.scale.set(b.scale * (0.4 + flapPhase * 0.6), b.scale, b.scale);

      // Face direction of travel
      dummy.rotation.set(
        0,
        angle + Math.PI / 2,
        Math.sin(time * b.flapSpeed + b.offset) * 0.3
      );
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 0.6]} />
      <meshBasicMaterial
        transparent
        opacity={0.7}
        depthWrite={false}
        side={DoubleSide}
      />
    </instancedMesh>
  );
};

// Main atmosphere component
export const Atmosphere: React.FC<{ quality?: AtmosphereQuality }> = ({ quality = 'high' }) => {
  const config = useMemo(() => {
    if (quality === 'low') {
      return {
        skySegments: 16,
        particleCount: 0,
        leafCount: 0,
        fireflyCount: 0,
        cloudCount: 2,
        butterflyCount: 0,
        enableFog: false,
      };
    }

    if (quality === 'medium') {
      return {
        skySegments: 24,
        particleCount: 20,
        leafCount: 5,
        fireflyCount: 8,
        cloudCount: 4,
        butterflyCount: 4,
        enableFog: false,
      };
    }

    return {
      skySegments: 32,
      particleCount: 40,
      leafCount: 12,
      fireflyCount: 18,
      cloudCount: 6,
      butterflyCount: 8,
      enableFog: true,
    };
  }, [quality]);

  return (
    <group>
      <SkyGradient segments={config.skySegments} />
      {config.particleCount > 0 && <Particles count={config.particleCount} />}
      {config.leafCount > 0 && <FallingLeaves count={config.leafCount} />}
      {config.fireflyCount > 0 && <Fireflies count={config.fireflyCount} />}
      <Clouds count={config.cloudCount} />
      {config.butterflyCount > 0 && <Butterflies count={config.butterflyCount} />}
      {config.enableFog && <GroundFog />}
    </group>
  );
};

export default Atmosphere;
