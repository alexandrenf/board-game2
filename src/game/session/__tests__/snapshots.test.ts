import { buildMultiplayerSessionSnapshot, buildSoloSessionSnapshot } from '@/src/game/session/snapshots';
import { getInitialEventsCursor, shouldCancelPendingTurnOnLeave } from '@/src/game/session/multiplayerUtils';
import { SessionParticipant } from '@/src/game/session/types';

const baseActor: SessionParticipant = {
  id: 'solo-player',
  name: 'Voce',
  position: 3,
  targetIndex: 3,
  isMoving: false,
  isCurrentTurn: true,
  isHost: true,
  isMe: true,
  shirtColor: '#ff5555',
  hairColor: '#4a3b2a',
  skinColor: '#FFD5B8',
  queue: [],
};

describe('session snapshots', () => {
  it('normalizes equivalent solo and multiplayer match state into the same actor/turn shape', () => {
    const solo = buildSoloSessionSnapshot({
      playerName: 'Voce',
      playerIndex: 3,
      targetIndex: 3,
      isMoving: false,
      isRolling: false,
      showTileModal: false,
      lastMessage: 'Sua vez.',
      shirtColor: '#ff5555',
      hairColor: '#4a3b2a',
      skinColor: '#FFD5B8',
      hasFinished: false,
    });

    const multiplayer = buildMultiplayerSessionSnapshot({
      status: 'playing',
      phase: 'awaiting_roll',
      actors: [baseActor],
      currentTurnPlayerId: baseActor.id,
      currentTurnId: undefined,
      selectedActorId: baseActor.id,
      canRoll: true,
      isRolling: false,
      showTileModal: false,
      message: 'Sua vez.',
      history: [],
    });

    expect(multiplayer.phase).toBe(solo.phase);
    expect(multiplayer.canRoll).toBe(solo.canRoll);
    expect(multiplayer.actors[0]).toMatchObject({
      position: solo.actors[0]?.position,
      targetIndex: solo.actors[0]?.targetIndex,
      isCurrentTurn: solo.actors[0]?.isCurrentTurn,
    });
  });

  it('keeps solo sessions in awaiting_ack while the tile modal is open', () => {
    const snapshot = buildSoloSessionSnapshot({
      playerName: 'Voce',
      playerIndex: 4,
      targetIndex: 4,
      isMoving: false,
      isRolling: false,
      showTileModal: true,
      lastMessage: 'Casa educativa.',
      shirtColor: '#ff5555',
      hairColor: '#4a3b2a',
      skinColor: '#FFD5B8',
      hasFinished: false,
    });

    expect(snapshot.phase).toBe('awaiting_ack');
    expect(snapshot.canRoll).toBe(false);
  });

  it('preserves pending-turn replay and leave-room safety decisions', () => {
    expect(getInitialEventsCursor(12)).toBe(12);
    expect(
      shouldCancelPendingTurnOnLeave({
        leavingPlayerId: 'player-2',
        pendingActorPlayerId: 'player-1',
        currentTurnPlayerId: 'player-1',
        remainingActivePlayerIds: ['player-1', 'player-3'],
      })
    ).toBe(false);
    expect(
      shouldCancelPendingTurnOnLeave({
        leavingPlayerId: 'player-1',
        pendingActorPlayerId: 'player-1',
        currentTurnPlayerId: 'player-1',
        remainingActivePlayerIds: ['player-2', 'player-3'],
      })
    ).toBe(true);
    expect(
      shouldCancelPendingTurnOnLeave({
        leavingPlayerId: 'player-2',
        pendingActorPlayerId: 'player-1',
        currentTurnPlayerId: 'player-1',
        remainingActivePlayerIds: ['player-1'],
      })
    ).toBe(true);
  });
});
