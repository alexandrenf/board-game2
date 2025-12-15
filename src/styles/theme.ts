import { COLORS } from '../constants/colors';

/**
 * Centralized Theme System
 * Single source of truth for all UI styling tokens
 */

// ============================================
// SPACING
// ============================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius = {
  xs: 4,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  xxxl: 22,
  huge: 24,
  massive: 28,
  ultra: 30,
  mega: 32,
  full: 9999,
  circle: (size: number) => size / 2,
} as const;

// ============================================
// BORDER WIDTH
// ============================================
export const borderWidth = {
  thin: 2,
  normal: 3,     // Thicker default border
  thick: 4,
  heavy: 5,
} as const;

// ============================================
// SHADOWS (Hard, directional)
// ============================================
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  xl: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  fontSize: {
    xs: 9,
    sm: 10,
    base: 11,
    md: 12,
    lg: 13,
    xl: 14,
    xxl: 15,
    h6: 16,
    h5: 20,
    h4: 24,
    h3: 32,
    h2: 36,
    h1: 42,
  },
  letterSpacing: {
    tight: 0.3,
    normal: 0.5,
    wide: 1,
    wider: 2,
  },
} as const;

// ============================================
// COMMON STYLES
// ============================================

/**
 * Reusable button style getter
 */
export const getButtonStyle = (variant: 'primary' | 'secondary' | 'outline' = 'primary') => {
  const base = {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: borderWidth.normal,
  };

  switch (variant) {
    case 'primary':
      return {
        ...base,
        backgroundColor: COLORS.primary,
        borderColor: COLORS.text,
        ...shadows.md,
      };
    case 'secondary':
      return {
        ...base,
        backgroundColor: COLORS.cardBg,
        borderColor: COLORS.cardBorder,
        ...shadows.sm,
      };
    case 'outline':
      return {
        ...base,
        backgroundColor: 'transparent',
        borderColor: COLORS.cardBorder,
      };
  }
};

/**
 * Reusable card style
 */
export const card = {
  backgroundColor: COLORS.cardBg,
  borderRadius: borderRadius.lg, // Slightly tighter radius for punchy look
  padding: spacing.md,
  borderWidth: borderWidth.normal,
  borderColor: COLORS.text, // Always black border
  ...shadows.md,
};

/**
 * Reusable circular button style
 */
export const circularButton = (size: number = 44) => ({
  width: size,
  height: size,
  borderRadius: borderRadius.circle(size),
  backgroundColor: COLORS.cardBg,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  borderWidth: borderWidth.normal,
  borderColor: COLORS.cardBorder,
});

/**
 * Reusable input style
 */
export const input = {
  borderRadius: borderRadius.md,
  borderWidth: borderWidth.normal,
  borderColor: COLORS.cardBorder,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  backgroundColor: COLORS.cardBg,
  color: COLORS.text,
  fontSize: typography.fontSize.xl,
};

// ============================================
// EXPORT THEME OBJECT
// ============================================
export const theme = {
  colors: COLORS,
  spacing,
  borderRadius,
  borderWidth,
  shadows,
  typography,
  // Helper functions
  getButtonStyle,
  card,
  circularButton,
  input,
} as const;

export default theme;
