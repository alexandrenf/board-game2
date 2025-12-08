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
  
  // Player State
  playerIndex: number; // Index in the path array
  isMoving: boolean;
  
  // Dice State
  currentRoll: number | null;
  isRolling: boolean;
  
  // UI State
  lastMessage: string | null;
  
  // Customization
  shirtColor: string;
  hairColor: string;
  
  // Actions
  setShirtColor: (color: string) => void;
  setHairColor: (color: string) => void;
  rollDice: () => void;
  completeRoll: (value: number) => void;
  moveStep: () => void; // Moves one step forward
  finishMovement: () => void;
  resetGame: () => void;
};

// Generate a simple snake path for an 8x8 board
const generateSnakePath = (rows: number, cols: number): Tile[] => {
  const path: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) {
      // Left to Right
      for (let c = 0; c < cols; c++) {
        path.push({ row: r, col: c, index: path.length });
      }
    } else {
      // Right to Left
      for (let c = cols - 1; c >= 0; c--) {
        path.push({ row: r, col: c, index: path.length });
      }
    }
  }
  return path;
};

const ROWS = 8;
const COLS = 8;
const INITIAL_PATH = generateSnakePath(ROWS, COLS);

export const useGameStore = create<GameState>((set, get) => ({
  boardSize: { rows: ROWS, cols: COLS },
  path: INITIAL_PATH,
  
  playerIndex: 0,
  isMoving: false,
  
  currentRoll: null,
  isRolling: false,
  
  lastMessage: "Welcome! Roll the dice to start.",
  
  shirtColor: '#ff5555',
  hairColor: '#4a3b2a', // Dark brown
  
  setShirtColor: (color) => set({ shirtColor: color }),
  setHairColor: (color) => set({ hairColor: color }),
  
  rollDice: () => {
    const { isRolling, isMoving } = get();
    if (isRolling || isMoving) return;
    
    set({ isRolling: true, lastMessage: "Rolling..." });
  },
  
  completeRoll: (value) => {
    set({ 
      isRolling: false, 
      currentRoll: value, 
      isMoving: true,
      lastMessage: `Rolled a ${value}!`
    });
  },
  
  moveStep: () => {
    const { playerIndex, path, currentRoll } = get();
    // Logic is handled by the component driving the animation usually, 
    // but here we update state.
    // Actually, for smooth animation, we might want to just update the target index
    // and let the 3D component handle the interpolation, but the prompt asks for 
    // "discrete tile hops".
    
    // We will increment playerIndex.
    // The loop logic will be driven by the 3D component or a useEffect in the manager.
    // Here we just provide a simple setter.
    
    if (playerIndex < path.length - 1) {
      set({ playerIndex: playerIndex + 1 });
    }
  },
  
  finishMovement: () => {
    const { playerIndex } = get();
    set({ 
      isMoving: false, 
      lastMessage: `Landed on tile ${playerIndex}. Effect coming soon...` 
    });
  },
  
  resetGame: () => {
    set({
      playerIndex: 0,
      currentRoll: null,
      isMoving: false,
      isRolling: false,
      lastMessage: "Game Reset.",
    });
  }
}));
