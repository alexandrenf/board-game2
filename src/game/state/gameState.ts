import { advanceWithEffect, resolveLandingEffect, resolveRoll } from '@/src/domain/game/engine';
import {
  BoardConfig,
  GameSnapshot,
  GameStatus,
  Tile as DomainTile,
  TileEffect,
} from '@/src/domain/game/types';
import { getValidatedBoardConfig } from '@/src/content/board.schema';
import { audioManager } from '@/src/services/audio/audioManager';
import { persistenceRepositories } from '@/src/services/persistence/kvRepositories';
import { defaultSyncAdapters } from '@/src/services/sync/adapters';
import { SyncQueueItem } from '@/src/services/sync/types';
import { create } from 'zustand';
import { createBoardLayout } from './boardLayout';
import { getTileName } from '../tileNaming';

export type Tile = DomainTile;

export type RenderQuality = 'low' | 'medium' | 'high';

export type TileContent = {
  name: string;
  step: number;
  text: string;
  color: string;
  imageKey?: string;
  type?: string;
  effect?: TileEffect | null;
  meta?: Record<string, unknown>;
};

export type GameState = {
  boardSize: { rows: number; cols: number };
  path: Tile[];

  gameStatus: GameStatus;

  playerIndex: number;
  targetIndex: number;
  focusTileIndex: number;
  isMoving: boolean;

  currentRoll: number | null;
  isRolling: boolean;

  lastMessage: string | null;

  showCustomization: boolean;
  showEducationalModal: boolean;
  currentTileContent: TileContent | null;
  pendingEffect: TileEffect | null;
  isApplyingEffect: boolean;
  showInfoPanel: boolean;

  roamMode: boolean;
  zoomLevel: number;
  hapticsEnabled: boolean;
  audioEnabled: boolean;
  renderQuality: RenderQuality;

  shirtColor: string;
  hairColor: string;
  skinColor: string;

  isHydrated: boolean;
  syncQueue: SyncQueueItem[];

  setShirtColor: (color: string) => void;
  setHairColor: (color: string) => void;
  setSkinColor: (color: string) => void;

  setShowCustomization: (show: boolean) => void;
  setRoamMode: (roam: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setRenderQuality: (quality: RenderQuality) => void;

  zoomIn: () => void;
  zoomOut: () => void;

  startGame: () => void;
  restartGame: () => void;
  setGameStatus: (status: GameStatus) => void;

  rollDice: () => void;
  completeRoll: (value: number) => void;
  finishMovement: () => void;

  setFocusTileIndex: (index: number) => void;
  openTilePreview: (index: number) => void;
  dismissEducationalModal: () => void;
  applyPendingEffect: () => void;
  setShowInfoPanel: (show: boolean) => void;

  resetGame: () => void;

  hydrateFromPersistence: () => Promise<void>;
  persistCurrentProgress: () => Promise<void>;
  flushSyncQueue: () => Promise<void>;
};

type StoreSet = (
  partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)
) => void;
type StoreGet = () => GameState;

const BOARD_DEFINITION: BoardConfig = getValidatedBoardConfig();
const INITIAL_BOARD = createBoardLayout(BOARD_DEFINITION);

let pendingEffectTimeout: ReturnType<typeof setTimeout> | null = null;

const clearPendingEffectTimeout = () => {
  if (!pendingEffectTimeout) return;
  clearTimeout(pendingEffectTimeout);
  pendingEffectTimeout = null;
};

const clampIndex = (index: number, pathLength: number): number => {
  if (pathLength <= 0) return 0;
  return Math.max(0, Math.min(index, pathLength - 1));
};

const formatTileMessage = (index: number, text: string | undefined): string => {
  const preview = text?.slice(0, 30) ?? 'Avançando...';
  const suffix = text && text.length > 30 ? '...' : '';
  return `Casa ${index + 1}: ${preview}${suffix}`;
};

const toSnapshot = (state: GameState): GameSnapshot => ({
  gameStatus: state.gameStatus,
  pathLength: state.path.length,
  playerIndex: state.playerIndex,
  targetIndex: state.targetIndex,
  isMoving: state.isMoving,
  isRolling: state.isRolling,
  isApplyingEffect: state.isApplyingEffect,
});

const createTileContent = (tile: Tile, stepIndex: number): TileContent => ({
  name: getTileName(tile, stepIndex),
  step: stepIndex + 1,
  text: tile.text ?? '',
  color: tile.color ?? 'blue',
  imageKey: tile.imageKey,
  type: tile.type,
  effect: tile.effect ?? null,
  meta: tile.meta,
});

type SyncQueueInput =
  | { type: 'progress'; payload: Extract<SyncQueueItem, { type: 'progress' }>['payload'] }
  | { type: 'settings'; payload: Extract<SyncQueueItem, { type: 'settings' }>['payload'] }
  | { type: 'profile'; payload: Extract<SyncQueueItem, { type: 'profile' }>['payload'] };

const enqueueSync = (state: GameState, item: SyncQueueInput): SyncQueueItem[] => {
  const nextItem: SyncQueueItem = {
    ...item,
    id: `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  return [...state.syncQueue, nextItem].slice(-100);
};

const saveSettings = async (state: GameState) => {
  await persistenceRepositories.settings.saveSettings({
    hapticsEnabled: state.hapticsEnabled,
    audioEnabled: state.audioEnabled,
    roamMode: state.roamMode,
    zoomLevel: state.zoomLevel,
    renderQuality: state.renderQuality,
  });
};

const saveProgress = async (state: GameState) => {
  await persistenceRepositories.progress.saveProgress({
    playerIndex: state.playerIndex,
    targetIndex: state.targetIndex,
    focusTileIndex: state.focusTileIndex,
    lastMessage: state.lastMessage,
    updatedAt: new Date().toISOString(),
  });
};

const saveAvatarProfile = async (state: GameState) => {
  const identity = await defaultSyncAdapters.auth.getDeviceIdentity();
  await persistenceRepositories.profile.saveProfile({
    id: identity.deviceId,
    locale: 'pt-BR',
    avatar: {
      shirtColor: state.shirtColor,
      hairColor: state.hairColor,
      skinColor: state.skinColor,
    },
  });
};

const defaultState = () => ({
  gameStatus: 'menu' as GameStatus,
  playerIndex: 0,
  targetIndex: 0,
  focusTileIndex: 0,
  currentRoll: null as number | null,
  isMoving: false,
  isRolling: false,
  isApplyingEffect: false,
  pendingEffect: null as TileEffect | null,
  showEducationalModal: false,
  currentTileContent: null as TileContent | null,
  showInfoPanel: false,
  showCustomization: false,
  lastMessage: 'Bem-vindo!',
});

const createSettingsSlice = (set: StoreSet, get: StoreGet) => ({
  roamMode: false,
  zoomLevel: 10,
  hapticsEnabled: true,
  audioEnabled: true,
  renderQuality: 'medium' as RenderQuality,

  setRoamMode: (roam: boolean) => {
    set({ roamMode: roam });
    void saveSettings(get());
  },

  setHapticsEnabled: (enabled: boolean) => {
    set({ hapticsEnabled: enabled });
    void saveSettings(get());
  },

  setAudioEnabled: (enabled: boolean) => {
    audioManager.setEnabled(enabled);
    set({ audioEnabled: enabled });
    void saveSettings(get());
  },

  setRenderQuality: (quality: RenderQuality) => {
    set({ renderQuality: quality });
    void saveSettings(get());
  },

  zoomIn: () => {
    set((state) => ({ zoomLevel: Math.max(5, state.zoomLevel - 5) }));
    void saveSettings(get());
  },

  zoomOut: () => {
    set((state) => ({ zoomLevel: Math.min(60, state.zoomLevel + 5) }));
    void saveSettings(get());
  },
});

const createUiSlice = (set: StoreSet, get: StoreGet) => ({
  showCustomization: false,
  showEducationalModal: false,
  currentTileContent: null as TileContent | null,
  showInfoPanel: false,

  setShowCustomization: (show: boolean) => set({ showCustomization: show }),

  setShowInfoPanel: (show: boolean) => set({ showInfoPanel: show }),

  setFocusTileIndex: (index: number) => {
    const { path } = get();
    if (path.length === 0) return;
    set({ focusTileIndex: clampIndex(index, path.length) });
  },

  openTilePreview: (index: number) => {
    const { isMoving, isRolling, path } = get();
    if (isMoving || isRolling || path.length === 0) return;

    const clamped = clampIndex(index, path.length);
    const tile = path[clamped];
    if (!tile) return;

    const tileName = getTileName(tile, clamped);

    set((state) => ({
      showEducationalModal: true,
      currentTileContent: createTileContent(tile, clamped),
      pendingEffect: null,
      focusTileIndex: clamped,
      showInfoPanel: false,
      lastMessage: `Visualizando ${tileName}`,
      syncQueue: enqueueSync(state, {
        type: 'progress',
        payload: {
          playerIndex: state.playerIndex,
          targetIndex: state.targetIndex,
          focusTileIndex: clamped,
          lastMessage: `Visualizando ${tileName}`,
          updatedAt: new Date().toISOString(),
        },
      }),
    }));
  },

  dismissEducationalModal: () => {
    const { pendingEffect, isApplyingEffect } = get();

    set({
      showEducationalModal: false,
      currentTileContent: null,
      showInfoPanel: false,
    });

    if (pendingEffect && !isApplyingEffect) {
      clearPendingEffectTimeout();
      pendingEffectTimeout = setTimeout(() => {
        pendingEffectTimeout = null;
        if (get().gameStatus !== 'playing') return;
        get().applyPendingEffect();
      }, 300);
    }
  },
});

const createSessionSlice = (set: StoreSet, get: StoreGet) => ({
  gameStatus: 'menu' as GameStatus,
  lastMessage: 'Bem-vindo!' as string | null,

  startGame: () => {
    clearPendingEffectTimeout();
    set({
      gameStatus: 'playing',
      showCustomization: false,
      showInfoPanel: false,
    });
  },

  restartGame: () => {
    clearPendingEffectTimeout();
    const nextBoard = createBoardLayout(BOARD_DEFINITION);

    set((state) => ({
      ...defaultState(),
      gameStatus: 'playing',
      lastMessage: 'Nova jornada iniciada!',
      boardSize: nextBoard.boardSize,
      path: nextBoard.path,
      roamMode: false,
      zoomLevel: 10,
      syncQueue: enqueueSync(state, {
        type: 'progress',
        payload: {
          playerIndex: 0,
          targetIndex: 0,
          focusTileIndex: 0,
          lastMessage: 'Nova jornada iniciada!',
          updatedAt: new Date().toISOString(),
        },
      }),
    }));

    void get().persistCurrentProgress();
  },

  setGameStatus: (status: GameStatus) => {
    if (status === 'menu') {
      clearPendingEffectTimeout();
    }

    set({ gameStatus: status });
  },

  resetGame: () => {
    clearPendingEffectTimeout();
    const nextBoard = createBoardLayout(BOARD_DEFINITION);

    set((state) => ({
      ...defaultState(),
      gameStatus: 'menu',
      lastMessage: 'Jogo Reiniciado.',
      boardSize: nextBoard.boardSize,
      path: nextBoard.path,
      roamMode: false,
      zoomLevel: 10,
      syncQueue: enqueueSync(state, {
        type: 'progress',
        payload: {
          playerIndex: 0,
          targetIndex: 0,
          focusTileIndex: 0,
          lastMessage: 'Jogo Reiniciado.',
          updatedAt: new Date().toISOString(),
        },
      }),
    }));

    void persistenceRepositories.progress.clearProgress();
  },
});

const createGameEngineSlice = (set: StoreSet, get: StoreGet) => ({
  playerIndex: 0,
  targetIndex: 0,
  focusTileIndex: 0,
  isMoving: false,
  currentRoll: null as number | null,
  isRolling: false,
  pendingEffect: null as TileEffect | null,
  isApplyingEffect: false,

  rollDice: () => {
    const snapshot = toSnapshot(get());
    if (snapshot.isRolling || snapshot.isMoving) return;

    set({ isRolling: true, lastMessage: 'Rolando...' });
  },

  completeRoll: (value: number) => {
    const snapshot = toSnapshot(get());
    const move = resolveRoll(snapshot, value);

    set((state) => ({
      isRolling: false,
      currentRoll: value,
      isMoving: true,
      targetIndex: move.targetIndex,
      lastMessage: `Tirou ${value}!`,
      syncQueue: enqueueSync(state, {
        type: 'progress',
        payload: {
          playerIndex: state.playerIndex,
          targetIndex: move.targetIndex,
          focusTileIndex: state.focusTileIndex,
          lastMessage: `Tirou ${value}!`,
          updatedAt: new Date().toISOString(),
        },
      }),
    }));
  },

  finishMovement: () => {
    const { targetIndex, path, isApplyingEffect } = get();
    const tile = path[targetIndex];
    if (!tile) return;

    if (isApplyingEffect) {
      set({
        isMoving: false,
        playerIndex: targetIndex,
        focusTileIndex: targetIndex,
        isApplyingEffect: false,
        showEducationalModal: false,
        currentTileContent: null,
      });
      void get().persistCurrentProgress();
      return;
    }

    const landing = resolveLandingEffect(tile, BOARD_DEFINITION.board.rules);

    set((state) => ({
      isMoving: false,
      playerIndex: targetIndex,
      focusTileIndex: targetIndex,
      showEducationalModal: true,
      currentTileContent: createTileContent(tile, targetIndex),
      pendingEffect: landing.effect,
      isApplyingEffect: false,
      lastMessage: formatTileMessage(targetIndex, tile.text),
      syncQueue: enqueueSync(state, {
        type: 'progress',
        payload: {
          playerIndex: targetIndex,
          targetIndex,
          focusTileIndex: targetIndex,
          lastMessage: formatTileMessage(targetIndex, tile.text),
          updatedAt: new Date().toISOString(),
        },
      }),
    }));

    void get().persistCurrentProgress();
  },

  applyPendingEffect: () => {
    clearPendingEffectTimeout();

    const { pendingEffect } = get();
    if (!pendingEffect) return;

    const snapshot = toSnapshot(get());
    const move = advanceWithEffect(snapshot, pendingEffect);

    set((state) => {
      let lastMessage = state.lastMessage;
      if (pendingEffect.advance) {
        lastMessage = `Avançou ${pendingEffect.advance} casas!`;
      } else if (pendingEffect.retreat) {
        lastMessage = `Recuou ${pendingEffect.retreat} casas.`;
      }

      if (move.targetIndex !== state.playerIndex) {
        return {
          isApplyingEffect: true,
          pendingEffect: null,
          isMoving: true,
          targetIndex: move.targetIndex,
          lastMessage,
          syncQueue: enqueueSync(state, {
            type: 'progress',
            payload: {
              playerIndex: state.playerIndex,
              targetIndex: move.targetIndex,
              focusTileIndex: state.focusTileIndex,
              lastMessage,
              updatedAt: new Date().toISOString(),
            },
          }),
        };
      }

      return {
        isApplyingEffect: false,
        pendingEffect: null,
        lastMessage,
      };
    });
  },
});

export const useGameStore = create<GameState>((set, get) => ({
  boardSize: INITIAL_BOARD.boardSize,
  path: INITIAL_BOARD.path,

  shirtColor: '#ff5555',
  hairColor: '#4a3b2a',
  skinColor: '#FFD5B8',

  isHydrated: false,
  syncQueue: [],

  setShirtColor: (color: string) => {
    set({ shirtColor: color });
    void saveAvatarProfile(get());
  },

  setHairColor: (color: string) => {
    set({ hairColor: color });
    void saveAvatarProfile(get());
  },

  setSkinColor: (color: string) => {
    set({ skinColor: color });
    void saveAvatarProfile(get());
  },

  hydrateFromPersistence: async () => {
    const [savedSettings, savedProgress, savedProfile] = await Promise.all([
      persistenceRepositories.settings.getSettings(),
      persistenceRepositories.progress.getProgress(),
      persistenceRepositories.profile.getProfile(),
    ]);

    set((state) => {
      const nextState: Partial<GameState> = { isHydrated: true };

      if (savedSettings) {
        nextState.hapticsEnabled = savedSettings.hapticsEnabled;
        nextState.audioEnabled = savedSettings.audioEnabled;
        nextState.roamMode = savedSettings.roamMode;
        nextState.zoomLevel = savedSettings.zoomLevel;
        nextState.renderQuality = savedSettings.renderQuality;
      }

      if (savedProgress && state.path.length > 0) {
        nextState.playerIndex = clampIndex(savedProgress.playerIndex, state.path.length);
        nextState.targetIndex = clampIndex(savedProgress.targetIndex, state.path.length);
        nextState.focusTileIndex = clampIndex(savedProgress.focusTileIndex, state.path.length);
        nextState.lastMessage = savedProgress.lastMessage;
      }

      if (savedProfile?.avatar) {
        nextState.shirtColor = savedProfile.avatar.shirtColor;
        nextState.hairColor = savedProfile.avatar.hairColor;
        nextState.skinColor = savedProfile.avatar.skinColor;
      }

      return nextState;
    });

    audioManager.setEnabled(get().audioEnabled);
  },

  persistCurrentProgress: async () => {
    await saveProgress(get());
  },

  flushSyncQueue: async () => {
    const { syncQueue } = get();
    if (syncQueue.length === 0) return;

    for (const item of syncQueue) {
      if (item.type === 'progress') {
        await defaultSyncAdapters.progress.pushProgress({
          version: 1,
          timestamp: item.createdAt,
          payload: item.payload,
        });
      } else {
        await defaultSyncAdapters.telemetry.track('sync_queue_skipped', {
          type: item.type,
        });
      }
    }

    set({ syncQueue: [] });
  },

  ...createSettingsSlice(set, get),
  ...createUiSlice(set, get),
  ...createSessionSlice(set, get),
  ...createGameEngineSlice(set, get),
}));

if (process.env.NODE_ENV !== 'test') {
  void useGameStore.getState().hydrateFromPersistence();
}
