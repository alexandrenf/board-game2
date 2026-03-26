import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Small decorative pond with animated ripple shader.
 * Placed in the interior of the board path for environmental charm.
 */
export const WaterPond: React.FC<{
  position: [number, number, number];
  radius?: number;
}> = ({ position, radius = 2.2 }) => {
  const waterRef = useRef<THREE.Mesh>(null);

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#8EC8E8') },
        uDeepColor: { value: new THREE.Color('#5BA3C9') },
        uShimmerColor: { value: new THREE.Color('#FFFEF5') },
        uEdgeColor: { value: new THREE.Color('#6BB870') }, // grass-matching edge
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vRipple;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Concentric ripples from center
          float dist = length(uv - 0.5) * 2.0;
          float ripple1 = sin(dist * 12.0 - uTime * 2.0) * 0.015 * (1.0 - dist);
          float ripple2 = sin(dist * 8.0 - uTime * 1.3 + 1.5) * 0.01 * (1.0 - dist);
          pos.z += ripple1 + ripple2;
          vRipple = ripple1 + ripple2;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uDeepColor;
        uniform vec3 uShimmerColor;
        uniform vec3 uEdgeColor;
        varying vec2 vUv;
        varying float vRipple;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;

          // Circular clip with soft edge
          if (dist > 1.0) discard;

          // Depth gradient: deeper in center
          vec3 color = mix(uDeepColor, uBaseColor, smoothstep(0.0, 0.7, dist));

          // Grassy edge blend
          float edgeFade = smoothstep(0.75, 1.0, dist);
          color = mix(color, uEdgeColor, edgeFade * 0.6);

          // Moving shimmer highlights (fake caustics)
          float shimmer1 = sin(center.x * 15.0 + uTime * 1.2) * cos(center.y * 12.0 - uTime * 0.9);
          float shimmer2 = sin(center.x * 8.0 - uTime * 0.7 + 2.0) * cos(center.y * 10.0 + uTime * 1.1);
          float shimmer = (shimmer1 + shimmer2) * 0.5 + 0.5;
          shimmer = smoothstep(0.65, 0.85, shimmer) * (1.0 - dist * 0.8);
          color = mix(color, uShimmerColor, shimmer * 0.3);

          // Ripple brightness
          float rippleBright = smoothstep(0.005, 0.02, vRipple);
          color = mix(color, uShimmerColor, rippleBright * 0.15);

          // Soft alpha at edges
          float alpha = 1.0 - smoothstep(0.85, 1.0, dist);

          gl_FragColor = vec4(color, alpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    waterMaterial.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group position={position}>
      {/* Water surface */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        material={waterMaterial}
      >
        <circleGeometry args={[radius, 24]} />
      </mesh>

      {/* Lily pads */}
      <LilyPad offset={[0.5, 0.6]} radius={radius} />
      <LilyPad offset={[-0.7, -0.3]} radius={radius} />
      <LilyPad offset={[0.1, -0.8]} radius={radius} scale={0.7} />
    </group>
  );
};

// Small lily pad decoration floating on the pond
const LilyPad: React.FC<{
  offset: [number, number];
  radius: number;
  scale?: number;
}> = ({ offset, radius, scale = 1 }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Gentle bob
    ref.current.position.y = -0.16 + Math.sin(t * 0.8 + offset[0] * 3) * 0.008;
    ref.current.rotation.z = Math.sin(t * 0.5 + offset[1] * 5) * 0.03;
  });

  const x = offset[0] * radius * 0.55;
  const z = offset[1] * radius * 0.55;

  return (
    <group ref={ref} position={[x, -0.16, z]}>
      {/* Pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[0.28 * scale, 0.28 * scale, 1]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial color="#5DBE6E" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Small flower on some pads */}
      {scale >= 1 && (
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial color="#FFB3BA" />
        </mesh>
      )}
    </group>
  );
};
