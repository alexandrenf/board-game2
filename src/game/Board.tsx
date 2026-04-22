import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MultiplyBlending, Object3D, ShaderMaterial } from 'three';
import { CELL_SIZE, COLORS, GAP, getTileVisual, TILE_SIZE } from './constants';
import { DecorationInstances } from './DecorationInstances';
import { RenderQuality, Tile, useGameStore } from './state/gameState';
import { WaterPond } from './WaterPond';
import { getAnimatedTileCenterY, getTileLandingSquash, getTileWaveIntensity } from './tileMotion';

// Wavy grass plane with shader
const GrassPlane: React.FC<{
  width: number;
  height: number;
  quality: RenderQuality;
}> = ({ width, height, quality }) => {
  const meshRef = useRef<Mesh>(null);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new Color(COLORS.grass) },
        uColor2: { value: new Color(COLORS.grassDark) },
        uColor3: { value: new Color(COLORS.grassHighlight || '#A8E6CF') },
        uFlowerPink: { value: new Color('#FFB3BA') },
        uFlowerYellow: { value: new Color('#FFE066') },
        uFlowerLavender: { value: new Color('#D4A5FF') },
        uDarkGreen: { value: new Color('#4A9B5A') },
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
          // Multi-frequency wave motion with wind gusts
          float wave1 = sin(pos.x * 2.5 + uTime * 0.8) * cos(pos.y * 2.0 + uTime * 0.6) * 0.08;
          float wave2 = sin(pos.x * 1.2 - uTime * 0.5) * cos(pos.y * 1.5 + uTime * 0.4) * 0.05;
          float wave3 = sin(pos.x * 0.4 + uTime * 0.2) * 0.03; // slow rolling hills
          pos.z += wave1 + wave2 + wave3;
          vWave = wave1 + wave2;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uFlowerPink;
        uniform vec3 uFlowerYellow;
        uniform vec3 uFlowerLavender;
        uniform vec3 uDarkGreen;
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPosition;

        // Hash functions for noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float hash2(vec2 p) {
          return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453);
        }

        // Value noise for smooth organic patterns
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f); // smoothstep
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          // Large-scale terrain color bands (meadow patches)
          float terrain = vnoise(vUv * 8.0 + 0.5);
          float terrain2 = vnoise(vUv * 5.0 + vec2(3.7, 1.2));

          // Multi-scale grass pattern
          float pattern1 = sin(vUv.x * 40.0) * sin(vUv.y * 40.0);
          float pattern2 = sin(vUv.x * 20.0 + 0.5) * sin(vUv.y * 25.0 + 0.5);
          float pattern = (pattern1 + pattern2 * 0.5) * 0.5 + 0.5;
          pattern = smoothstep(0.25, 0.75, pattern);

          // Fine noise for natural variation
          float fineNoise = hash(floor(vUv * 80.0)) * 0.08;
          float medNoise = vnoise(vUv * 25.0) * 0.12;

          // Base color: blend between light, dark, and highlight greens
          vec3 color = mix(uColor2, uColor1, pattern * 0.4 + 0.6 + fineNoise);

          // Meadow patches: dark green bands for depth
          color = mix(color, uDarkGreen, smoothstep(0.35, 0.55, terrain) * 0.25);

          // Sun-kissed highlight patches
          float sunPatch = smoothstep(0.6, 0.8, terrain2);
          color = mix(color, uColor3, sunPatch * 0.35);

          // Wave-peak highlights
          float highlight = smoothstep(0.05, 0.12, vWave);
          color = mix(color, uColor3, highlight * 0.25);

          // Scattered wildflower dots (procedural)
          vec2 flowerCell = floor(vUv * 120.0);
          float flowerRand = hash(flowerCell);
          float flowerRand2 = hash2(flowerCell);
          if (flowerRand > 0.93) {
            vec2 flowerCenter = (flowerCell + 0.5) / 120.0;
            float flowerDist = length(vUv - flowerCenter) * 120.0;
            if (flowerDist < 0.35) {
              // Pick flower color based on second hash
              vec3 flowerColor = flowerRand2 < 0.33 ? uFlowerPink :
                                 flowerRand2 < 0.66 ? uFlowerYellow : uFlowerLavender;
              color = mix(color, flowerColor, smoothstep(0.35, 0.1, flowerDist) * 0.85);
            }
          }

          // Medium noise overlay for organic feel
          color *= 1.0 + medNoise - 0.06;

          // Distance-based atmospheric depth
          float dist = length(vPosition.xy) * 0.018;
          color = mix(color, vec3(0.65, 0.82, 0.68), dist * 0.2);

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
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  // Create shadow material
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color('#1a0a2e') },
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
      blending: MultiplyBlending,
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
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);
  const roamMode = useGameStore(state => state.roamMode);
  const isMoving = useGameStore(state => state.isMoving);
  const isRolling = useGameStore(state => state.isRolling);
  const playerIndex = useGameStore(state => state.playerIndex);
  const playerIndexRef = useRef(playerIndex);
  playerIndexRef.current = playerIndex;
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
      
      meshRef.current!.setColorAt(i, new Color(color));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [path, offsetX, offsetZ, dummy]);

  // Animation loop - sequential wave from start to finish (shows path direction)
  useFrame((state, delta) => {
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
      
      // Landing squash effect
      const squash = getTileLandingSquash(i, delta);
      if (squash > 0.001) {
        const scaleY = 1 - squash * 0.18;
        const scaleXZ = 1 + squash * 0.06;
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        dummy.position.set(x, y - squash * 0.02, z);
      } else {
        dummy.scale.set(1, 1, 1);
        dummy.position.set(x, y, z);
      }
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color brightness follows the wave + player tile highlight
      if (meshRef.current!.instanceColor && (shouldAnimateColors || i === playerIndexRef.current)) {
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
        const playerPulse = i === playerIndexRef.current ? 0.35 + Math.sin(time * 3.5) * 0.18 : 0;
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
        emissive="#ffffff"
        emissiveIntensity={0.08}
      />
    </instancedMesh>
  );
});
PathTiles.displayName = 'PathTiles';

// Inner face highlight — lighter inset plane on top of each tile for depth
const TileFaceHighlights: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
}> = React.memo(({ path, offsetX, offsetZ }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;

    path.forEach((tile, i) => {
      const x = tile.col * (TILE_SIZE + GAP) - offsetX;
      const z = tile.row * (TILE_SIZE + GAP) - offsetZ;
      const tileVisual = getTileVisual(tile.color);
      const baseY = tileVisual.height || 0;

      dummy.position.set(x, baseY + 0.126, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Lighter version of tile color
      let baseColor: string;
      if (i === 0) baseColor = '#6EF08E';
      else if (i === path.length - 1) baseColor = '#FFE44D';
      else baseColor = tileVisual.base;

      const color = new Color(baseColor).multiplyScalar(1.15);
      meshRef.current!.setColorAt(i, color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [path, offsetX, offsetZ, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, path.length]}>
      <planeGeometry args={[TILE_SIZE * 0.78, TILE_SIZE * 0.78]} />
      <meshStandardMaterial
        roughness={0.25}
        metalness={0.05}
      />
    </instancedMesh>
  );
});
TileFaceHighlights.displayName = 'TileFaceHighlights';

// Star shape geometry helper (flat 5-pointed star)
const createStarGeometry = (outerRadius: number, innerRadius: number): BufferGeometry => {
  const points = 5;
  const vertices: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  }
  // Build triangles from center
  const indices: number[] = [];
  const allVerts: number[] = [0, 0, 0]; // center vertex
  for (let i = 0; i < points * 2; i++) {
    allVerts.push(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]);
  }
  for (let i = 1; i <= points * 2; i++) {
    indices.push(0, i, i < points * 2 ? i + 1 : 1);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(allVerts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

// Flag triangle geometry helper
const createFlagGeometry = (width: number, height: number): BufferGeometry => {
  const geo = new BufferGeometry();
  const vertices = new Float32Array([
    0, 0, 0,
    width, height * 0.5, 0,
    0, height, 0,
  ]);
  geo.setAttribute('position', new BufferAttribute(vertices, 3));
  geo.setIndex([0, 1, 2]);
  geo.computeVertexNormals();
  return geo;
};

// Start marker: green flag on a pole
const StartFlag: React.FC<{ x: number; z: number }> = ({ x, z }) => {
  const flagRef = useRef<Mesh>(null);
  const flagGeo = useMemo(() => createFlagGeometry(0.35, 0.22), []);

  useFrame((state) => {
    if (!flagRef.current) return;
    // Gentle wave animation on the flag
    const wave = Math.sin(state.clock.elapsedTime * 2.5) * 0.08;
    flagRef.current.rotation.y = wave;
  });

  return (
    <group position={[x, 0.13, z]}>
      {/* Pole */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.55, 6]} />
        <meshStandardMaterial color={COLORS.treeTrunk} roughness={0.6} />
      </mesh>
      {/* Flag */}
      <mesh ref={flagRef} geometry={flagGeo} position={[0.02, 0.38, 0]} rotation={[0, 0, 0]}>
        <meshBasicMaterial color="#4ADE80" side={DoubleSide} />
      </mesh>
      {/* Base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.15, 12]} />
        <meshBasicMaterial color="#4ADE80" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// End marker: golden rotating star with glow
const EndStar: React.FC<{ x: number; z: number }> = ({ x, z }) => {
  const starRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const starGeo = useMemo(() => createStarGeometry(0.2, 0.09), []);

  useFrame((state) => {
    if (!starRef.current) return;
    const time = state.clock.elapsedTime;
    // Slow rotation
    starRef.current.rotation.y = time * 0.6;
    // Pulsing scale
    const pulse = 1 + Math.sin(time * 2.0) * 0.08;
    starRef.current.scale.setScalar(pulse);
    // Glow pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as MeshBasicMaterial;
      mat.opacity = 0.2 + Math.sin(time * 2.0) * 0.1;
    }
  });

  return (
    <group position={[x, 0.13, z]}>
      {/* Pedestal */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.1, 8]} />
        <meshStandardMaterial color="#FFB86C" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Star */}
      <group ref={starRef} position={[0, 0.32, 0]}>
        <mesh geometry={starGeo} rotation={[0, 0, 0]}>
          <meshBasicMaterial color="#FFD700" side={DoubleSide} />
        </mesh>
        {/* Back face for visibility from all angles */}
        <mesh geometry={starGeo} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial color="#FFD700" side={DoubleSide} />
        </mesh>
      </group>
      {/* Glow ring */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.15, 0.3, 16]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.25} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

// Group for Start/End Decorations (Caps)
const PathCaps: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
  quality: RenderQuality;
}> = React.memo(({ path, offsetX, offsetZ }) => {
  if (path.length === 0) return null;

  const startTile = path[0];
  const endTile = path[path.length - 1];
  const startX = startTile.col * (TILE_SIZE + GAP) - offsetX;
  const startZ = startTile.row * (TILE_SIZE + GAP) - offsetZ;
  const endX = endTile.col * (TILE_SIZE + GAP) - offsetX;
  const endZ = endTile.row * (TILE_SIZE + GAP) - offsetZ;

  return (
    <group>
      <StartFlag x={startX} z={startZ} />
      {path.length > 1 && <EndStar x={endX} z={endZ} />}
    </group>
  );
});
PathCaps.displayName = 'PathCaps';

// Small dots between consecutive tiles showing path direction
const PathConnectors: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
}> = React.memo(({ path, offsetX, offsetZ }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  // Compute connector positions (midpoints between consecutive tiles)
  const connectors = useMemo(() => {
    const result: { x: number; z: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const t1 = path[i];
      const t2 = path[i + 1];
      const x1 = t1.col * (TILE_SIZE + GAP) - offsetX;
      const z1 = t1.row * (TILE_SIZE + GAP) - offsetZ;
      const x2 = t2.col * (TILE_SIZE + GAP) - offsetX;
      const z2 = t2.row * (TILE_SIZE + GAP) - offsetZ;
      // Place dot at midpoint
      result.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2 });
    }
    return result;
  }, [path, offsetX, offsetZ]);

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    connectors.forEach((c, i) => {
      dummy.position.set(c.x, -0.1, c.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [connectors, dummy]);

  // Subtle wave sync
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    connectors.forEach((c, i) => {
      const y = -0.1 + Math.sin(time * 1.2 + i * 0.2) * 0.015;
      dummy.position.set(c.x, y, c.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (connectors.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, connectors.length]}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial color={COLORS.pathSecondary} />
    </instancedMesh>
  );
});
PathConnectors.displayName = 'PathConnectors';

// Pulsing ring around the player's current tile
const PlayerTileRing: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
}> = ({ path, offsetX, offsetZ }) => {
  const meshRef = useRef<Mesh>(null);
  const playerIndex = useGameStore(state => state.playerIndex);
  const playerIndexRef = useRef(playerIndex);
  playerIndexRef.current = playerIndex;

  useFrame((state) => {
    if (!meshRef.current || path.length === 0) return;
    const tile = path[Math.min(playerIndexRef.current, path.length - 1)];
    const x = tile.col * (TILE_SIZE + GAP) - offsetX;
    const z = tile.row * (TILE_SIZE + GAP) - offsetZ;
    const time = state.clock.elapsedTime;

    meshRef.current.position.set(x, 0.14, z);
    // Pulsing scale
    const pulse = 1.0 + Math.sin(time * 2.5) * 0.12;
    meshRef.current.scale.set(pulse, pulse, 1);
    // Pulsing opacity
    const mat = meshRef.current.material as MeshBasicMaterial;
    mat.opacity = 0.35 + Math.sin(time * 2.5) * 0.15;
  });

  const tileColor = path[Math.min(playerIndex, path.length - 1)]?.color;
  const visual = getTileVisual(tileColor);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
      <ringGeometry args={[TILE_SIZE * 0.55, TILE_SIZE * 0.7, 24]} />
      <meshBasicMaterial
        color={visual.glow}
        transparent
        opacity={0.4}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

// Simple geometric icon shapes on tile top faces per tile type
const createTriangleGeo = (size: number): BufferGeometry => {
  const h = size * 0.866;
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute([
    0, h * 0.6, 0,
    -size / 2, -h * 0.4, 0,
    size / 2, -h * 0.4, 0,
  ], 3));
  geo.setIndex([0, 1, 2]);
  geo.computeVertexNormals();
  return geo;
};

const createDiamondGeo = (size: number): BufferGeometry => {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute([
    0, size * 0.6, 0,
    -size * 0.4, 0, 0,
    0, -size * 0.6, 0,
    size * 0.4, 0, 0,
  ], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
};

// Icon colors — slightly darker than tile base for contrast
const ICON_COLORS = {
  red: '#D68A8A',
  green: '#7CC99A',
  blue: '#8AB5D6',
  yellow: '#D4C47A',
} as const;

const TileIcons: React.FC<{
  path: Tile[];
  offsetX: number;
  offsetZ: number;
}> = React.memo(({ path, offsetX, offsetZ }) => {
  // Group tiles by color type
  const groups = useMemo(() => {
    const redTiles: { x: number; z: number }[] = [];
    const greenTiles: { x: number; z: number }[] = [];
    const blueTiles: { x: number; z: number }[] = [];
    const yellowTiles: { x: number; z: number }[] = [];

    path.forEach((tile, i) => {
      if (i === 0 || i === path.length - 1) return; // Skip start/end
      const x = tile.col * (TILE_SIZE + GAP) - offsetX;
      const z = tile.row * (TILE_SIZE + GAP) - offsetZ;
      const color = (tile.color || 'blue').toLowerCase();
      if (color === 'red') redTiles.push({ x, z });
      else if (color === 'green') greenTiles.push({ x, z });
      else if (color === 'yellow') yellowTiles.push({ x, z });
      else blueTiles.push({ x, z });
    });

    return { redTiles, greenTiles, blueTiles, yellowTiles };
  }, [path, offsetX, offsetZ]);

  // Geometries
  const triangleGeo = useMemo(() => createTriangleGeo(0.22), []);
  const circleGeo = useMemo(() => new CircleGeometry(0.12, 10), []);
  const diamondGeo = useMemo(() => createDiamondGeo(0.22), []);
  const miniStarGeo = useMemo(() => createStarGeometry(0.14, 0.06), []);

  return (
    <group>
      {/* Red tiles: warning triangle */}
      <IconInstances tiles={groups.redTiles} geometry={triangleGeo} color={ICON_COLORS.red} />
      {/* Green tiles: circle (check) */}
      <IconInstances tiles={groups.greenTiles} geometry={circleGeo} color={ICON_COLORS.green} />
      {/* Blue tiles: diamond (info) */}
      <IconInstances tiles={groups.blueTiles} geometry={diamondGeo} color={ICON_COLORS.blue} />
      {/* Yellow tiles: star (special) */}
      <IconInstances tiles={groups.yellowTiles} geometry={miniStarGeo} color={ICON_COLORS.yellow} />
    </group>
  );
});
TileIcons.displayName = 'TileIcons';

const IconInstances: React.FC<{
  tiles: { x: number; z: number }[];
  geometry: BufferGeometry;
  color: string;
}> = React.memo(({ tiles, geometry, color }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  React.useLayoutEffect(() => {
    if (!meshRef.current || tiles.length === 0) return;
    tiles.forEach((t, i) => {
      dummy.position.set(t.x, 0.14, t.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [tiles, dummy]);

  if (tiles.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, tiles.length]}>
      <meshBasicMaterial color={color} side={DoubleSide} transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
  );
});
IconInstances.displayName = 'IconInstances';

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
      {renderQuality !== 'low' && <TileFaceHighlights path={path} offsetX={offsetX} offsetZ={offsetZ} />}
      {renderQuality !== 'low' && <PathConnectors path={path} offsetX={offsetX} offsetZ={offsetZ} />}
      <PathCaps path={path} offsetX={offsetX} offsetZ={offsetZ} quality={renderQuality} />
      {renderQuality !== 'low' && <TileIcons path={path} offsetX={offsetX} offsetZ={offsetZ} />}
      {renderQuality !== 'low' && <PlayerTileRing path={path} offsetX={offsetX} offsetZ={offsetZ} />}

      {/* Decorations Instanced */}
      <DecorationInstances
        data={decorations}
        offsetX={offsetX}
        offsetZ={offsetZ}
        tileSize={TILE_SIZE}
        gap={GAP}
      />

      {/* Water pond in board interior (between outer and inner path loops) */}
      {renderQuality !== 'low' && (
        <WaterPond
          position={[
            5 * CELL_SIZE - offsetX,
            0,
            1 * CELL_SIZE - offsetZ,
          ]}
          radius={1.6}
        />
      )}
    </group>
  );
};
