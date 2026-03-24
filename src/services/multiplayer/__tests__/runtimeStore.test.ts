import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';

const pendingTurnScript = {
  turnId: 'turn_123',
  actorPlayerId: 'player_1',
  turnNumber: 4,
  roll: {
    value: 6,
    startedAt: 1000,
    durationMs: 1000,
  },
  movement: {
    fromIndex: 3,
    baseToIndex: 9,
    finalIndex: 11,
    segments: [
      {
        kind: 'dice' as const,
        fromIndex: 3,
        toIndex: 9,
        value: 6,
        durationMs: 900,
      },
      {
        kind: 'effect' as const,
        fromIndex: 9,
        toIndex: 11,
        value: 2,
        durationMs: 600,
        effectType: 'advance' as const,
      },
    ],
  },
  effect: {
    source: 'tile' as const,
    type: 'advance' as const,
    value: 2,
    fromIndex: 9,
    toIndex: 11,
  },
  result: {
    gameFinished: false,
  },
  deadlineAt: 5000,
};

describe('multiplayer runtime store', () => {
  beforeEach(() => {
    useMultiplayerRuntimeStore.getState().reset();
  });

  it('hydrates a pending turn animation from the snapshot before any event replay', () => {
    useMultiplayerRuntimeStore.getState().syncFromSnapshot({
      room: {
        id: 'room_1',
        status: 'playing',
        turnPhase: 'awaiting_ack',
        currentTurnPlayerId: 'player_1',
        currentTurnId: 'turn_123',
      },
      me: 'player_1',
      latestSequence: 9,
      pendingTurn: {
        turnId: 'turn_123',
        actorPlayerId: 'player_1',
        turnNumber: 4,
        script: pendingTurnScript,
        deadlineAt: 5000,
      },
      players: [
        {
          id: 'player_1',
          name: 'Alice',
          position: 11,
          isCurrentTurn: true,
          isHost: true,
          status: 'active',
          characterId: 'avatar_ff6b6b-4a3b2a-ffd5b8',
        },
      ],
    });

    const state = useMultiplayerRuntimeStore.getState();

    expect(state.latestResolvedTurn?.turnId).toBe('turn_123');
    expect(state.actors[0]).toMatchObject({
      id: 'player_1',
      position: 3,
      targetIndex: 9,
      isMoving: true,
      queue: [9, 11],
    });
  });
});
