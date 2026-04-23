import React from 'react';
import { PlayerTokenActor } from './PlayerTokenActor';
import { useGameStore } from './state/gameState';

export const PlayerToken: React.FC = () => {
  const path = useGameStore((s) => s.path);
  const boardSize = useGameStore((s) => s.boardSize);
  const playerIndex = useGameStore((s) => s.playerIndex);
  const targetIndex = useGameStore((s) => s.targetIndex);
  const isMoving = useGameStore((s) => s.isMoving);
  const finishMovement = useGameStore((s) => s.finishMovement);
  const setFocusTileIndex = useGameStore((s) => s.setFocusTileIndex);
  const shirtColor = useGameStore((s) => s.shirtColor);
  const hairColor = useGameStore((s) => s.hairColor);
  const skinColor = useGameStore((s) => s.skinColor);

  return (
    <PlayerTokenActor
      actorId="solo-player"
      path={path}
      boardSize={boardSize}
      playerIndex={playerIndex}
      targetIndex={targetIndex}
      isMoving={isMoving}
      shirtColor={shirtColor}
      hairColor={hairColor}
      skinColor={skinColor}
      onArrive={() => {
        finishMovement();
      }}
      onFocusTileIndex={(_, tileIndex) => {
        setFocusTileIndex(tileIndex);
      }}
    />
  );
};
