import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
        <Text style={[styles.zoomButtonText, isMaxZoom && styles.zoomButtonTextDisabled]}>+</Text>
      </AnimatedButton>
      <View style={styles.zoomDivider} />
      <AnimatedButton 
        style={[styles.zoomButton, isMinZoom && styles.zoomButtonDisabled]} 
        onPress={handleZoomOut}
        disabled={isMinZoom}
        hapticStyle="light"
      >
        <Text style={[styles.zoomButtonText, isMinZoom && styles.zoomButtonTextDisabled]}>−</Text>
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
  zoomButtonText: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: COLORS.text,
  },
  zoomButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: theme.spacing.sm,
  },
});
