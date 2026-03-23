import React from 'react';
import { PlayerTokenActor } from './PlayerTokenActor';
import { useGameStore } from './state/gameState';

export const PlayerToken: React.FC = () => {
  const {
    path,
    boardSize,
    playerIndex,
    targetIndex,
    isMoving,
    finishMovement,
    setFocusTileIndex,
    shirtColor,
    hairColor,
    skinColor,
  } = useGameStore();

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
