import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS, GAP, getTileVisual, TILE_SIZE } from './constants';
import { DecorationInstances } from './DecorationInstances';
import { RenderQuality, Tile, useGameStore } from './state/gameState';
import { getAnimatedTileCenterY, getTileWaveIntensity } from './tileMotion';

// Wavy grass plane with shader
const GrassPlane: React.FC<{
  width: number;
  height: number;
  quality: RenderQuality;
}> = ({ width, height, quality }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(COLORS.grass) },
        uColor2: { value: new THREE.Color(COLORS.grassDark) },
        uColor3: { value: new THREE.Color(COLORS.grassHighlight || '#A8E6CF') },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec3 pos = position;
          // Gentle multi-frequency wave motion
          float wave1 = sin(pos.x * 2.5 + uTime * 0.8) * cos(pos.y * 2.0 + uTime * 0.6) * 0.08;
          float wave2 = sin(pos.x * 1.2 - uTime * 0.5) * cos(pos.y * 1.5 + uTime * 0.4) * 0.05;
          pos.z += wave1 + wave2;
          vWave = wave1 + wave2;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPosition;
        
        // Simple noise function
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          // Multi-scale grass pattern
          float pattern1 = sin(vUv.x * 40.0) * sin(vUv.y * 40.0);
          float pattern2 = sin(vUv.x * 20.0 + 0.5) * sin(vUv.y * 25.0 + 0.5);
          float pattern = (pattern1 + pattern2 * 0.5) * 0.5 + 0.5;
          pattern = smoothstep(0.25, 0.75, pattern);
          
          // Add some noise variation
          float noise = hash(floor(vUv * 50.0)) * 0.15;
          
          // Base color mix
          vec3 color = mix(uColor2, uColor1, pattern * 0.4 + 0.6 + noise);
          
          // Add highlights on wave peaks
          float highlight = smoothstep(0.05, 0.12, vWave);
          color = mix(color, uColor3, highlight * 0.3);
          
          // Subtle distance-based darkening for depth
          float dist = length(vPosition.xy) * 0.02;
          color *= 1.0 - dist * 0.15;
          
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
      material={material}
    >
      <planeGeometry
        args={[
          width * 3,
          height * 3,
          quality === 'high' ? 32 : quality === 'medium' ? 20 : 8,
          quality === 'high' ? 32 : quality === 'medium' ? 20 : 8,
        ]}
      />
    </mesh>
  );
};

// Instanced shadows for path tiles
const TileShadows: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
}> = React.memo(({ path, offsetX, offsetZ }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Create shadow material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#1a0a2e') },
        uOpacity: { value: 0.25 },
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
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          
          // Hard square shadow (Neobrutalism)
          float alpha = 1.0 - step(1.0, max(abs(center.x), abs(center.y)) * 2.4);
          
          gl_FragColor = vec4(uColor, alpha * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    });
  }, []);

  // Initialize instances
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;

    path.forEach((tile, i) => {
      const x = tile.col * (TILE_SIZE + GAP) - offsetX;
      const z = tile.row * (TILE_SIZE + GAP) - offsetZ;
      dummy.position.set(x, -0.24, z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [path, offsetX, offsetZ, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, path.length]} material={material}>
      <planeGeometry args={[TILE_SIZE * 1.3, TILE_SIZE * 1.3]} />
    </instancedMesh>
  );
});
TileShadows.displayName = 'TileShadows';


// Instanced Path Tiles
const PathTiles: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
  quality: RenderQuality;
}> = React.memo(({ path, offsetX, offsetZ, quality }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const roamMode = useGameStore(state => state.roamMode);
  const isMoving = useGameStore(state => state.isMoving);
  const isRolling = useGameStore(state => state.isRolling);
  const playerIndex = useGameStore(state => state.playerIndex);
  const openTilePreview = useGameStore(state => state.openTilePreview);
  const handlePreviewSelect = (instanceId?: number | null) => {
    if (!roamMode || isMoving || isRolling) return;
    if (instanceId == null) return;
    openTilePreview(instanceId);
  };

  // Initialize instances with tile-specific colors
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;

    path.forEach((tile, i) => {
      // Position
      const x = tile.col * (TILE_SIZE + GAP) - offsetX;
      const z = tile.row * (TILE_SIZE + GAP) - offsetZ;
      
      const tileVisual = getTileVisual(tile.color);
      const heightOffset = getAnimatedTileCenterY({
        tileIndex: i,
        totalTiles: path.length,
        elapsedTime: 0,
        tileColor: tile.color,
      });
      
      dummy.position.set(x, heightOffset, z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color based on tile type from board.json
      let color: string;
      if (i === 0) {
        // Start tile - bright green
        color = '#4ADE80';
      } else if (i === path.length - 1) {
        // End tile - golden
        color = '#FFD700';
      } else {
        // Use tile color from data
        color = tileVisual.base;
      }
      
      meshRef.current!.setColorAt(i, new THREE.Color(color));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [path, offsetX, offsetZ, dummy]);

  // Animation loop - sequential wave from start to finish (shows path direction)
  useFrame((state) => {
    if (!meshRef.current) return;
    if (quality === 'low') return;

    const shouldAnimateColors = quality === 'high';
    const time = state.clock.elapsedTime;

    path.forEach((tile, i) => {
      const x = tile.col * (TILE_SIZE + GAP) - offsetX;
      const z = tile.row * (TILE_SIZE + GAP) - offsetZ;
      
      const tileVisual = getTileVisual(tile.color);
      const waveIntensity = getTileWaveIntensity(i, path.length, time);
      const y = getAnimatedTileCenterY({
        tileIndex: i,
        totalTiles: path.length,
        elapsedTime: time,
        tileColor: tile.color,
      });
      
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Color brightness follows the wave + player tile highlight
      if (meshRef.current!.instanceColor && (shouldAnimateColors || i === playerIndex)) {
        let baseColor: string;
        if (i === 0) {
          baseColor = '#4ADE80';
        } else if (i === path.length - 1) {
          baseColor = '#FFD700';
        } else {
          baseColor = tileVisual.base;
        }

        tempColor.set(baseColor);

        // Brighten tiles in the wave
        const waveBrightness = shouldAnimateColors ? waveIntensity * 0.9 : 0;
        // Pulsing highlight on player's current tile
        const playerPulse = i === playerIndex ? 0.35 + Math.sin(time * 3.5) * 0.18 : 0;
        const brightnessFactor = 1 + waveBrightness + playerPulse;
        tempColor.multiplyScalar(brightnessFactor);

        meshRef.current!.setColorAt(i, tempColor);
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  // Use standard BoxGeometry for strict Neobrutalism (Hard edges) & stability
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, path.length]}
      onPointerUp={(event) => {
        if (event.delta > 4) return;
        handlePreviewSelect(event.instanceId);
        event.stopPropagation();
      }}
    >
      <boxGeometry args={[TILE_SIZE, 0.25, TILE_SIZE]} />
      <meshStandardMaterial 
        roughness={0.3} 
        metalness={0.1}
        flatShading={false}
      />
    </instancedMesh>
  );
});
PathTiles.displayName = 'PathTiles';

// Group for Start/End Decorations (Caps)
const PathCaps: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
  quality: RenderQuality;
}> = React.memo(({ path, offsetX, offsetZ, quality }) => {
   // Only render for start and end
   const caps = [];
   if (path.length > 0) {
      caps.push({ tile: path[0], isStart: true });
      if (path.length > 1) {
        caps.push({ tile: path[path.length - 1], isStart: false });
      }
   }

   // Animated caps to sync with tiles
   const groupRef = useRef<THREE.Group>(null);
   useFrame((state) => {
      if(!groupRef.current) return;
      if (quality === 'low') return;
      const time = state.clock.elapsedTime;
      groupRef.current.children.forEach((child, idx) => {
         // Identify which tile this child corresponds to?
         // We can assume order: Start (index 0), End (index path.length-1)
         const tileIndex = idx === 0 ? 0 : path.length - 1;
         const y = Math.sin(time * 1.5 + tileIndex * 0.3) * 0.02;
         child.position.y = 0.11 + y; 
      });
   });

   return (
    <group ref={groupRef}>
      {caps.map((cap, i) => {
         const x = cap.tile.col * (TILE_SIZE + GAP) - offsetX;
         const z = cap.tile.row * (TILE_SIZE + GAP) - offsetZ;
         return (
             <mesh key={`cap-${i}`} position={[x, 0.11, z]}>
                <cylinderGeometry args={[0.25, 0.25, 0.02, 16]} />
                <meshBasicMaterial color={'#ffffff'} />
             </mesh>
         )
      })}
    </group>
   )
});
PathCaps.displayName = 'PathCaps';

export const Board: React.FC = () => {
  const boardSize = useGameStore(state => state.boardSize);
  const path = useGameStore(state => state.path);
  const renderQuality = useGameStore(state => state.renderQuality);
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
    const items: {
      row: number;
      col: number;
      type: 'tree' | 'rock' | 'flower';
      scale: number;
      hasEyes?: boolean;
    }[] = [];
    
    // Use seeded random for consistent decorations
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    
    const densityThreshold = renderQuality === 'high' ? 0.75 : renderQuality === 'medium' ? 0.82 : 0.9;

    for (let r = -2; r <= rows + 1; r++) {
      for (let c = -3; c <= cols + 2; c++) {
        const seed = r * 1000 + c;
        if (!pathMap.has(`${r},${c}`) && seededRandom(seed) > densityThreshold) {
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
  }, [cols, pathMap, renderQuality, rows]);

  return (
    <group>
      {/* Wavy grass base */}
      <GrassPlane width={cols} height={rows} quality={renderQuality} />

      {/* Tile shadows (rendered first, behind tiles) */}
      <TileShadows path={path} offsetX={offsetX} offsetZ={offsetZ} />
      
      {/* Path Tiles Instanced */}
      <PathTiles path={path} offsetX={offsetX} offsetZ={offsetZ} quality={renderQuality} />
      <PathCaps path={path} offsetX={offsetX} offsetZ={offsetZ} quality={renderQuality} />
      
      {/* Decorations Instanced */}
      <DecorationInstances 
        data={decorations} 
        offsetX={offsetX} 
        offsetZ={offsetZ} 
        tileSize={TILE_SIZE} 
        gap={GAP} 
      />
    </group>
  );
};
