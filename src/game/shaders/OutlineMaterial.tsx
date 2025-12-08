import { shaderMaterial } from '@react-three/drei/native';
import { extend } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

// Inverted hull outline shader for cel-shading effect
const OutlineShaderMaterial = shaderMaterial(
  {
    uOutlineColor: new THREE.Color('#2a1f3d'),
    uOutlineThickness: 0.03,
  },
  // Vertex Shader - push vertices along normals
  `
    uniform float uOutlineThickness;
    
    void main() {
      vec3 pos = position + normal * uOutlineThickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader - solid color
  `
    uniform vec3 uOutlineColor;
    
    void main() {
      gl_FragColor = vec4(uOutlineColor, 1.0);
    }
  `
);

extend({ OutlineShaderMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    outlineShaderMaterial: any;
  }
}

interface OutlineMeshProps {
  children: React.ReactNode;
  outlineColor?: string;
  outlineThickness?: number;
  visible?: boolean;
}

/**
 * Wrapper that adds an outline effect to its mesh children
 * Uses the inverted hull technique - renders a slightly larger version behind
 */
export const OutlineMesh: React.FC<OutlineMeshProps> = ({
  children,
  outlineColor = '#2a1f3d',
  outlineThickness = 0.03,
  visible = true,
}) => {
  return (
    <group>
      {/* Outline pass - rendered first (behind) */}
      {visible && (
        <group>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return null;
            if (child.type !== 'mesh') return null;
            
            // Clone the mesh with outline material
            return React.cloneElement(child as React.ReactElement<any>, {
              renderOrder: -1,
              children: [
                // Find the geometry child
                ...React.Children.toArray((child as any).props.children).filter(
                  (c: any) => c.type?.name?.includes('Geometry') || 
                              c.type?.toString().includes('geometry')
                ),
                <outlineShaderMaterial
                  key="outline-mat"
                  uOutlineColor={new THREE.Color(outlineColor)}
                  uOutlineThickness={outlineThickness}
                  side={THREE.BackSide}
                />
              ]
            });
          })}
        </group>
      )}
      
      {/* Original mesh */}
      {children}
    </group>
  );
};

/**
 * Standalone outline mesh component - just the outline
 * Useful when you want more control over the rendering
 */
interface OutlineProps {
  geometry: THREE.BufferGeometry;
  color?: string;
  thickness?: number;
}

export const Outline: React.FC<OutlineProps> = ({
  geometry,
  color = '#2a1f3d',
  thickness = 0.03,
}) => {
  return (
    <mesh renderOrder={-1}>
      <primitive object={geometry} attach="geometry" />
      <outlineShaderMaterial
        uOutlineColor={new THREE.Color(color)}
        uOutlineThickness={thickness}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

export default OutlineMesh;
