import { advanceWithEffect, clampIndex, resolveLandingEffect, resolveRoll } from '@/src/domain/game/engine';
import { resolveQuizEffect } from '@/src/domain/game/quizEffectResolver';
import { shuffleQuizOptions } from '@/src/domain/game/quizShuffler';
import { selectQuestion } from '@/src/domain/game/quizSelector';
import { QuizBank, QuizQuestion, QuizResult } from '@/src/domain/game/quizTypes';
import {
  BoardConfig,
  GameSnapshot,
  GameStatus,
  Tile as DomainTile,
  TileEffect,
} from '@/src/domain/game/types';
import { ADAPTED_QUESTION_BANK } from '@/src/content/quizQuestionAdapter';
import { SessionHistoryEntry } from '@/src/game/session/types';
import { getValidatedBoardConfig } from '@/src/content/board.schema';
import { audioManager } from '@/src/services/audio/audioManager';
import { useMultiplayerRuntimeStore } from '@/src/services/multiplayer/runtimeStore';
import { persistenceRepositories } from '@/src/services/persistence/kvRepositories';
import { defaultSyncAdapters } from '@/src/services/sync/adapters';
import { SyncQueueItem } from '@/src/services/sync/types';
import { create } from 'zustand';
import { LANDING_TILE_MODAL_OPEN_DELAY_MS } from '../constants';
import { createBoardLayout } from './boardLayout';
import { getTileName } from '../tileNaming';

export type Tile = DomainTile;

export type RenderQuality = 'pwa' | 'low' | 'medium' | 'high';
export type HelpCenterSection = 'como-jogar' | 'controles' | 'qualidade' | 'sobre';
export type QuizPhase = 'idle' | 'intro' | 'answering' | 'review';

export type TileContent = {
  name: string;
  step: number;
  text: string;
  supportText?: string;
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
  educationalModalDelayMs: number;
  currentTileContent: TileContent | null;
  pendingEffect: TileEffect | null;
  isApplyingEffect: boolean;
  previousPlayerIndex: number;
  quizPhase: QuizPhase;
  currentQuiz: { question: QuizQuestion; startedAt: number; tileColor: string } | null;
  quizAnswer: { selectedOptionId: string | null; result: QuizResult } | null;
  usedQuestionIds: string[];
  quizPoints: number;
  showHelpCenter: boolean;
  helpCenterSection: HelpCenterSection;

  roamMode: boolean;
  zoomLevel: number;
  hapticsEnabled: boolean;
  audioEnabled: boolean;
  musicVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  renderQuality: RenderQuality;
  qualityCeiling: RenderQuality;

  playerName: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;

  isHydrated: boolean;
  sceneReady: boolean;
  modelsReady: boolean;
  audioReady: boolean;
  syncQueue: SyncQueueItem[];
  sessionHistory: SessionHistoryEntry[];

  setShirtColor: (color: string) => void;
  setHairColor: (color: string) => void;
  setSkinColor: (color: string) => void;
  setPlayerName: (name: string) => void;

  setShowCustomization: (show: boolean) => void;
  setSceneReady: (ready: boolean) => void;
  setModelsReady: (ready: boolean) => void;
  setAudioReady: (ready: boolean) => void;
  setRoamMode: (roam: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setMusicVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setRenderQuality: (quality: RenderQuality) => void;
  setRenderQualityManual: (quality: RenderQuality) => void;

  zoomIn: () => void;
  zoomOut: () => void;
  flushSettings: () => void;

  startGame: () => void;
  restartGame: () => void;
  setGameStatus: (status: GameStatus) => void;

  rollDice: () => void;
  completeRoll: (value: number) => void;
  setCurrentRoll: (value: number | null) => void;
  finishMovement: () => void;

  setFocusTileIndex: (index: number) => void;
  openTilePreview: (index: number) => void;
  dismissEducationalModal: () => void;
  applyPendingEffect: () => void;
  beginQuizQuestion: () => void;
  submitQuizAnswer: (optionId: string | null) => void;
  openHelpCenter: (section?: HelpCenterSection) => void;
  closeHelpCenter: () => void;

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
const QUESTION_BANK: QuizBank = { version: 2, questions: ADAPTED_QUESTION_BANK };

let pendingEffectTimeout: ReturnType<typeof setTimeout> | null = null;

/** Clears the pending tile-effect timeout to prevent phantom updates. */
const clearPendingEffectTimeout = () => {
  if (!pendingEffectTimeout) return;
  clearTimeout(pendingEffectTimeout);
  pendingEffectTimeout = null;
};



/** Formats a short preview message for a given tile. */
const formatTileMessage = (index: number, tile: Tile | undefined): string => {
  const label =
    typeof tile?.meta?.label === 'string'
      ? tile.meta.label
      : tile?.text;
  const preview = label?.slice(0, 30) ?? 'Avançando...';
  const suffix = label && label.length > 30 ? '...' : '';
  return `Casa ${index + 1}: ${preview}${suffix}`;
};

/** Tile colors that trigger a quiz when landed on. */
const QUIZ_TILE_COLORS = new Set(['green', 'red', 'blue', 'yellow']);

/**
 * Type guard: checks whether a tile should trigger a quiz round.
 * Requires a recognized color, a themeId in meta, and excludes start/end/bonus tiles.
 */
const isQuizEligibleTile = (tile: Tile | undefined): tile is Tile & {
  color: string;
  meta: Record<string, unknown> & { themeId: string };
} =>
  Boolean(
    tile &&
      typeof tile.color === 'string' &&
      QUIZ_TILE_COLORS.has(tile.color) &&
      typeof tile.meta?.themeId === 'string' &&
      tile.type !== 'start' &&
      tile.type !== 'end' &&
      tile.type !== 'bonus'
  );

/** Returns the movement rule value configured for a given tile color. */
const getRuleValueForColor = (tileColor: string): number => {
  const rules = BOARD_DEFINITION.board.rules;
  const rule =
    tileColor === 'green'
      ? rules?.green
      : tileColor === 'red'
        ? rules?.red
        : tileColor === 'blue'
          ? rules?.blue
          : undefined;

  return typeof rule?.value === 'number' && rule.value > 0 ? rule.value : 2;
};

/** Builds a lightweight snapshot of the current game engine state. */
const toSnapshot = (state: GameState): GameSnapshot => ({
  gameStatus: state.gameStatus,
  pathLength: state.path.length,
  playerIndex: state.playerIndex,
  targetIndex: state.targetIndex,
  isMoving: state.isMoving,
  isRolling: state.isRolling,
  isApplyingEffect: state.isApplyingEffect,
});

/** Converts a domain Tile into TileContent ready for UI rendering. */
const createTileContent = (tile: Tile, stepIndex: number): TileContent => ({
  name: getTileName(tile, stepIndex),
  step: stepIndex + 1,
  text: tile.text ?? '',
  supportText: tile.supportText,
  color: tile.color ?? 'blue',
  imageKey: tile.imageKey,
  type: tile.type,
  effect: tile.effect ?? null,
  meta: tile.meta,
});

/** Union of items that can be enqueued for background sync. */
type SyncQueueInput =
  | { type: 'progress'; payload: Extract<SyncQueueItem, { type: 'progress' }>['payload'] }
  | { type: 'settings'; payload: Extract<SyncQueueItem, { type: 'settings' }>['payload'] }
  | { type: 'profile'; payload: Extract<SyncQueueItem, { type: 'profile' }>['payload'] };

/** Maximum number of history entries to keep in the session log. */
const MAX_SESSION_HISTORY = 40;
const DEFAULT_MUSIC_VOLUME = 0.6;
const DEFAULT_AMBIENT_VOLUME = 0.35;
const DEFAULT_SFX_VOLUME = 1;

const clampVolume = (volume: number): number => Math.max(0, Math.min(1, volume));

/**
 * Map render quality to SFX voice pool size. Low/PWA tiers receive 2 voices
 * (less RAM + fewer media-player handles, important on Android low-end);
 * medium/high keep the default of 3 for richer overlap.
 */
const sfxPoolSizeForQuality = (quality: RenderQuality): number =>
  quality === 'low' || quality === 'pwa' ? 2 : 3;

/** Prepends a new entry to the session history, capping at {@link MAX_SESSION_HISTORY}. */
const pushHistoryEntry = (
  history: SessionHistoryEntry[],
  text: string,
  player: string
): SessionHistoryEntry[] => {
  const entry: SessionHistoryEntry = {
    id: `solo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    player,
    timestamp: Date.now(),
  };
  const next = [entry, ...history];
  return next.length > MAX_SESSION_HISTORY ? next.slice(0, MAX_SESSION_HISTORY) : next;
};

/** Adds a sync item to the queue, keeping the last 100 items. */
const enqueueSync = (state: GameState, item: SyncQueueInput): SyncQueueItem[] => {
  const nextItem: SyncQueueItem = {
    ...item,
    id: `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  return [...state.syncQueue, nextItem].slice(-100);
};

/** Persists current settings (audio, haptics, roam mode, zoom, render quality) to storage. */
const saveSettings = async (state: GameState) => {
  await persistenceRepositories.settings.saveSettings({
    hapticsEnabled: state.hapticsEnabled,
    audioEnabled: state.audioEnabled,
    musicVolume: state.musicVolume,
    ambientVolume: state.ambientVolume,
    sfxVolume: state.sfxVolume,
    roamMode: state.roamMode,
    zoomLevel: state.zoomLevel,
    renderQuality: state.renderQuality,
    qualityCeiling: state.qualityCeiling,
  });
};

let settingsSaveTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSaveSettings = (get: StoreGet) => {
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    void saveSettings(get());
    settingsSaveTimer = null;
  }, 1000);
};

/** Persists current game progress including quiz state to storage. */
const saveProgress = async (state: GameState) => {
  const progress = {
    playerIndex: state.playerIndex,
    targetIndex: state.targetIndex,
    focusTileIndex: state.focusTileIndex,
    lastMessage: state.lastMessage,
    updatedAt: new Date().toISOString(),
    pendingEffect: state.pendingEffect,
    quizPhase: state.quizPhase,
    usedQuestionIds: state.usedQuestionIds,
    quizPoints: state.quizPoints,
    currentQuiz: state.currentQuiz,
    quizAnswer: state.quizAnswer,
  };
  await persistenceRepositories.progress.saveProgress(progress);
};

/** Persists the player's profile (name, avatar colors) to storage. */
const savePlayerProfile = async (state: GameState) => {
  const currentProfile = await persistenceRepositories.profile.getProfile();
  const profileId = currentProfile?.id ?? (await defaultSyncAdapters.auth.getDeviceIdentity()).deviceId;

  await persistenceRepositories.profile.saveProfile({
    id: profileId,
    displayName: state.playerName.trim() || undefined,
    locale: 'pt-BR',
    avatar: {
      shirtColor: state.shirtColor,
      hairColor: state.hairColor,
      skinColor: state.skinColor,
    },
  });
};

let profileSaveTimer: ReturnType<typeof setTimeout> | null = null;
const PROFILE_SAVE_DEBOUNCE_MS = 500;
/**
 * Debounces profile saves so rapid edits (e.g. typing a name, dragging a
 * color picker) collapse into a single persistence write.
 */
const debouncedSavePlayerProfile = (get: StoreGet) => {
  if (profileSaveTimer) clearTimeout(profileSaveTimer);
  profileSaveTimer = setTimeout(() => {
    void savePlayerProfile(get());
    profileSaveTimer = null;
  }, PROFILE_SAVE_DEBOUNCE_MS);
};

const buildInitialSyncEntry = (message: string): SyncQueueItem => ({
  type: 'progress',
  id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  payload: {
    playerIndex: 0,
    targetIndex: 0,
    focusTileIndex: 0,
    lastMessage: message,
    updatedAt: new Date().toISOString(),
  },
});

const defaultState = () => ({
  gameStatus: 'menu' as GameStatus,
  playerIndex: 0,
  targetIndex: 0,
  focusTileIndex: 0,
  currentRoll: null as number | null,
  isMoving: false,
  isRolling: false,
  isApplyingEffect: false,
  previousPlayerIndex: 0,
  quizPhase: 'idle' as QuizPhase,
  currentQuiz: null as { question: QuizQuestion; startedAt: number; tileColor: string } | null,
  quizAnswer: null as { selectedOptionId: string | null; result: QuizResult } | null,
  usedQuestionIds: [] as string[],
  quizPoints: 0,
  pendingEffect: null as TileEffect | null,
  showEducationalModal: false,
  currentTileContent: null as TileContent | null,
  showHelpCenter: false,
  helpCenterSection: 'como-jogar' as HelpCenterSection,
  showCustomization: false,
  lastMessage: 'Bem-vindo!',
  sessionHistory: [] as SessionHistoryEntry[],
});

const createSettingsSlice = (set: StoreSet, get: StoreGet) => ({
  roamMode: false,
  zoomLevel: 10,
  hapticsEnabled: true,
  audioEnabled: true,
  musicVolume: DEFAULT_MUSIC_VOLUME,
  ambientVolume: DEFAULT_AMBIENT_VOLUME,
  sfxVolume: DEFAULT_SFX_VOLUME,
  renderQuality: 'medium' as RenderQuality,
  qualityCeiling: 'high' as RenderQuality,

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

  setMusicVolume: (volume: number) => {
    const nextVolume = clampVolume(volume);
    audioManager.setBusVolume('music', nextVolume);
    set({ musicVolume: nextVolume });
    debouncedSaveSettings(get);
  },

  setAmbientVolume: (volume: number) => {
    const nextVolume = clampVolume(volume);
    audioManager.setBusVolume('ambient', nextVolume);
    set({ ambientVolume: nextVolume });
    debouncedSaveSettings(get);
  },

  setSfxVolume: (volume: number) => {
    const nextVolume = clampVolume(volume);
    audioManager.setBusVolume('sfx', nextVolume);
    set({ sfxVolume: nextVolume });
    debouncedSaveSettings(get);
  },

  setRenderQuality: (quality: RenderQuality) => {
    const state = get();
    // Adaptive downgrades that fire while a roll/move/quiz/multiplayer turn
    // is in flight risk remounting the dice subtree mid-interaction. Skip
    // and let useAdaptiveRenderQuality retry on the next FPS sample (~10
    // frames later, then 8s cooldown after each successful change).
    if (state.isRolling || state.isMoving || state.quizPhase !== 'idle') {
      return;
    }
    if (state.gameStatus === 'multiplayer') {
      const mpPhase = useMultiplayerRuntimeStore.getState().turnPhase;
      if (mpPhase === 'awaiting_roll' || mpPhase === 'awaiting_quiz' || mpPhase === 'awaiting_ack') {
        return;
      }
    }
    set({ renderQuality: quality });
    audioManager.setSfxPoolSize(sfxPoolSizeForQuality(quality));
    void saveSettings(get());
  },

  setRenderQualityManual: (quality: RenderQuality) => {
    set({ renderQuality: quality, qualityCeiling: quality });
    audioManager.setSfxPoolSize(sfxPoolSizeForQuality(quality));
    void saveSettings(get());
  },

  zoomIn: () => {
    set((state) => ({ zoomLevel: Math.max(5, state.zoomLevel - 5) }));
    debouncedSaveSettings(get);
  },

  zoomOut: () => {
    set((state) => ({ zoomLevel: Math.min(60, state.zoomLevel + 5) }));
    debouncedSaveSettings(get);
  },

  flushSettings: () => {
    if (settingsSaveTimer) {
      clearTimeout(settingsSaveTimer);
      settingsSaveTimer = null;
    }
    void saveSettings(get());
  },
});

const createUiSlice = (set: StoreSet, get: StoreGet) => ({
  showCustomization: false,
  showEducationalModal: false,
  educationalModalDelayMs: 0,
  currentTileContent: null as TileContent | null,
  showHelpCenter: false,
  helpCenterSection: 'como-jogar' as HelpCenterSection,

  setShowCustomization: (show: boolean) => set({ showCustomization: show }),
  setSceneReady: (ready: boolean) => set({ sceneReady: ready }),
  setModelsReady: (ready: boolean) => set({ modelsReady: ready }),
  setAudioReady: (ready: boolean) => set({ audioReady: ready }),

  openHelpCenter: (section: HelpCenterSection = 'como-jogar') =>
    set({
      showHelpCenter: true,
      helpCenterSection: section,
    }),

  closeHelpCenter: () =>
    set({
      showHelpCenter: false,
    }),

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
      educationalModalDelayMs: 0,
      currentTileContent: createTileContent(tile, clamped),
      pendingEffect: null,
      focusTileIndex: clamped,
      showHelpCenter: false,
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
    const { pendingEffect, isApplyingEffect, quizPhase } = get();
    const wasReviewing = quizPhase === 'review';

    set({
      showEducationalModal: false,
      educationalModalDelayMs: 0,
      currentTileContent: null,
      showHelpCenter: false,
      ...(wasReviewing
        ? {
            quizPhase: 'idle' as QuizPhase,
            currentQuiz: null,
            quizAnswer: null,
          }
        : {}),
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
      showHelpCenter: false,
    });
  },

  restartGame: () => {
    clearPendingEffectTimeout();
    const nextBoard = createBoardLayout(BOARD_DEFINITION);

    set({
      ...defaultState(),
      gameStatus: 'playing',
      lastMessage: 'Nova jornada iniciada!',
      boardSize: nextBoard.boardSize,
      path: nextBoard.path,
      roamMode: false,
      zoomLevel: 10,
      syncQueue: [buildInitialSyncEntry('Nova jornada iniciada!')],
    });

    void get().persistCurrentProgress();
  },

  setGameStatus: (status: GameStatus) => {
    // Always clear any pending effect when leaving any game state to prevent
    // phantom board-position updates after unmount.
    clearPendingEffectTimeout();
    if (status === 'menu') {
      audioManager.stopAllLoops();
    }
    set({ gameStatus: status });
  },

  resetGame: () => {
    clearPendingEffectTimeout();
    audioManager.stopAllLoops();
    const nextBoard = createBoardLayout(BOARD_DEFINITION);

    set({
      ...defaultState(),
      gameStatus: 'menu',
      lastMessage: 'Jogo Reiniciado.',
      boardSize: nextBoard.boardSize,
      path: nextBoard.path,
      roamMode: false,
      zoomLevel: 10,
      syncQueue: [buildInitialSyncEntry('Jogo Reiniciado.')],
    });

    persistenceRepositories.progress.clearProgress().catch((e) => {
      console.warn('resetGame: failed to clear persistence', e);
    });
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
  previousPlayerIndex: 0,
  quizPhase: 'idle' as QuizPhase,
  currentQuiz: null as { question: QuizQuestion; startedAt: number; tileColor: string } | null,
  quizAnswer: null as { selectedOptionId: string | null; result: QuizResult } | null,
  usedQuestionIds: [] as string[],
  quizPoints: 0,

  rollDice: () => {
    const snapshot = toSnapshot(get());
    if (snapshot.isRolling || snapshot.isMoving) return;
    if (get().quizPhase !== 'idle') return;
    if (get().pendingEffect) return;
    if (get().showEducationalModal) return;

    set({ isRolling: true, lastMessage: 'Rolando...' });
  },

  setCurrentRoll: (value: number | null) => {
    set({ currentRoll: value, isRolling: false });
  },

  completeRoll: (value: number) => {
    const snapshot = toSnapshot(get());
    const move = resolveRoll(snapshot, value);
    const playerName = get().playerName.trim() || 'Você';

    set((state) => ({
      isRolling: false,
      currentRoll: value,
      isMoving: true,
      targetIndex: move.targetIndex,
      previousPlayerIndex: state.playerIndex,
      lastMessage: `Tirou ${value}!`,
      sessionHistory: pushHistoryEntry(state.sessionHistory, `Tirou ${value}!`, playerName),
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
      // Effect-driven landing after a wrong quiz answer. The educational modal
      // for the tile where the player made the mistake was already shown before
      // this movement, so land silently without re-opening a modal here.
      set((state) => ({
        isMoving: false,
        playerIndex: targetIndex,
        focusTileIndex: targetIndex,
        isApplyingEffect: false,
        currentTileContent: null,
        showEducationalModal: false,
        educationalModalDelayMs: 0,
        sessionHistory: pushHistoryEntry(
          state.sessionHistory,
          formatTileMessage(targetIndex, tile),
          state.playerName.trim() || 'Você'
        ),
      }));
      void get().persistCurrentProgress();
      return;
    }

    const playerName = get().playerName.trim() || 'Você';
    const tileMsg = formatTileMessage(targetIndex, tile);

    if (isQuizEligibleTile(tile)) {
      const currentUsed = get().usedQuestionIds;
      const question = selectQuestion(
        tile.id,
        currentUsed,
        QUESTION_BANK.questions
      );

      if (question) {
        // Detect the recycle path: if selectQuestion returned a question that
        // was already in usedQuestionIds, the pool for this tile was exhausted.
        // Reset the used-set entries for this tile so subsequent selections
        // start fresh while preserving used markers for other tiles.
        const wasRecycled = currentUsed.includes(question.id);
        const themeUsedIds = wasRecycled
          ? currentUsed.filter((id) => {
              const q = QUESTION_BANK.questions.find((entry) => entry.id === id);
              return q ? q.tileId !== tile.id : true;
            })
          : currentUsed;

        const shuffledQuestion = shuffleQuizOptions(question);
        set((state) => ({
          isMoving: false,
          playerIndex: targetIndex,
          focusTileIndex: targetIndex,
          quizPhase: 'intro',
          currentQuiz: { question: shuffledQuestion, startedAt: Date.now(), tileColor: tile.color },
          quizAnswer: null,
          showEducationalModal: false,
          educationalModalDelayMs: 0,
          currentTileContent: createTileContent(tile, targetIndex),
          pendingEffect: null,
          isApplyingEffect: false,
          lastMessage: tileMsg,
          usedQuestionIds: [...themeUsedIds, question.id],
          sessionHistory: pushHistoryEntry(state.sessionHistory, tileMsg, playerName),
          syncQueue: enqueueSync(state, {
            type: 'progress',
            payload: {
              playerIndex: targetIndex,
              targetIndex,
              focusTileIndex: targetIndex,
              lastMessage: tileMsg,
              updatedAt: new Date().toISOString(),
            },
          }),
        }));

        void get().persistCurrentProgress();
        return;
      }
    }

    const landing = resolveLandingEffect(tile, BOARD_DEFINITION.board.rules);

    set((state) => ({
      isMoving: false,
      playerIndex: targetIndex,
      focusTileIndex: targetIndex,
      showEducationalModal: true,
      educationalModalDelayMs: LANDING_TILE_MODAL_OPEN_DELAY_MS,
      currentTileContent: createTileContent(tile, targetIndex),
      pendingEffect: landing.effect,
      isApplyingEffect: false,
      lastMessage: tileMsg,
      sessionHistory: pushHistoryEntry(state.sessionHistory, tileMsg, playerName),
      syncQueue: enqueueSync(state, {
        type: 'progress',
        payload: {
          playerIndex: targetIndex,
          targetIndex,
          focusTileIndex: targetIndex,
          lastMessage: tileMsg,
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

  beginQuizQuestion: () => {
    const { currentQuiz, quizPhase } = get();
    if (quizPhase !== 'intro' || !currentQuiz) return;

    set({
      quizPhase: 'answering',
      currentQuiz: { ...currentQuiz, startedAt: Date.now() },
    });

    void get().persistCurrentProgress();
  },

  submitQuizAnswer: (optionId: string | null) => {
    const { currentQuiz, previousPlayerIndex, playerIndex, path } = get();
    if (!currentQuiz || get().quizPhase !== 'answering') return;

    const isCorrect = optionId === currentQuiz.question.correctOptionId;
    const result: QuizResult = optionId === null ? 'timeout' : isCorrect ? 'correct' : 'incorrect';
    const tileColor = currentQuiz.tileColor;
    const resolution = resolveQuizEffect(
      tileColor,
      result,
      playerIndex,
      previousPlayerIndex,
      getRuleValueForColor(tileColor),
      path.length
    );

    let pendingEffect: TileEffect | null = null;
    if (resolution.effect === 'advance') {
      pendingEffect = { advance: resolution.value };
    } else if (resolution.effect === 'retreat') {
      pendingEffect = { retreat: resolution.value };
    } else if (resolution.effect === 'return_to_previous' && resolution.previousIndex !== undefined) {
      const retreatBy = playerIndex - resolution.previousIndex;
      if (retreatBy > 0) {
        pendingEffect = { retreat: retreatBy };
      }
    }

    set((state) => ({
      quizPhase: 'review',
      quizAnswer: { selectedOptionId: optionId, result },
      pendingEffect,
      quizPoints: state.quizPoints + (isCorrect ? 5 : 0),
      showEducationalModal: true,
      educationalModalDelayMs: 250,
    }));

    void get().persistCurrentProgress();
  },
});

export const useGameStore = create<GameState>((set, get) => ({
  boardSize: INITIAL_BOARD.boardSize,
  path: INITIAL_BOARD.path,

  playerName: '',
  shirtColor: '#ff5555',
  hairColor: '#4a3b2a',
  skinColor: '#FFD5B8',

  isHydrated: false,
  sceneReady: false,
  modelsReady: false,
  audioReady: false,
  syncQueue: [],
  sessionHistory: [] as SessionHistoryEntry[],

  setShirtColor: (color: string) => {
    set({ shirtColor: color });
    debouncedSavePlayerProfile(get);
  },

  setHairColor: (color: string) => {
    set({ hairColor: color });
    debouncedSavePlayerProfile(get);
  },

  setSkinColor: (color: string) => {
    set({ skinColor: color });
    debouncedSavePlayerProfile(get);
  },

  setPlayerName: (name: string) => {
    set({ playerName: name });
    debouncedSavePlayerProfile(get);
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
        nextState.musicVolume = clampVolume(savedSettings.musicVolume ?? DEFAULT_MUSIC_VOLUME);
        nextState.ambientVolume = clampVolume(savedSettings.ambientVolume ?? DEFAULT_AMBIENT_VOLUME);
        nextState.sfxVolume = clampVolume(savedSettings.sfxVolume ?? DEFAULT_SFX_VOLUME);
        nextState.roamMode = savedSettings.roamMode;
        nextState.zoomLevel = savedSettings.zoomLevel;
        nextState.renderQuality = savedSettings.renderQuality;
        if (savedSettings.qualityCeiling) {
          nextState.qualityCeiling = savedSettings.qualityCeiling;
        }
      }

      if (savedProgress && state.path.length > 0) {
        nextState.gameStatus = 'playing';
        nextState.playerIndex = clampIndex(savedProgress.playerIndex, state.path.length);
        nextState.targetIndex = clampIndex(savedProgress.targetIndex, state.path.length);
        nextState.focusTileIndex = clampIndex(savedProgress.focusTileIndex, state.path.length);
        nextState.lastMessage = savedProgress.lastMessage;

        if (savedProgress.pendingEffect !== undefined) {
          nextState.pendingEffect = savedProgress.pendingEffect;
        }
        if (savedProgress.quizPhase !== undefined) {
          // Map legacy 'feedback' phase to the new 'review' phase so older
          // saves do not get stuck after the state-machine rename.
          const persisted = savedProgress.quizPhase as string;
          nextState.quizPhase =
            persisted === 'feedback'
              ? ('review' as QuizPhase)
              : (persisted as QuizPhase);
        }
        if (savedProgress.usedQuestionIds !== undefined) {
          nextState.usedQuestionIds = savedProgress.usedQuestionIds;
        }
        if (savedProgress.quizPoints !== undefined) {
          nextState.quizPoints = savedProgress.quizPoints;
        }
        if (savedProgress.currentQuiz) {
          nextState.currentQuiz = savedProgress.currentQuiz;
        }
        if (savedProgress.quizAnswer !== undefined) {
          nextState.quizAnswer = savedProgress.quizAnswer;
        }
        // Guard: review/intro phase without question data — reset to idle so
        // the player can roll again instead of being stuck on a blank modal.
        if (
          (nextState.quizPhase === 'review' && !nextState.quizAnswer) ||
          (nextState.quizPhase === 'intro' && !nextState.currentQuiz)
        ) {
          nextState.quizPhase = 'idle';
          nextState.currentQuiz = null;
          nextState.quizAnswer = null;
        }
      }

      if (savedProfile?.avatar) {
        nextState.shirtColor = savedProfile.avatar.shirtColor;
        nextState.hairColor = savedProfile.avatar.hairColor;
        nextState.skinColor = savedProfile.avatar.skinColor;
      }

      if (typeof savedProfile?.displayName === 'string') {
        nextState.playerName = savedProfile.displayName;
      }

      return nextState;
    });

    audioManager.setEnabled(get().audioEnabled);
    audioManager.setVolumes({
      music: get().musicVolume,
      ambient: get().ambientVolume,
      sfx: get().sfxVolume,
    });
    audioManager.setSfxPoolSize(sfxPoolSizeForQuality(get().renderQuality));
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
