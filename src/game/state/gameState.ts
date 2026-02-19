import boardData from '@/assets/board.json';
import { create } from 'zustand';
import { getTileName } from '../tileNaming';

type TileEffect = {
  advance?: number;
  retreat?: number;
  [key: string]: unknown;
};

export type Tile = {
  row: number;
  col: number;
  index: number;
  id: number;
  imageKey?: string;
  type?: string;
  color?: string;
  text?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

type BoardTileDefinition = {
  id: number;
  imageKey?: string;
  type?: string;
  color?: string;
  text?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

type BoardRules = {
  green?: { effect: string; value: number };
  red?: { effect: string; value: number };
  blue?: { effect: string };
};

type BoardConfig = {
  board: {
    id: string;
    flow?: string;
    startTile?: number;
    endTile?: number;
    rules?: BoardRules;
  };
  tiles: BoardTileDefinition[];
};

type BoardLayout = {
  path: Tile[];
  boardSize: { rows: number; cols: number };
};

export type GameState = {
  // Board Configuration
  boardSize: { rows: number; cols: number };
  path: Tile[];
  
  gameStatus: 'menu' | 'playing';
  
  // Player State
  playerIndex: number; 
  targetIndex: number; 
  focusTileIndex: number;
  isMoving: boolean;
  
  // Dice State
  currentRoll: number | null;
  isRolling: boolean;
  
  // UI State
  lastMessage: string | null;
  showCustomization: boolean;
  roamMode: boolean;
  zoomLevel: number;
  hapticsEnabled: boolean;
  
  // Educational Modal State
  showEducationalModal: boolean;
  currentTileContent: {
    name: string;
    step: number;
    text: string;
    color: string;
    imageKey?: string;
    type?: string;
  } | null;
  pendingEffect: TileEffect | null;
  isApplyingEffect: boolean;
  
  // Info Panel State
  showInfoPanel: boolean;
  
  // Customization
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  
  // Actions
  setShirtColor: (color: string) => void;
  setHairColor: (color: string) => void;
  setSkinColor: (color: string) => void;
  setShowCustomization: (show: boolean) => void;
  setRoamMode: (roam: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  startGame: () => void;
  restartGame: () => void;
  setGameStatus: (status: 'menu' | 'playing') => void;
  rollDice: () => void;
  completeRoll: (value: number) => void;
  finishMovement: () => void;
  setFocusTileIndex: (index: number) => void;
  openTilePreview: (index: number) => void;
  dismissEducationalModal: () => void;
  applyPendingEffect: () => void;
  setShowInfoPanel: (show: boolean) => void;
  resetGame: () => void;
};

const BOARD_PADDING = 2;
const BOARD_DEFINITION = boardData as BoardConfig;

// Layout 4: Wide Loop + Island
// Fixed path coordinates for exactly 46 tiles with start and end close together
const FIXED_PATH_COORDS: { row: number; col: number }[] = [
  // Bottom row (12 tiles: 0-11)
  { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
  { col: 4, row: 0 }, { col: 5, row: 0 }, { col: 6, row: 0 }, { col: 7, row: 0 },
  { col: 8, row: 0 }, { col: 9, row: 0 }, { col: 10, row: 0 }, { col: 11, row: 0 },
  // Right side up (6 tiles: 12-17)
  { col: 11, row: 1 }, { col: 11, row: 2 }, { col: 11, row: 3 }, 
  { col: 11, row: 4 }, { col: 11, row: 5 }, { col: 11, row: 6 },
  // Top row right to left (10 tiles: 18-27)
  { col: 10, row: 6 }, { col: 9, row: 6 }, { col: 8, row: 6 }, { col: 7, row: 6 },
  { col: 6, row: 6 }, { col: 5, row: 6 }, { col: 4, row: 6 }, { col: 3, row: 6 },
  { col: 2, row: 6 }, { col: 1, row: 6 },
  // Left side down (4 tiles: 28-31)
  { col: 1, row: 5 }, { col: 1, row: 4 }, { col: 1, row: 3 }, { col: 1, row: 2 },
  // Inner island loop (14 tiles: 32-45)
  { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 },
  { col: 6, row: 2 }, { col: 7, row: 2 }, { col: 8, row: 2 }, { col: 8, row: 3 },
  { col: 8, row: 4 }, { col: 7, row: 4 }, { col: 6, row: 4 }, { col: 5, row: 4 },
  { col: 4, row: 4 }, { col: 3, row: 4 },
];

const createBoardLayout = (config: BoardConfig, padding: number = BOARD_PADDING): BoardLayout => {
  const tiles = config.tiles;
  
  // Use fixed path coordinates, ensuring we have exactly 46
  const coords = FIXED_PATH_COORDS.slice(0, tiles.length);
  
  // Add padding offset to all coordinates
  const path: Tile[] = tiles.map((tile, index) => {
    const coord = coords[index] || { row: 0, col: 0 };
    return {
      row: coord.row + padding,
      col: coord.col + padding,
      index,
      id: tile.id,
      imageKey: tile.imageKey,
      type: tile.type,
      color: tile.color,
      text: tile.text,
      effect: tile.effect,
      meta: tile.meta,
    };
  });
  
  // Calculate board size from coordinates
  const maxRow = Math.max(...coords.map(c => c.row));
  const maxCol = Math.max(...coords.map(c => c.col));
  
  const boardSize = {
    rows: maxRow + 1 + padding * 2,
    cols: maxCol + 1 + padding * 2,
  };
  
  return { path, boardSize };
};

const buildInitialBoard = (): BoardLayout => createBoardLayout(BOARD_DEFINITION);
const INITIAL_BOARD = buildInitialBoard();
let pendingEffectTimeout: ReturnType<typeof setTimeout> | null = null;

const clearPendingEffectTimeout = () => {
  if (!pendingEffectTimeout) return;
  clearTimeout(pendingEffectTimeout);
  pendingEffectTimeout = null;
};

export const useGameStore = create<GameState>((set, get) => ({
  boardSize: INITIAL_BOARD.boardSize,
  path: INITIAL_BOARD.path,
  
  gameStatus: 'menu',
  playerIndex: 0,
  targetIndex: 0,
  focusTileIndex: 0,
  isMoving: false,
  
  currentRoll: null,
  isRolling: false,
  
  lastMessage: "Bem-vindo!",
  showCustomization: false, 
  roamMode: false, // Start in Follow mode
  zoomLevel: 10, // Default zoom distance (range: 5-60) - lower = closer
  hapticsEnabled: true,
  
  // Educational Modal
  showEducationalModal: false,
  currentTileContent: null,
  pendingEffect: null,
  isApplyingEffect: false,
  
  // Info Panel
  showInfoPanel: false,
  
  shirtColor: '#ff5555',
  hairColor: '#4a3b2a', 
  skinColor: '#FFD5B8', 
  
  setShirtColor: (color) => set({ shirtColor: color }),
  setHairColor: (color) => set({ hairColor: color }),
  setSkinColor: (color) => set({ skinColor: color }),
  setShowCustomization: (show) => set({ showCustomization: show }),
  setRoamMode: (roam) => set({ roamMode: roam }),
  setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.max(5, state.zoomLevel - 5) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.min(60, state.zoomLevel + 5) })),
  
  startGame: () => {
    clearPendingEffectTimeout();
    set({ gameStatus: 'playing', showCustomization: false });
  },
  restartGame: () => {
    clearPendingEffectTimeout();
    const nextBoard = buildInitialBoard();
    set({
      gameStatus: 'playing',
      playerIndex: 0,
      targetIndex: 0,
      focusTileIndex: 0,
      currentRoll: null,
      isMoving: false,
      isRolling: false,
      lastMessage: 'Nova jornada iniciada!',
      path: nextBoard.path,
      boardSize: nextBoard.boardSize,
      showCustomization: false,
      showEducationalModal: false,
      showInfoPanel: false,
      currentTileContent: null,
      pendingEffect: null,
      isApplyingEffect: false,
      roamMode: false,
      zoomLevel: 10,
    });
  },
  setGameStatus: (status) => {
    if (status === 'menu') {
      clearPendingEffectTimeout();
    }
    set({ gameStatus: status });
  },

  rollDice: () => {
    const { isRolling, isMoving } = get();
    if (isRolling || isMoving) return;
    
    set({ isRolling: true, lastMessage: "Rolando..." });
  },
  
  completeRoll: (value) => {
    const { playerIndex, path } = get();
    const nextIndex = Math.min(playerIndex + value, path.length - 1);
    
    set({ 
      isRolling: false, 
      currentRoll: value, 
      isMoving: true,
      targetIndex: nextIndex, 
      lastMessage: `Tirou ${value}!`
    });
  },

  setFocusTileIndex: (index) => {
    const { path } = get();
    if (path.length === 0) return;
    const clamped = Math.max(0, Math.min(index, path.length - 1));
    set({ focusTileIndex: clamped });
  },

  openTilePreview: (index) => {
    const { path, isMoving, isRolling } = get();
    if (isMoving || isRolling || path.length === 0) return;

    const clamped = Math.max(0, Math.min(index, path.length - 1));
    const tile = path[clamped];
    if (!tile) return;

    const tileName = getTileName(tile, clamped);
    set({
      showEducationalModal: true,
      currentTileContent: {
        name: tileName,
        step: clamped + 1,
        text: tile.text || '',
        color: tile.color || 'blue',
        imageKey: tile.imageKey,
        type: tile.type,
      },
      pendingEffect: null,
      focusTileIndex: clamped,
      lastMessage: `Visualizando ${tileName}`,
    });
  },
  
  finishMovement: () => {
    const { targetIndex, path } = get();
    const tile = path[targetIndex];
    
    const rules = BOARD_DEFINITION.board.rules;
    
    // Determine effect based on tile color
    let pendingEffect: TileEffect | null = null;
    if (tile.color === 'red' && rules?.red) {
      pendingEffect = { retreat: rules.red.value };
    } else if (tile.color === 'green' && rules?.green) {
      pendingEffect = { advance: rules.green.value };
    } else if (tile.effect) {
      // Use tile-specific effect if defined (e.g., yellow bonus tile)
      pendingEffect = tile.effect;
    }
    
    // Show educational modal with tile content
    set({ 
      isMoving: false, 
      playerIndex: targetIndex,
      focusTileIndex: targetIndex,
      isApplyingEffect: false,
      showEducationalModal: true,
      currentTileContent: {
        name: getTileName(tile, targetIndex),
        step: targetIndex + 1,
        text: tile.text || '',
        color: tile.color || 'blue',
        imageKey: tile.imageKey,
        type: tile.type,
      },
      pendingEffect,
      lastMessage: `Casa ${targetIndex + 1}: ${tile.text?.substring(0, 30) || 'Avançando...'}${tile.text && tile.text.length > 30 ? '...' : ''}`
    });
  },
  
  dismissEducationalModal: () => {
    const { pendingEffect, isApplyingEffect } = get();
    
    // Close modal
    set({ showEducationalModal: false, currentTileContent: null });
    
    // If there's a pending effect and we're not already applying one, apply it
    if (pendingEffect && !isApplyingEffect) {
      clearPendingEffectTimeout();
      // Small delay before applying effect for visual clarity
      pendingEffectTimeout = setTimeout(() => {
        pendingEffectTimeout = null;
        if (get().gameStatus !== 'playing') return;
        get().applyPendingEffect();
      }, 300);
    }
  },
  
  applyPendingEffect: () => {
    clearPendingEffectTimeout();
    const { pendingEffect, playerIndex, path } = get();
    if (!pendingEffect) return;
    
    set({ isApplyingEffect: true, pendingEffect: null });
    
    let newIndex = playerIndex;
    
    if (pendingEffect.advance) {
      newIndex = Math.min(playerIndex + pendingEffect.advance, path.length - 1);
      set({ lastMessage: `Avançou ${pendingEffect.advance} casas!` });
    } else if (pendingEffect.retreat) {
      newIndex = Math.max(playerIndex - pendingEffect.retreat, 0);
      set({ lastMessage: `Recuou ${pendingEffect.retreat} casas.` });
    }
    
    if (newIndex !== playerIndex) {
      // Animate movement to new position - let PlayerToken handle completion
      set({ 
        isMoving: true,
        targetIndex: newIndex,
      });
      // Note: finishMovement will be called by PlayerToken when animation completes
      // It will check isApplyingEffect and skip showing the modal
    } else {
      set({ isApplyingEffect: false });
    }
  },
  
  setShowInfoPanel: (show) => set({ showInfoPanel: show }),
  
  resetGame: () => {
    clearPendingEffectTimeout();
    const nextBoard = buildInitialBoard();
    set({
      gameStatus: 'menu',
      playerIndex: 0,
      targetIndex: 0,
      focusTileIndex: 0,
      currentRoll: null,
      isMoving: false,
      isRolling: false,
      lastMessage: "Jogo Reiniciado.",
      path: nextBoard.path,
      boardSize: nextBoard.boardSize,
      showCustomization: false,
      showEducationalModal: false,
      showInfoPanel: false,
      currentTileContent: null,
      pendingEffect: null,
      isApplyingEffect: false,
      roamMode: false,
      zoomLevel: 10
    });
  }
}));
