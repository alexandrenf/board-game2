import { useThree } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Screen-space vignette effect.
 * Creates a subtle darkening at the edges of the screen
 * without using render targets (expo-gl compatible).
 */
export const Vignette: React.FC<{
  intensity?: number;
  color?: string;
  softness?: number;
}> = ({
  intensity = 0.4,
  color = '#1a0a2e',
  softness = 0.4,
}) => {
  const { viewport } = useThree();
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
        uSoftness: { value: softness },
        uAspect: { value: viewport.width / viewport.height },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uSoftness;
        uniform float uAspect;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - 0.5;
          center.x *= uAspect;
          
          float dist = length(center);
          
          // Soft vignette falloff
          float vignette = smoothstep(uSoftness, uSoftness + 0.5, dist);
          
          float alpha = vignette * uIntensity;
          
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [color, intensity, softness, viewport.width, viewport.height]);

  return (
    <mesh renderOrder={999}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

/**
 * Subtle ambient glow overlay.
 * Adds a warm glow effect to the scene.
 */
export const AmbientGlow: React.FC<{
  color?: string;
  intensity?: number;
}> = ({
  color = '#FFE4C4',
  intensity = 0.1,
}) => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.998, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;
        
        void main() {
          // Create a soft radial gradient from center
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          
          // Inverse vignette - bright in center
          float glow = 1.0 - smoothstep(0.0, 1.5, dist);
          glow *= glow; // Quadratic falloff
          
          gl_FragColor = vec4(uColor, glow * uIntensity);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color, intensity]);

  return (
    <mesh renderOrder={998}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

/**
 * Combined screen effects component.
 * Applies all screen-space effects in one component.
 */
export const ScreenEffects: React.FC<{
  enableVignette?: boolean;
  enableGlow?: boolean;
  vignetteIntensity?: number;
  glowIntensity?: number;
}> = ({
  enableVignette = true,
  enableGlow = true,
  vignetteIntensity = 0.35,
  glowIntensity = 0.08,
}) => {
  return (
    <group>
      {enableGlow && <AmbientGlow intensity={glowIntensity} color="#FFE8D6" />}
      {enableVignette && <Vignette intensity={vignetteIntensity} color="#1a0a2e" softness={0.35} />}
    </group>
  );
};

export default ScreenEffects;
