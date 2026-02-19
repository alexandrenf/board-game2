/* global describe, it, expect, beforeEach, jest */
import { triggerHaptic } from '@/src/utils/haptics';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../gameState';

jest.useFakeTimers();

describe('game state store', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      gameStatus: 'playing',
      path: [
        { id: 1, index: 0, row: 0, col: 0, color: 'blue', type: 'start', text: 'Início' },
        { id: 2, index: 1, row: 0, col: 1, color: 'green', text: 'Prevenção' },
        { id: 3, index: 2, row: 0, col: 2, color: 'blue', text: 'Seguro' },
        { id: 4, index: 3, row: 0, col: 3, color: 'yellow', type: 'end', text: 'Fim' },
      ],
      boardSize: { rows: 4, cols: 4 },
      playerIndex: 0,
      targetIndex: 0,
      focusTileIndex: 0,
      isMoving: false,
      isRolling: false,
      pendingEffect: null,
      isApplyingEffect: false,
      showEducationalModal: false,
      currentTileContent: null,
    });
  });

  it('updates target index after complete roll', () => {
    const store = useGameStore.getState();
    store.rollDice();
    store.completeRoll(2);

    const next = useGameStore.getState();
    expect(next.isRolling).toBe(false);
    expect(next.isMoving).toBe(true);
    expect(next.targetIndex).toBe(2);
  });

  it('applies landing effect only once for effect movement', () => {
    useGameStore.setState({ targetIndex: 1, isMoving: true });
    useGameStore.getState().finishMovement();

    let state = useGameStore.getState();
    expect(state.showEducationalModal).toBe(true);
    expect(state.pendingEffect).toEqual({ advance: 2 });

    state.dismissEducationalModal();
    jest.advanceTimersByTime(300);

    state = useGameStore.getState();
    expect(state.isApplyingEffect).toBe(true);
    expect(state.pendingEffect).toBeNull();
    expect(state.targetIndex).toBe(3);

    useGameStore.setState({ isMoving: true });
    state.finishMovement();

    state = useGameStore.getState();
    expect(state.isApplyingEffect).toBe(false);
    expect(state.showEducationalModal).toBe(false);
  });

  it('does not open tile preview while rolling or moving', () => {
    useGameStore.setState({ isRolling: true });
    useGameStore.getState().openTilePreview(1);
    expect(useGameStore.getState().showEducationalModal).toBe(false);

    useGameStore.setState({ isRolling: false, isMoving: true });
    useGameStore.getState().openTilePreview(1);
    expect(useGameStore.getState().showEducationalModal).toBe(false);
  });

  it('respects haptics toggle', () => {
    const impactSpy = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();

    useGameStore.getState().setHapticsEnabled(false);
    triggerHaptic('light');
    expect(impactSpy).not.toHaveBeenCalled();

    useGameStore.getState().setHapticsEnabled(true);
    triggerHaptic('light');
    expect(impactSpy).toHaveBeenCalledTimes(1);

    impactSpy.mockRestore();
  });
});
