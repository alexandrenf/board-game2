import React from 'react';
import { useGameStore } from './state/gameState';

const TILE_SIZE = 1;
const TILE_HEIGHT = 0.2;
const GAP = 0.05;

export const Board: React.FC = () => {
  const { boardSize } = useGameStore();
  const { rows, cols } = boardSize;

  // Center the board
  const offsetX = (cols * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;
  const offsetZ = (rows * (TILE_SIZE + GAP)) / 2 - (TILE_SIZE + GAP) / 2;

  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isBlack = (r + c) % 2 === 1;
      tiles.push({
        row: r,
        col: c,
        color: isBlack ? '#444' : '#ccc',
        position: [
          c * (TILE_SIZE + GAP) - offsetX,
          0,
          r * (TILE_SIZE + GAP) - offsetZ
        ] as [number, number, number]
      });
    }
  }

  return (
    <group>
      {/* Base Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
        <planeGeometry args={[cols * 1.5, rows * 1.5]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Tiles */}
      {tiles.map((tile, i) => (
        <mesh
          key={i}
          position={tile.position}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
          <meshStandardMaterial color={tile.color} />
        </mesh>
      ))}
    </group>
  );
};
