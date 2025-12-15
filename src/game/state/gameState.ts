import boardData from '@/assets/board.json';
import { create } from 'zustand';

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
  type?: string;
  color?: string;
  text?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

type BoardTileDefinition = {
  id: number;
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
  isMoving: boolean;
  
  // Dice State
  currentRoll: number | null;
  isRolling: boolean;
  
  // UI State
  lastMessage: string | null;
  showCustomization: boolean;
  roamMode: boolean;
  zoomLevel: number;
  
  // Educational Modal State
  showEducationalModal: boolean;
  currentTileContent: { text: string; color: string; type?: string } | null;
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
  zoomIn: () => void;
  zoomOut: () => void;
  startGame: () => void;
  setGameStatus: (status: 'menu' | 'playing') => void;
  rollDice: () => void;
  completeRoll: (value: number) => void;
  finishMovement: () => void;
  dismissEducationalModal: () => void;
  applyPendingEffect: () => void;
  setShowInfoPanel: (show: boolean) => void;
  resetGame: () => void;
};

const BOARD_PADDING = 2;
const BOARD_DEFINITION = boardData as BoardConfig;

// Build a deterministic spiral path based on assets/board.json
const createBoardLayout = (config: BoardConfig, padding: number = BOARD_PADDING): BoardLayout => {
  const tiles = config.tiles;
  const tileCount = tiles.length;
  
  // Spiral dimensions sized to fit all tiles
  const gridSize = Math.max(3, Math.ceil(Math.sqrt(tileCount)));
  const coords: Array<{ row: number; col: number }> = [];
  
  let top = 0;
  let bottom = gridSize - 1;
  let left = 0;
  let right = gridSize - 1;
  
  // Clockwise spiral: right -> down -> left -> up
  while (coords.length < tileCount && top <= bottom && left <= right) {
    for (let c = left; c <= right && coords.length < tileCount; c++) {
      coords.push({ row: top, col: c });
    }
    top++;
    
    for (let r = top; r <= bottom && coords.length < tileCount; r++) {
      coords.push({ row: r, col: right });
    }
    right--;
    
    if (top <= bottom) {
      for (let c = right; c >= left && coords.length < tileCount; c--) {
        coords.push({ row: bottom, col: c });
      }
      bottom--;
    }
    
    if (left <= right) {
      for (let r = bottom; r >= top && coords.length < tileCount; r--) {
        coords.push({ row: r, col: left });
      }
      left++;
    }
  }
  
  // Determine bounding box for padding and centering
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;
  
  coords.forEach(({ row, col }) => {
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  });
  
  const rowOffset = padding - minRow;
  const colOffset = padding - minCol;
  
  const path: Tile[] = tiles.map((tile, index) => {
    const { row, col } = coords[index];
    return {
      row: row + rowOffset,
      col: col + colOffset,
      index,
      id: tile.id,
      type: tile.type,
      color: tile.color,
      text: tile.text,
      effect: tile.effect,
      meta: tile.meta,
    };
  });
  
  const boardSize = {
    rows: maxRow - minRow + 1 + padding * 2,
    cols: maxCol - minCol + 1 + padding * 2,
  };
  
  return { path, boardSize };
};

const buildInitialBoard = (): BoardLayout => createBoardLayout(BOARD_DEFINITION);
const INITIAL_BOARD = buildInitialBoard();

export const useGameStore = create<GameState>((set, get) => ({
  boardSize: INITIAL_BOARD.boardSize,
  path: INITIAL_BOARD.path,
  
  gameStatus: 'menu',
  playerIndex: 0,
  targetIndex: 0,
  isMoving: false,
  
  currentRoll: null,
  isRolling: false,
  
  lastMessage: "Bem-vindo!",
  showCustomization: false, 
  roamMode: false, // Start in Follow mode
  zoomLevel: 10, // Default zoom distance (range: 5-60) - lower = closer
  
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
  zoomIn: () => set((state) => ({ zoomLevel: Math.max(5, state.zoomLevel - 5) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.min(60, state.zoomLevel + 5) })),
  
  startGame: () => set({ gameStatus: 'playing', showCustomization: false }),
  setGameStatus: (status) => set({ gameStatus: status }),

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
      showEducationalModal: true,
      currentTileContent: {
        text: tile.text || '',
        color: tile.color || 'blue',
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
      // Small delay before applying effect for visual clarity
      setTimeout(() => {
        get().applyPendingEffect();
      }, 300);
    }
  },
  
  applyPendingEffect: () => {
    const { pendingEffect, playerIndex, path } = get();
    if (!pendingEffect) return;
    
    set({ isApplyingEffect: true, pendingEffect: null });
    
    let newIndex = playerIndex;
    
    if (pendingEffect.advance) {
      newIndex = Math.min(playerIndex + pendingEffect.advance, path.length - 1);
      set({ lastMessage: `Avançou ${pendingEffect.advance} casas! 🎉` });
    } else if (pendingEffect.retreat) {
      newIndex = Math.max(playerIndex - pendingEffect.retreat, 0);
      set({ lastMessage: `Recuou ${pendingEffect.retreat} casas! 😔` });
    }
    
    if (newIndex !== playerIndex) {
      // Animate movement to new position
      set({ 
        isMoving: true,
        targetIndex: newIndex,
      });
      
      // After effect movement completes, just update position (don't show modal again)
      setTimeout(() => {
        set({ 
          isMoving: false,
          playerIndex: newIndex,
          isApplyingEffect: false,
        });
      }, 800);
    } else {
      set({ isApplyingEffect: false });
    }
  },
  
  setShowInfoPanel: (show) => set({ showInfoPanel: show }),
  
  resetGame: () => {
    const nextBoard = buildInitialBoard();
    set({
      gameStatus: 'menu',
      playerIndex: 0,
      targetIndex: 0,
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
      zoomLevel: 15
    });
  }
}));
