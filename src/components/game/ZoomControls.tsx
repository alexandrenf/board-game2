import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export const ZoomControls: React.FC = () => {
  const { zoomIn, zoomOut, zoomLevel } = useGameStore();
  
  const handleZoomIn = () => {
    triggerHaptic('light');
    zoomIn();
  };
  
  const handleZoomOut = () => {
    triggerHaptic('light');
    zoomOut();
  };
  
  // Calculate if we're at limits
  const isMaxZoom = zoomLevel <= 5;
  const isMinZoom = zoomLevel >= 60;
  
  return (
    <View style={styles.zoomControls}>
      <AnimatedButton 
        style={[styles.zoomButton, isMaxZoom && styles.zoomButtonDisabled]} 
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
        style={[styles.zoomButton, isMinZoom && styles.zoomButtonDisabled]} 
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
};

const styles = StyleSheet.create({
  zoomControls: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: '40%',
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.huge,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.cardBorder,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
