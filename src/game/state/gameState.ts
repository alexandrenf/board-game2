import { create } from 'zustand';
import boardData from '@/assets/board.json';

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

type BoardConfig = {
  board: {
    id: string;
    flow?: string;
    startTile?: number;
    endTile?: number;
    rules?: Record<string, unknown>;
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
    const { targetIndex } = get();
    set({ 
      isMoving: false, 
      playerIndex: targetIndex, 
      lastMessage: `Chegou na casa ${targetIndex}.` 
    });
  },
  
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
      roamMode: false,
      zoomLevel: 15
    });
  }
}));
