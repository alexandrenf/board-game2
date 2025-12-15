// ============================================
// GAME CONSTANTS - Single Source of Truth
// ============================================

// Board & Tiles
export const TILE_SIZE = 1;
export const GAP = 0.1;
export const CELL_SIZE = TILE_SIZE + GAP;

// Player Movement
export const MOVE_SPEED = 2.5;

// Camera Controls
export const CAMERA = {
  MIN_DISTANCE: 8,
  MAX_DISTANCE: 50,
  MIN_POLAR: 0.3,
  MAX_POLAR: Math.PI / 2.2,
  DEFAULT_ZOOM: 10,
  MIN_ZOOM: 5,
  MAX_ZOOM: 60,
} as const;

// ============================================
// 3D GAME COLORS - Environment & Effects
// ============================================
export const COLORS = {
  // Path tiles - warm and inviting
  pathPrimary: '#E8B896',      // Warm peach
  pathSecondary: '#FFF5EB',    // Soft cream
  pathStart: '#7DD87D',        // Fresh green
  pathEnd: '#FFB86C',          // Golden orange
  
  // Environment - lush and cozy
  grass: '#8CD790',            // Vibrant soft green
  grassDark: '#6BB870',        // Rich grass shadow
  grassHighlight: '#A8E6CF',   // Grass highlight
  
  // Decorations - charming
  treeTrunk: '#9B7653',        // Warm brown
  treeLeaves: '#7DD87D',       // Fresh green
  treeLeavesAlt: '#A8E6CF',    // Light mint green
  treeLeavesHighlight: '#C8F7C5', // Leaf highlight
  rock: '#A0A4B8',             // Soft purple-gray
  rockDark: '#7A7E92',         // Rock shadow
  rockHighlight: '#C0C4D8',    // Rock highlight
  
  // UI and effects
  outline: '#5D4E6D',          // Deep purple for outlines
  glow: '#FFE066',             // Warm glow
  glowSecondary: '#FF9F89',    // Coral glow
  shimmer: '#FFFAF0',          // Shimmer white
  
  // Accent colors for effects
  accentPink: '#FFB3BA',       // Soft pink
  accentBlue: '#BAE1FF',       // Sky blue
  accentPurple: '#E2B6FF',     // Lavender
  accentYellow: '#FFE066',     // Sunny yellow
  
  // Shadow colors (for blob shadows)
  shadowPrimary: '#2D1B4E',    // Deep purple shadow
  shadowSecondary: '#1A0F2E',  // Darker shadow
};

// Player Character Colors (default values)
export const PLAYER_COLORS = {
  skin: '#FFD5B8',
  outline: '#4A3B5C',
  pants: '#4A5568',
  shoes: '#2D3748',
};
