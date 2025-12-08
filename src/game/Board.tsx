import React, { useMemo } from 'react';
import { useGameStore } from './state/gameState';

const TILE_SIZE = 1;
const GAP = 0.1;

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

  // Decoration (Trees/Rocks) - Randomly placed outside path
  const decorations = useMemo(() => {
    const items = [];
    for (let r = -1; r <= rows; r++) {
      for (let c = -1; c <= cols; c++) {
        if (!pathMap.has(`${r},${c}`) && Math.random() > 0.8) {
           items.push({
             row: r,
             col: c,
             type: Math.random() > 0.5 ? 'tree' : 'rock',
             scale: 0.5 + Math.random() * 0.5
           });
        }
      }
    }
    return items;
  }, [rows, cols, pathMap]);

  return (
    <group>
      {/* Grassy Base Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[cols * 2, rows * 2]} />
        <meshStandardMaterial color="#4caf50" roughness={0.8} />
      </mesh>

      {/* Path Tiles */}
      {path.map((tile, i) => (
        <mesh
          key={`path-${i}`}
          position={[
            tile.col * (TILE_SIZE + GAP) - offsetX,
            0,
            tile.row * (TILE_SIZE + GAP) - offsetZ
          ]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[TILE_SIZE, 0.2, TILE_SIZE]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#8d6e63' : '#a1887f'} /> {/* Dirt/Stone colors */}
        </mesh>
      ))}
      
      {/* Decorations */}
      {decorations.map((d, i) => {
        const x = d.col * (TILE_SIZE + GAP) - offsetX;
        const z = d.row * (TILE_SIZE + GAP) - offsetZ;
        
        if (d.type === 'tree') {
          return (
            <group key={`deco-${i}`} position={[x, 0, z]} scale={[d.scale, d.scale, d.scale]}>
              {/* Trunk */}
              <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
                <meshStandardMaterial color="#5d4037" />
              </mesh>
              {/* Leaves */}
              <mesh position={[0, 1.2, 0]} castShadow>
                <coneGeometry args={[0.6, 1.5, 8]} />
                <meshStandardMaterial color="#2e7d32" />
              </mesh>
            </group>
          );
        } else {
          return (
             <mesh key={`deco-${i}`} position={[x, 0.2, z]} scale={[d.scale, d.scale * 0.6, d.scale]} castShadow>
                <dodecahedronGeometry args={[0.4, 0]} />
                <meshStandardMaterial color="#757575" />
             </mesh>
          );
        }
      })}
    </group>
  );
};
