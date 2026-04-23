import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ZoomControls = React.memo(function ZoomControls() {
  const zoomIn = useGameStore((s) => s.zoomIn);
  const zoomOut = useGameStore((s) => s.zoomOut);
  const zoomLevel = useGameStore((s) => s.zoomLevel);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  
  const handleZoomIn = () => {
    zoomIn();
  };
  
  const handleZoomOut = () => {
    zoomOut();
  };
  
  // Calculate if we're at limits
  const isMaxZoom = zoomLevel <= 5;
  const isMinZoom = zoomLevel >= 60;
  const availableHeight = height - insets.top - insets.bottom;
  const topOffset = insets.top + Math.max(96, Math.min(availableHeight * 0.34, availableHeight - 220));
  const isCompactHeight = height < 720;
  
  return (
    <View style={[styles.zoomControls, { top: topOffset }, isCompactHeight && styles.zoomControlsCompact]}>
      <AnimatedButton 
        style={[styles.zoomButton, isCompactHeight && styles.zoomButtonCompact, isMaxZoom && styles.zoomButtonDisabled]} 
        onPress={handleZoomIn}
        disabled={isMaxZoom}
        hapticStyle="light"
      >
        <AppIcon
          name="plus"
          size={28}
          color={isMaxZoom ? COLORS.textMuted : COLORS.text}
        />
      </AnimatedButton>
      <View style={styles.zoomDivider} />
      <AnimatedButton 
        style={[styles.zoomButton, isCompactHeight && styles.zoomButtonCompact, isMinZoom && styles.zoomButtonDisabled]} 
        onPress={handleZoomOut}
        disabled={isMinZoom}
        hapticStyle="light"
      >
        <AppIcon
          name="minus"
          size={28}
          color={isMinZoom ? COLORS.textMuted : COLORS.text}
        />
      </AnimatedButton>
    </View>
  );
});

const styles = StyleSheet.create({
  zoomControls: {
    position: 'absolute',
    right: theme.spacing.lg,
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.huge,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.cardBorder,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  zoomControlsCompact: {
    right: theme.spacing.md,
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonCompact: {
    width: 44,
    height: 44,
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: theme.spacing.sm,
  },
});
