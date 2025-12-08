import { shaderMaterial } from '@react-three/drei/native';
import { extend, useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

// Toon shader with discrete shadow bands and rim lighting
const ToonShaderMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#ff8866'),
    uShadowColor: new THREE.Color('#553322'),
    uHighlightColor: new THREE.Color('#ffccaa'),
    uRimColor: new THREE.Color('#ffffff'),
    uRimPower: 2.0,
    uRimStrength: 0.4,
    uShadowThreshold: 0.3,
    uHighlightThreshold: 0.85,
    uTime: 0,
  },
  // Vertex Shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor;
    uniform vec3 uShadowColor;
    uniform vec3 uHighlightColor;
    uniform vec3 uRimColor;
    uniform float uRimPower;
    uniform float uRimStrength;
    uniform float uShadowThreshold;
    uniform float uHighlightThreshold;
    uniform float uTime;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
      // Simple directional light from above-right
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float NdotL = dot(vNormal, lightDir);
      
      // Softer toon shading with smoothstep
      // Base color
      vec3 color = uColor;
      
      // Shadow (smooth transition)
      float shadowFactor = smoothstep(uShadowThreshold - 0.05, uShadowThreshold + 0.05, NdotL);
      color = mix(uShadowColor, color, shadowFactor);
      
      // Highlight (smooth transition)
      float highlightFactor = smoothstep(uHighlightThreshold - 0.05, uHighlightThreshold + 0.05, NdotL);
      color = mix(color, uHighlightColor, highlightFactor);
      
      // Rim lighting - subtler and smoother
      vec3 viewDir = normalize(vViewPosition);
      float rimFactor = 1.0 - max(dot(viewDir, vNormal), 0.0);
      rimFactor = pow(rimFactor, uRimPower);
      // Clamp rim to avoid blowing out
      rimFactor = smoothstep(0.4, 0.6, rimFactor) * uRimStrength;
      
      color = mix(color, uRimColor, rimFactor);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ ToonShaderMaterial });

// Type declaration for JSX
declare module '@react-three/fiber' {
  interface ThreeElements {
    toonShaderMaterial: any;
  }
}

interface ToonMaterialProps {
  color?: string;
  shadowColor?: string;
  highlightColor?: string;
  rimColor?: string;
  rimPower?: number;
  rimStrength?: number;
  shadowThreshold?: number;
  highlightThreshold?: number;
  animated?: boolean;
}

export const ToonMaterial: React.FC<ToonMaterialProps> = ({
  color = '#ff8866',
  shadowColor,
  highlightColor,
  rimColor = '#ffffff',
  rimPower = 2.5,
  rimStrength = 0.2,
  shadowThreshold = 0.4,
  highlightThreshold = 0.9,
  animated = false,
}) => {
  const materialRef = useRef<any>(null);
  
  // Auto-generate shadow and highlight colors if not provided
  const baseColor = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);
  
  const defaultShadowColor = new THREE.Color().setHSL(
    hsl.h,
    hsl.s * 0.8,
    hsl.l * 0.5
  );
  const defaultHighlightColor = new THREE.Color().setHSL(
    hsl.h,
    hsl.s * 0.6,
    Math.min(hsl.l * 1.3, 0.95)
  );
  
  useFrame((state) => {
    if (materialRef.current && animated) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  
  return (
    <toonShaderMaterial
      ref={materialRef}
      uColor={new THREE.Color(color)}
      uShadowColor={shadowColor ? new THREE.Color(shadowColor) : defaultShadowColor}
      uHighlightColor={highlightColor ? new THREE.Color(highlightColor) : defaultHighlightColor}
      uRimColor={new THREE.Color(rimColor)}
      uRimPower={rimPower}
      uRimStrength={rimStrength}
      uShadowThreshold={shadowThreshold}
      uHighlightThreshold={highlightThreshold}
    />
  );
};

// Simpler fallback for compatibility - uses MeshToonMaterial from Three.js
export const SimpleToonMaterial: React.FC<{ color?: string }> = ({ color = '#ff8866' }) => {
  return (
    <meshToonMaterial 
      color={color}
      gradientMap={createGradientTexture()}
    />
  );
};

// Create gradient texture for MeshToonMaterial
function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  
  // 4-step gradient for toon shading
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#666666';
  ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#999999';
  ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, 0, 1, 1);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

export default ToonMaterial;
