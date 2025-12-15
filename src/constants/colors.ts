// ============================================
// JUVENTUDE PROTAGONISTA - Brand Color Palette
// ============================================

// Rainbow stripe colors from logo
export const BRAND = {
  orange: '#F7931E',
  pink: '#EC008C',
  red: '#ED1C24',
  purple: '#662D91',
  blue: '#006BB6',
  green: '#009444',
  teal: '#00A99D',
} as const;

// Main UI color system
export const COLORS = {
  // Primary branding (from logo)
  primary: '#F7931E',      // Vibrant orange
  secondary: '#EC008C',    // Hot pink
  accent: '#009444',       // Fresh green
  
  // Backgrounds
  background: '#F5F5F5',   // Light grey (from logo background)
  cardBg: '#FFFFFF',
  cardBorder: '#E0E0E0',
  
  // Text
  text: '#1A1A1A',         // Near black (logo text)
  textMuted: '#666666',    // Medium grey
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.12)',
  
  // Semantic colors
  success: '#009444',      // Green from brand
  warning: '#F7931E',      // Orange from brand
  danger: '#ED1C24',       // Red from brand
  info: '#006BB6',         // Blue from brand
  
  // Accents
  gold: '#F6D66B',
  purple: '#662D91',       // Purple from brand
  teal: '#00A99D',         // Teal from brand
  
  // Gradient stops (for rainbow effects)
  gradientStart: '#F7931E',
  gradientMid: '#EC008C',
  gradientEnd: '#006BB6',
};

// Tile-specific colors (matching physical game)
export const TILE_COLORS = {
  red: '#E53E3E',
  green: '#38A169',
  blue: '#4299E1',
  yellow: '#ECC94B',
} as const;
