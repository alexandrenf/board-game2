import { create } from 'zustand';

export type Tile = {
  row: number;
  col: number;
  index: number;
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
  
  // Customization
  shirtColor: string;
  hairColor: string;
  
  // Actions
  setShirtColor: (color: string) => void;
  setHairColor: (color: string) => void;
  setShowCustomization: (show: boolean) => void;
  setRoamMode: (roam: boolean) => void;
  startGame: () => void;
  setGameStatus: (status: 'menu' | 'playing') => void;
  rollDice: () => void;
  completeRoll: (value: number) => void;
  finishMovement: () => void;
  resetGame: () => void;
};

// Generate a linear path that moves mostly forward (Z+)
const generateLinearPath = (length: number = 50): Tile[] => {
  const path: Tile[] = [];
  let currentRow = 0;
  let currentCol = 0; // Start at center-ish? Let's start at 0,0 and expand board as needed.
  
  // We'll use a dynamic board size conceptually, but map to grid coordinates.
  // Let's assume the board is infinite or large enough.
  
  path.push({ row: currentRow, col: currentCol, index: 0 });
  
  let direction = 0; // 0: Forward (Row+), 1: Right (Col+), 2: Left (Col-)
  
  for (let i = 1; i < length; i++) {
    const r = Math.random();
    
    // Bias heavily towards moving forward
    if (direction === 0) {
      // We are moving forward.
      // 70% chance to continue forward
      // 15% turn right
      // 15% turn left
      if (r < 0.7) {
        currentRow++;
      } else if (r < 0.85) {
        currentCol++;
        direction = 1;
      } else {
        currentCol--;
        direction = 2;
      }
    } else {
      // We are moving sideways.
      // 60% chance to turn forward again
      // 40% continue sideways
      if (r < 0.6) {
        currentRow++;
        direction = 0;
      } else {
        if (direction === 1) currentCol++;
        else currentCol--;
      }
    }
    
    path.push({ row: currentRow, col: currentCol, index: i });
  }
  
  return path;
};

// We need a large board to accommodate the linear path
const ROWS = 60;
const COLS = 20; // Virtual width
const INITIAL_PATH = generateLinearPath(50);

export const useGameStore = create<GameState>((set, get) => ({
  boardSize: { rows: ROWS, cols: COLS },
  path: INITIAL_PATH,
  
  gameStatus: 'menu',
  playerIndex: 0,
  targetIndex: 0,
  isMoving: false,
  
  currentRoll: null,
  isRolling: false,
  
  lastMessage: "Bem-vindo!",
  showCustomization: false, 
  roamMode: false, // Start in Follow mode
  
  shirtColor: '#ff5555',
  hairColor: '#4a3b2a', 
  
  setShirtColor: (color) => set({ shirtColor: color }),
  setHairColor: (color) => set({ hairColor: color }),
  setShowCustomization: (show) => set({ showCustomization: show }),
  setRoamMode: (roam) => set({ roamMode: roam }),
  
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
    set({
      gameStatus: 'menu',
      playerIndex: 0,
      targetIndex: 0,
      currentRoll: null,
      isMoving: false,
      isRolling: false,
      lastMessage: "Jogo Reiniciado.",
      path: generateLinearPath(50),
      showCustomization: false,
      roamMode: false
    });
  }
}));
