import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './state/gameState';

const TILE_SIZE = 1;
const GAP = 0.1;

// Color palette for the indie look
const COLORS = {
  pathPrimary: '#D4A574',    // Terracotta
  pathSecondary: '#F5E6D3',  // Warm cream
  pathStart: '#7EC87E',      // Soft green
  pathEnd: '#FFB347',        // Orange sunset
  grass: '#7EC87E',          // Soft green
  grassDark: '#5EA55E',      // Darker grass
  treeTrunk: '#8B6B4A',      // Warm brown
  treeLeaves: '#6BBF6B',     // Bright green
  treeLeavesAlt: '#98D898',  // Light green
  rock: '#9E9E9E',           // Neutral gray
  rockDark: '#757575',       // Dark gray
  outline: '#4A3B5C',        // Deep purple for outlines
};

// Wavy grass plane with shader
const GrassPlane: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(COLORS.grass) },
        uColor2: { value: new THREE.Color(COLORS.grassDark) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          // Gentle wave motion
          float wave = sin(pos.x * 2.0 + uTime) * cos(pos.y * 2.0 + uTime * 0.8) * 0.1;
          pos.z += wave;
          vWave = wave;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        
        void main() {
          // Subtle pattern
          float pattern = sin(vUv.x * 30.0) * sin(vUv.y * 30.0) * 0.5 + 0.5;
          pattern = smoothstep(0.3, 0.7, pattern);
          
          // Mix colors based on pattern and wave
          vec3 color = mix(uColor2, uColor1, pattern * 0.3 + 0.7);
          color = mix(color, uColor1 * 1.1, vWave * 2.0 + 0.5);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, []);
  
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime * 0.5;
  });
  
  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.25, 0]} 
      receiveShadow
      material={material}
    >
      <planeGeometry args={[width * 2, height * 2, 32, 32]} />
    </mesh>
  );
};

// Stylized path tile with rounded appearance
const PathTile: React.FC<{
  position: [number, number, number];
  color: string;
  index: number;
  isStart?: boolean;
  isEnd?: boolean;
}> = ({ position, color, index, isStart, isEnd }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  
  // Subtle floating animation
  useFrame((state) => {
    if (!meshRef.current) return;
    const y = Math.sin(state.clock.elapsedTime * 1.5 + index * 0.3) * 0.02;
    meshRef.current.position.y = position[1] + y;
    if (outlineRef.current) {
      outlineRef.current.position.y = position[1] + y;
    }
  });
  
  // Determine tile color
  let tileColor = color;
  if (isStart) tileColor = COLORS.pathStart;
  if (isEnd) tileColor = COLORS.pathEnd;
  
  return (
    <group>
      {/* Main tile */}
      <mesh
        ref={meshRef}
        position={position}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[TILE_SIZE, 0.2, TILE_SIZE]} />
        <meshToonMaterial color={tileColor} />
      </mesh>
      
      {/* Decorative top pattern for special tiles */}
      {(isStart || isEnd) && (
        <mesh position={[position[0], position[1] + 0.11, position[2]]}>
          <cylinderGeometry args={[0.25, 0.25, 0.02, 16]} />
          <meshBasicMaterial color={isStart ? '#ffffff' : '#ffffff'} />
        </mesh>
      )}
    </group>
  );
};

// Whimsical puffy tree
const WhimsicalTree: React.FC<{
  position: [number, number, number];
  scale: number;
}> = ({ position, scale }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Gentle swaying animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const sway = Math.sin(state.clock.elapsedTime * 1.2 + position[0]) * 0.05;
    groupRef.current.rotation.z = sway;
  });
  
  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.8, 8]} />
        <meshToonMaterial color={COLORS.treeTrunk} />
      </mesh>
      
      {/* Puffy layered leaves */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshToonMaterial color={COLORS.treeLeaves} />
      </mesh>
      <mesh position={[0.2, 1.1, 0.15]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshToonMaterial color={COLORS.treeLeavesAlt} />
      </mesh>
      <mesh position={[-0.15, 1.0, -0.1]} castShadow>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshToonMaterial color={COLORS.treeLeaves} />
      </mesh>
    </group>
  );
};

// Cute rock with optional googly eyes
const CuteRock: React.FC<{
  position: [number, number, number];
  scale: number;
  hasEyes?: boolean;
}> = ({ position, scale, hasEyes = false }) => {
  return (
    <group position={position} scale={[scale, scale * 0.6, scale]}>
      {/* Main rock body */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshToonMaterial color={COLORS.rock} />
      </mesh>
      
      {/* Googly eyes! */}
      {hasEyes && (
        <>
          {/* Left eye white */}
          <mesh position={[-0.12, 0.35, 0.32]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Left pupil */}
          <mesh position={[-0.12, 0.35, 0.39]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          {/* Right eye white */}
          <mesh position={[0.12, 0.35, 0.32]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Right pupil */}
          <mesh position={[0.12, 0.33, 0.39]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
        </>
      )}
    </group>
  );
};

// Small flower decoration
const Flower: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const colors = ['#FFB6C1', '#FFD700', '#87CEEB', '#DDA0DD'];
  const petalColor = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <group position={position} scale={[0.3, 0.3, 0.3]}>
      {/* Stem */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshBasicMaterial color="#228B22" />
      </mesh>
      {/* Petals */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI * 2) / 5) * 0.1,
            0.35,
            Math.sin((i * Math.PI * 2) / 5) * 0.1,
          ]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={petalColor} />
        </mesh>
      ))}
      {/* Center */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  );
};

export const Board: React.FC = () => {
  const { boardSize, path } = useGameStore();
  const { rows, cols } = boardSize;

  // Center the board
  const offsetX = (cols * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
  const offsetZ = (rows * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;

  // Create a map of path tiles for easy lookup
  const pathMap = useMemo(() => {
    const map = new Map<string, number>();
    path.forEach((t) => map.set(`${t.row},${t.col}`, t.index));
    return map;
  }, [path]);

  // Decorations - Trees, Rocks, and Flowers
  const decorations = useMemo(() => {
    const items: Array<{
      row: number;
      col: number;
      type: 'tree' | 'rock' | 'flower';
      scale: number;
      hasEyes?: boolean;
    }> = [];
    
    // Use seeded random for consistent decorations
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    
    for (let r = -2; r <= rows + 1; r++) {
      for (let c = -3; c <= cols + 2; c++) {
        const seed = r * 1000 + c;
        if (!pathMap.has(`${r},${c}`) && seededRandom(seed) > 0.75) {
          const typeRand = seededRandom(seed + 1);
          let type: 'tree' | 'rock' | 'flower';
          
          if (typeRand > 0.6) type = 'tree';
          else if (typeRand > 0.3) type = 'rock';
          else type = 'flower';
          
          items.push({
            row: r,
            col: c,
            type,
            scale: 0.6 + seededRandom(seed + 2) * 0.6,
            hasEyes: seededRandom(seed + 3) > 0.7, // Some rocks have eyes!
          });
        }
      }
    }
    return items;
  }, [rows, cols, pathMap]);

  return (
    <group>
      {/* Wavy grass base */}
      <GrassPlane width={cols} height={rows} />

      {/* Path Tiles */}
      {path.map((tile, i) => (
        <PathTile
          key={`path-${i}`}
          position={[
            tile.col * (TILE_SIZE + GAP) - offsetX,
            0,
            tile.row * (TILE_SIZE + GAP) - offsetZ,
          ]}
          color={i % 2 === 0 ? COLORS.pathPrimary : COLORS.pathSecondary}
          index={i}
          isStart={i === 0}
          isEnd={i === path.length - 1}
        />
      ))}
      
      {/* Decorations */}
      {decorations.map((d, i) => {
        const x = d.col * (TILE_SIZE + GAP) - offsetX;
        const z = d.row * (TILE_SIZE + GAP) - offsetZ;
        
        if (d.type === 'tree') {
          return (
            <WhimsicalTree
              key={`deco-${i}`}
              position={[x, 0, z]}
              scale={d.scale}
            />
          );
        } else if (d.type === 'rock') {
          return (
            <CuteRock
              key={`deco-${i}`}
              position={[x, 0, z]}
              scale={d.scale}
              hasEyes={d.hasEyes}
            />
          );
        } else {
          return (
            <Flower
              key={`deco-${i}`}
              position={[x, 0, z]}
            />
          );
        }
      })}
    </group>
  );
};
