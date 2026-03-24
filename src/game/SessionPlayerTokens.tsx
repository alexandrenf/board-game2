import React, { useMemo } from 'react';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { useGameStore } from './state/gameState';
import { PlayerTokenActor } from './PlayerTokenActor';
import { SessionParticipant } from './session/types';

const TILE_OFFSETS: { x: number; z: number }[] = [
  { x: 0, z: 0 },
  { x: 0.34, z: 0.04 },
  { x: -0.34, z: 0.04 },
  { x: 0.04, z: -0.34 },
];

export const SessionPlayerTokens: React.FC = () => {
  const gameStatus = useGameStore((state) => state.gameStatus);
  const path = useGameStore((state) => state.path);
  const boardSize = useGameStore((state) => state.boardSize);
  const finishMovement = useGameStore((state) => state.finishMovement);
  const setFocusTileIndex = useGameStore((state) => state.setFocusTileIndex);
  const playerIndex = useGameStore((state) => state.playerIndex);
  const targetIndex = useGameStore((state) => state.targetIndex);
  const isMoving = useGameStore((state) => state.isMoving);
  const playerName = useGameStore((state) => state.playerName);
  const shirtColor = useGameStore((state) => state.shirtColor);
  const hairColor = useGameStore((state) => state.hairColor);
  const skinColor = useGameStore((state) => state.skinColor);

  const multiplayerActors = useMultiplayerRuntimeStore((state) => state.actors);
  const multiplayerRoomStatus = useMultiplayerRuntimeStore((state) => state.roomStatus);
  const markActorArrived = useMultiplayerRuntimeStore((state) => state.markActorArrived);

  const soloParticipant = useMemo<SessionParticipant>(
    () => ({
      id: 'solo-player',
      name: playerName.trim() || 'Voce',
      position: playerIndex,
      targetIndex,
      isMoving,
      isCurrentTurn: true,
      isHost: true,
      isMe: true,
      shirtColor,
      hairColor,
      skinColor,
      queue: [],
    }),
    [hairColor, isMoving, playerIndex, playerName, shirtColor, skinColor, targetIndex]
  );

  const participants = useMemo(() => {
    if (gameStatus !== 'multiplayer') {
      return [soloParticipant];
    }

    if (multiplayerRoomStatus === 'playing' || multiplayerRoomStatus === 'finished') {
      return multiplayerActors;
    }

    return [] as SessionParticipant[];
  }, [gameStatus, multiplayerActors, multiplayerRoomStatus, soloParticipant]);

  const actorOffsets = useMemo(() => {
    const grouped = new Map<number, string[]>();

    for (const actor of participants) {
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
  }, [participants]);

  return (
    <>
      {participants.map((actor) => {
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
            modelScale={gameStatus === 'multiplayer' ? 0.46 : 0.5}
            onArrive={() => {
              if (gameStatus === 'multiplayer') {
                markActorArrived(actor.id);
                return;
              }

              finishMovement();
            }}
            onFocusTileIndex={
              gameStatus === 'multiplayer'
                ? undefined
                : (_, tileIndex) => {
                    setFocusTileIndex(tileIndex);
                  }
            }
          />
        );
      })}
    </>
  );
};
