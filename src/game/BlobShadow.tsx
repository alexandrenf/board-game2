import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import { Color, Mesh, MultiplyBlending, Object3D, ShaderMaterial } from 'three';

interface BlobShadowProps {
  // Position of the object casting the shadow
  position?: [number, number, number];
  // Scale of the shadow (width, depth)
  scale?: [number, number];
  // Opacity of the shadow
  opacity?: number;
  // Color of the shadow
  color?: string;
  // Height offset from ground
  groundOffset?: number;
  // Dynamic - if true, follows target position
  target?: React.RefObject<Object3D | null>;
}

/**
 * A shader-based blob shadow with animated soft edges.
 * Works perfectly with React Native/expo-gl as it doesn't use render targets.
 */
export const ShaderBlobShadow: React.FC<BlobShadowProps & { 
  softness?: number;
  animated?: boolean;
}> = ({
  position = [0, 0, 0],
  scale = [1, 1],
  opacity = 0.4,
  color = '#2d1b4e',
  groundOffset = 0.01,
  target,
  softness = 0.5,
  animated = false,
}) => {
  const meshRef = useRef<Mesh>(null);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(color) },
        uOpacity: { value: opacity },
        uSoftness: { value: softness },
        uTime: { value: 0 },
        uAnimated: { value: animated ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uSoftness;
        uniform float uTime;
        uniform float uAnimated;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          
          // Animated subtle pulse
          float pulse = 1.0 + uAnimated * sin(uTime * 2.0) * 0.05;
          
          // Hard edge shadow for Neobrutalism
          // varying slightly by softness but mostly hard
          float edge = 1.0 - step(0.95 * pulse, dist);
          
          // Optional: slight smoothing only if softness is high? 
          // But user wants Neobrutalism. Let's keep it sharp but maybe a tiny AA.
          float alpha = 1.0 - smoothstep(0.95 * pulse, 1.0 * pulse, dist);
          
          // Use step for super hard if softness < 0.5
          if (uSoftness < 0.5) {
             alpha = 1.0 - step(1.0 * pulse, dist);
          }
          
          gl_FragColor = vec4(uColor, alpha * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: MultiplyBlending,
    });
  }, [color, opacity, softness, animated]);
  
  // Update time and follow target
  useFrame((state) => {
    if (material.uniforms) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
    
    if (target?.current && meshRef.current) {
      const targetPos = target.current.position;
      meshRef.current.position.set(targetPos.x, groundOffset, targetPos.z);
    }
  });
  
  return (
    <mesh 
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[position[0], groundOffset, position[2]]}
      material={material}
    >
      <planeGeometry args={[scale[0], scale[1]]} />
    </mesh>
  );
};

/**
 * Multiple layered shadows for a more realistic look.
 * Creates a soft, stylized shadow effect.
 */
export const LayeredShadow: React.FC<{
  position?: [number, number, number];
  scale?: number;
  target?: React.RefObject<Object3D | null>;
}> = ({
  position = [0, 0, 0],
  scale = 1,
  target,
}) => {
  return (
    <group>
      {/* Single hard shadow block for Neobrutalism */}
      <ShaderBlobShadow
        position={position}
        scale={[scale * 1.2, scale * 1.2]}
        opacity={0.4}
        color="#000000"
        softness={0.1} // Hard edge
        target={target}
        groundOffset={0.01}
      />
    </group>
  );
};

/**
 * Simple single-layer blob shadow.
 * Good for static objects like tiles.
 */
export const BlobShadow: React.FC<BlobShadowProps> = (props) => {
  return <ShaderBlobShadow {...props} softness={0.6} />;
};

export default BlobShadow;
