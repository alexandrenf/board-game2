import { advanceWithEffect, resolveLandingEffect, resolveRoll } from '@/src/domain/game/engine';
import { resolveQuizEffect } from '@/src/domain/game/quizEffectResolver';
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
import { persistenceRepositories } from '@/src/services/persistence/kvRepositories';
import { defaultSyncAdapters } from '@/src/services/sync/adapters';
import { SyncQueueItem } from '@/src/services/sync/types';
import { create } from 'zustand';
import { LANDING_TILE_MODAL_OPEN_DELAY_MS } from '../constants';
import { createBoardLayout } from './boardLayout';
import { getTileName } from '../tileNaming';

export type Tile = DomainTile;

export type RenderQuality = 'low' | 'medium' | 'high';
export type HelpCenterSection = 'como-jogar' | 'controles' | 'qualidade' | 'sobre';
export type QuizPhase = 'idle' | 'answering' | 'feedback';

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
  renderQuality: RenderQuality;

  playerName: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;

  isHydrated: boolean;
  sceneReady: boolean;
  syncQueue: SyncQueueItem[];
  sessionHistory: SessionHistoryEntry[];

  setShirtColor: (color: string) => void;
  setHairColor: (color: string) => void;
  setSkinColor: (color: string) => void;
  setPlayerName: (name: string) => void;

  setShowCustomization: (show: boolean) => void;
  setSceneReady: (ready: boolean) => void;
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
  submitQuizAnswer: (optionId: string | null) => void;
  dismissQuizFeedback: () => void;
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

/** Clamps an index to valid board path bounds. */
const clampIndex = (index: number, pathLength: number): number => {
  if (pathLength <= 0) return 0;
  return Math.max(0, Math.min(index, pathLength - 1));
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
    roamMode: state.roamMode,
    zoomLevel: state.zoomLevel,
    renderQuality: state.renderQuality,
  });
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
  educationalModalDelayMs: 0,
  currentTileContent: null as TileContent | null,
  showHelpCenter: false,
  helpCenterSection: 'como-jogar' as HelpCenterSection,

  setShowCustomization: (show: boolean) => set({ showCustomization: show }),
  setSceneReady: (ready: boolean) => set({ sceneReady: ready }),

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
    const { pendingEffect, isApplyingEffect } = get();

    set({
      showEducationalModal: false,
      educationalModalDelayMs: 0,
      currentTileContent: null,
      showHelpCenter: false,
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
    // Always clear any pending effect when leaving any game state to prevent
    // phantom board-position updates after unmount.
    clearPendingEffectTimeout();
    if (status === 'menu') {
      void audioManager.disposeAll();
    }
    set({ gameStatus: status });
  },

  resetGame: () => {
    clearPendingEffectTimeout();
    void audioManager.disposeAll();
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
      const question = selectQuestion(
        tile.color,
        get().usedQuestionIds,
        QUESTION_BANK.questions
      );

      if (question) {
        set((state) => ({
          isMoving: false,
          playerIndex: targetIndex,
          focusTileIndex: targetIndex,
          quizPhase: 'answering',
          currentQuiz: { question, startedAt: Date.now(), tileColor: tile.color },
          quizAnswer: null,
          showEducationalModal: false,
          educationalModalDelayMs: 0,
          currentTileContent: createTileContent(tile, targetIndex),
          pendingEffect: null,
          isApplyingEffect: false,
          lastMessage: tileMsg,
          usedQuestionIds: [...state.usedQuestionIds, question.id],
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
      quizPhase: 'feedback',
      quizAnswer: { selectedOptionId: optionId, result },
      pendingEffect,
      quizPoints: state.quizPoints + (isCorrect ? 5 : 0),
    }));

    void get().persistCurrentProgress();
  },

  dismissQuizFeedback: () => {
    const { currentTileContent } = get();
    const hasEducationalContent = Boolean(currentTileContent?.text?.trim());

    // Always show the educational modal for the tile where the quiz was
    // answered — even when a pending effect will later move the player — so
    // the learning moment is tied to the mistake, not the landing spot.
    // The pending effect is applied by dismissEducationalModal after the
    // player closes the modal.
    set({
      quizPhase: 'idle',
      currentQuiz: null,
      quizAnswer: null,
      showEducationalModal: hasEducationalContent,
      educationalModalDelayMs: hasEducationalContent ? 350 : 0,
    });

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
  syncQueue: [],
  sessionHistory: [] as SessionHistoryEntry[],

  setShirtColor: (color: string) => {
    set({ shirtColor: color });
    void savePlayerProfile(get());
  },

  setHairColor: (color: string) => {
    set({ hairColor: color });
    void savePlayerProfile(get());
  },

  setSkinColor: (color: string) => {
    set({ skinColor: color });
    void savePlayerProfile(get());
  },

  setPlayerName: (name: string) => {
    set({ playerName: name });
    void savePlayerProfile(get());
  },

  hydrateFromPersistence: async () => {
    const [savedSettings, savedProgressRaw, savedProfile] = await Promise.all([
      persistenceRepositories.settings.getSettings(),
      persistenceRepositories.progress.getProgress(),
      persistenceRepositories.profile.getProfile(),
    ]);

    const savedProgress = savedProgressRaw as (typeof savedProgressRaw & {
      pendingEffect?: TileEffect | null;
      quizPhase?: QuizPhase;
      usedQuestionIds?: string[];
      quizPoints?: number;
      currentQuiz?: { question: QuizQuestion; startedAt: number; tileColor: string } | null;
      quizAnswer?: { selectedOptionId: string | null; result: QuizResult } | null;
    });

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

        if (savedProgress.pendingEffect !== undefined) {
          nextState.pendingEffect = savedProgress.pendingEffect;
        }
        if (savedProgress.quizPhase !== undefined) {
          nextState.quizPhase = savedProgress.quizPhase;
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
        // Guard: feedback phase without an answer (data from before this fix) — reset to idle
        if (nextState.quizPhase === 'feedback' && !nextState.quizAnswer) {
          nextState.quizPhase = 'idle';
          nextState.currentQuiz = null;
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
