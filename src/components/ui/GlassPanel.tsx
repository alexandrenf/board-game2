import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { GLASS } from '@/src/constants/colors';

type GlassIntensity = 'light' | 'regular' | 'strong';

type GlassPanelProps = {
  intensity?: GlassIntensity;
  radius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
};

const INTENSITY_MAP: Record<GlassIntensity, { tint: 'light' | 'default' | 'dark'; intensity: number; bg: string }> = {
  light: { tint: 'light', intensity: 20, bg: GLASS.lightBg },
  regular: { tint: 'light', intensity: 40, bg: GLASS.regularBg },
  strong: { tint: 'default', intensity: 60, bg: GLASS.strongBg },
};

const WEB_BLUR_MAP: Record<GlassIntensity, string> = {
  light: 'blur(8px)',
  regular: 'blur(16px)',
  strong: 'blur(24px)',
};

/**
 * Glassmorphic panel primitive per Design.md spec.
 * Uses expo-blur BlurView on native, backdrop-filter on web.
 * Falls back to translucent background if blur is unsupported.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  intensity = 'regular',
  radius = 16,
  style,
  children,
}) => {
  const config = INTENSITY_MAP[intensity];

  if (Platform.OS === 'web') {
    return (
      <View
        testID="glass-panel-web"
        style={[
          styles.base,
          {
            borderRadius: radius,
            backgroundColor: config.bg,
            borderColor: GLASS.border,
            borderWidth: 1.5,
            backdropFilter: WEB_BLUR_MAP[intensity],
          } as ViewStyle & { backdropFilter?: string },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      tint={config.tint}
      intensity={config.intensity}
      style={[
        styles.base,
        {
          borderRadius: radius,
          borderColor: GLASS.border,
          borderWidth: 1.5,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: config.bg }]} />
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  base: {
    // No default background — set per platform branch
  },
});
