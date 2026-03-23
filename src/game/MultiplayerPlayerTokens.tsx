import React, { useMemo } from 'react';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { useGameStore } from './state/gameState';
import { PlayerTokenActor } from './PlayerTokenActor';

const TILE_OFFSETS: { x: number; z: number }[] = [
  { x: 0, z: 0 },
  { x: 0.34, z: 0.04 },
  { x: -0.34, z: 0.04 },
  { x: 0.04, z: -0.34 },
];

export const MultiplayerPlayerTokens: React.FC = () => {
  const path = useGameStore((state) => state.path);
  const boardSize = useGameStore((state) => state.boardSize);
  const actors = useMultiplayerRuntimeStore((state) => state.actors);
  const markActorArrived = useMultiplayerRuntimeStore((state) => state.markActorArrived);

  const actorOffsets = useMemo(() => {
    const grouped = new Map<number, string[]>();

    for (const actor of actors) {
      const key = actor.position;
      const bucket = grouped.get(key) ?? [];
      bucket.push(actor.id);
      grouped.set(key, bucket);
    }

    const map = new Map<string, { x: number; z: number }>();
    grouped.forEach((ids) => {
      ids.forEach((id, index) => {
        map.set(id, TILE_OFFSETS[index] ?? TILE_OFFSETS[0]!);
      });
    });

    return map;
  }, [actors]);

  return (
    <>
      {actors.map((actor) => {
        const offset = actorOffsets.get(actor.id) ?? TILE_OFFSETS[0]!;

        return (
          <PlayerTokenActor
            key={actor.id}
            actorId={actor.id}
            path={path}
            boardSize={boardSize}
            playerIndex={actor.position}
            targetIndex={actor.targetIndex}
            isMoving={actor.isMoving}
            shirtColor={actor.shirtColor}
            hairColor={actor.hairColor}
            skinColor={actor.skinColor}
            offsetX={offset.x}
            offsetZ={offset.z}
            modelScale={0.46}
            onArrive={() => {
              markActorArrived(actor.id);
            }}
          />
        );
      })}
    </>
  );
};
