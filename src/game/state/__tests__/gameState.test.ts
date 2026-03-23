/* global describe, it, expect, beforeEach, jest */
import { defaultSyncAdapters } from '@/src/services/sync/adapters';
import { persistenceRepositories } from '@/src/services/persistence/kvRepositories';
import { triggerHaptic } from '@/src/utils/haptics';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../gameState';

jest.useFakeTimers();

describe('game state store', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

  it('hydrates playerName from persisted displayName', async () => {
    jest
      .spyOn(persistenceRepositories.settings, 'getSettings')
      .mockResolvedValue(null);
    jest
      .spyOn(persistenceRepositories.progress, 'getProgress')
      .mockResolvedValue(null);
    jest.spyOn(persistenceRepositories.profile, 'getProfile').mockResolvedValue({
      id: 'device-1',
      displayName: 'Alice',
      locale: 'pt-BR',
      avatar: {
        shirtColor: '#111111',
        hairColor: '#222222',
        skinColor: '#333333',
      },
    });

    await useGameStore.getState().hydrateFromPersistence();

    const next = useGameStore.getState();
    expect(next.playerName).toBe('Alice');
    expect(next.shirtColor).toBe('#111111');
    expect(next.hairColor).toBe('#222222');
    expect(next.skinColor).toBe('#333333');
  });

  it('persists playerName changes to the profile repository', async () => {
    const getDeviceIdentitySpy = jest
      .spyOn(defaultSyncAdapters.auth, 'getDeviceIdentity')
      .mockResolvedValue({ deviceId: 'device-42' });
    const saveProfileSpy = jest
      .spyOn(persistenceRepositories.profile, 'saveProfile')
      .mockResolvedValue();

    useGameStore.getState().setPlayerName('  Alice  ');
    await Promise.resolve();
    await Promise.resolve();

    expect(useGameStore.getState().playerName).toBe('  Alice  ');
    expect(getDeviceIdentitySpy).toHaveBeenCalledTimes(1);
    expect(saveProfileSpy).toHaveBeenCalledWith({
      id: 'device-42',
      displayName: 'Alice',
      locale: 'pt-BR',
      avatar: {
        shirtColor: useGameStore.getState().shirtColor,
        hairColor: useGameStore.getState().hairColor,
        skinColor: useGameStore.getState().skinColor,
      },
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
