import { useThree } from '@react-three/fiber';
import React, { useMemo } from 'react';
import { AdditiveBlending, Color, NormalBlending, ShaderMaterial } from 'three';

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
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(color) },
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
      blending: NormalBlending,
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
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(color) },
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
      blending: AdditiveBlending,
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
/**
 * Warm edge tint — adds golden warmth at screen edges (complementary to vignette).
 */
export const WarmEdgeTint: React.FC<{
  intensity?: number;
}> = ({ intensity = 0.06 }) => {
  const { viewport } = useThree();

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color('#FFDEB8') },
        uIntensity: { value: intensity },
        uAspect: { value: viewport.width / viewport.height },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.997, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uAspect;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          center.x *= uAspect;
          float dist = length(center);

          // Warm glow at edges (opposite of ambient glow)
          float edge = smoothstep(0.25, 0.9, dist);
          edge *= edge;

          gl_FragColor = vec4(uColor, edge * uIntensity);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }, [intensity, viewport.width, viewport.height]);

  return (
    <mesh renderOrder={997}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

/**
 * Combined screen effects component.
 * Cinematic layering: warm glow (center) + warm edge tint + dark vignette (edges).
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
      {enableGlow && <AmbientGlow intensity={glowIntensity * 1.3} color="#FFE4C8" />}
      {enableGlow && <WarmEdgeTint intensity={glowIntensity * 0.8} />}
      {enableVignette && <Vignette intensity={vignetteIntensity} color="#18082a" softness={0.32} />}
    </group>
  );
};

export default ScreenEffects;
