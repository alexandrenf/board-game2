import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Floating sparkle particles with enhanced glow
const Particles: React.FC<{ count?: number }> = ({ count = 60 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Generate random particle positions with color variation
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 45,
      y: Math.random() * 18 + 1.5,
      z: (Math.random() - 0.5) * 45,
      speed: 0.15 + Math.random() * 0.35,
      offset: Math.random() * Math.PI * 2,
      scale: 0.04 + Math.random() * 0.12,
      colorIndex: i % 3, // For color variation
    }));
  }, [count]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    particles.forEach((p, i) => {
      // Gentle floating motion with multiple frequencies
      dummy.position.set(
        p.x + Math.sin(time * 0.25 + p.offset) * 0.8,
        p.y + Math.sin(time * p.speed + p.offset) * 2.0 + Math.sin(time * 0.5 + p.offset * 2) * 0.5,
        p.z + Math.cos(time * 0.18 + p.offset) * 0.8
      );
      
      // Pulsing scale with breathing effect
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
        color="#FFFACD" 
        transparent 
        opacity={0.7} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// Animated gradient sky dome
const SkyGradient: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color('#C4B5F5') },    // Soft lavender
        uBottomColor: { value: new THREE.Color('#FFE4D4') }, // Warm peach
        uSunColor: { value: new THREE.Color('#FFD699') },    // Golden sun glow
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
      side: THREE.BackSide,
    });
  }, []);
  
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  
  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[100, 32, 32]} />
    </mesh>
  );
};

// Soft ground fog
const GroundFog: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uFogColor: { value: new THREE.Color('#ffffff') },
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

// Floating clouds (simple billboards)
const Clouds: React.FC<{ count?: number }> = ({ count = 8 }) => {
  const cloudsData = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 60,
      y: 12 + Math.random() * 8,
      z: (Math.random() - 0.5) * 60,
      scale: 3 + Math.random() * 4,
      speed: 0.1 + Math.random() * 0.1,
      opacity: 0.3 + Math.random() * 0.2,
    }));
  }, [count]);
  
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    
    groupRef.current.children.forEach((cloud, i) => {
      const data = cloudsData[i];
      // Slow drift
      cloud.position.x = data.x + Math.sin(time * data.speed) * 2;
    });
  });
  
  return (
    <group ref={groupRef}>
      {cloudsData.map((cloud, i) => (
        <mesh
          key={i}
          position={[cloud.x, cloud.y, cloud.z]}
          scale={[cloud.scale, cloud.scale * 0.4, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={cloud.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Main atmosphere component
export const Atmosphere: React.FC = () => {
  return (
    <group>
      <SkyGradient />
      <Particles count={40} />
      <Clouds count={6} />
      <GroundFog />
    </group>
  );
};

export default Atmosphere;
