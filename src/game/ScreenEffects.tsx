import { useThree } from '@react-three/fiber';
import React, { useMemo } from 'react';
import { AdditiveBlending, Color, NormalBlending, ShaderMaterial } from 'three';

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
  const { viewport } = useThree();

  const vignetteMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uVignetteColor: { value: new Color('#18082a') },
        uVignetteIntensity: { value: enableVignette ? vignetteIntensity : 0 },
        uVignetteSoftness: { value: 0.32 },
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
        uniform vec3 uVignetteColor;
        uniform float uVignetteIntensity;
        uniform float uVignetteSoftness;
        uniform float uAspect;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          vec2 aspectCenter = center;
          aspectCenter.x *= uAspect;
          float dist = length(aspectCenter);

          float vignette = smoothstep(uVignetteSoftness, uVignetteSoftness + 0.5, dist);
          float vigAlpha = vignette * uVignetteIntensity;

          gl_FragColor = vec4(uVignetteColor, vigAlpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: NormalBlending,
    });
  }, [enableVignette, vignetteIntensity, viewport.width, viewport.height]);

  const glowMaterial = useMemo(() => {
    if (!enableGlow) return null;
    return new ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new Color('#FFE4C8') },
        uGlowIntensity: { value: glowIntensity * 1.3 },
        uWarmEdgeColor: { value: new Color('#FFDEB8') },
        uWarmEdgeIntensity: { value: glowIntensity * 0.8 },
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
        uniform vec3 uGlowColor;
        uniform float uGlowIntensity;
        uniform vec3 uWarmEdgeColor;
        uniform float uWarmEdgeIntensity;
        uniform float uAspect;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          vec2 aspectCenter = center;
          aspectCenter.x *= uAspect;
          float dist = length(aspectCenter);

          float glowDist = length(center) * 2.0;
          float glow = 1.0 - smoothstep(0.0, 1.5, glowDist);
          glow *= glow;
          vec3 result = uGlowColor * glow * uGlowIntensity;

          float edge = smoothstep(0.25, 0.9, dist);
          edge *= edge;
          result += uWarmEdgeColor * edge * uWarmEdgeIntensity;

          float alpha = max(result.r, max(result.g, result.b));
          gl_FragColor = vec4(result, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }, [enableGlow, glowIntensity, viewport.width, viewport.height]);

  return (
    <>
      {enableVignette && (
        <mesh renderOrder={999}>
          <planeGeometry args={[2, 2]} />
          <primitive object={vignetteMaterial} attach="material" />
        </mesh>
      )}
      {glowMaterial && (
        <mesh renderOrder={998}>
          <planeGeometry args={[2, 2]} />
          <primitive object={glowMaterial} attach="material" />
        </mesh>
      )}
    </>
  );
};

export default ScreenEffects;