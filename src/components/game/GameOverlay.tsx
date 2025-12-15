import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraModeIndicator } from './CameraModeIndicator';
import { CelebrationOverlay } from './CelebrationOverlay';
import { DiceMenu } from './DiceMenu';
import { EducationalModal } from './EducationalModal';
import { InfoPanel } from './InfoPanel';
import { MessageToast } from './MessageToast';
import { SoundToggle } from './SoundToggle';
import { ZoomControls } from './ZoomControls';

export const GameOverlay: React.FC = () => {
  const { 
    lastMessage,
    playerIndex,
    path,
    roamMode,
    setRoamMode,
    setShowCustomization,
    setGameStatus,
    setShowInfoPanel,
  } = useGameStore();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const progress = path.length > 0 ? (playerIndex / (path.length - 1)) * 100 : 0;
  
  // Current tile info
  const currentTile = path[playerIndex];
  const tileVisual = currentTile ? getTileVisual(currentTile.color) : null;
  
  // Check for win condition
  useEffect(() => {
    if (playerIndex === path.length - 1 && path.length > 1) {
      setShowCelebration(true);
    }
  }, [playerIndex, path.length]);

  const handleCameraToggle = () => {
    triggerHaptic('medium');
    setRoamMode(!roamMode);
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Top Bar */}
      <View style={styles.topBar}>
        <AnimatedButton 
          style={styles.backButton}
          onPress={() => {
            triggerHaptic('medium');
            setGameStatus('menu');
          }}
          hapticStyle="medium"
        >
          <AppIcon name="house" size={20} color={COLORS.text} />
        </AnimatedButton>

        <CuteCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>PROGRESSO</Text>
            {tileVisual && (
              <View style={[styles.tileTypeIndicator, { backgroundColor: tileVisual.base }]}>
                <AppIcon name={tileVisual.icon} size={10} color={COLORS.text} />
              </View>
            )}
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.tileText}>{playerIndex}/{path.length - 1}</Text>
          </View>
        </CuteCard>
        
        <AnimatedButton 
          style={styles.infoButton}
          onPress={() => {
            triggerHaptic('light');
            setShowInfoPanel(true);
          }}
          hapticStyle="light"
        >
          <AppIcon name="circle-info" size={18} color={COLORS.text} />
        </AnimatedButton>
      </View>
      
      <MessageToast message={lastMessage} />
      
      {/* Sound Toggle - small floating button */}
      <View style={styles.soundToggleWrapper}>
        <SoundToggle />
      </View>
      
      {/* Zoom Controls - positioned on right side */}
      <ZoomControls />

      {/* Bottom Dock */}
      <View style={styles.bottomDockWrapper} pointerEvents="box-none">
        <CuteCard style={styles.bottomDock}>
          <TouchableOpacity onPress={handleCameraToggle}>
            <CameraModeIndicator isRoamMode={roamMode} />
          </TouchableOpacity>
          
          <DiceMenu />
          
          <AnimatedButton 
            style={styles.dockButton}
            onPress={() => {
              triggerHaptic('light');
              setShowCustomization(true);
            }}
            hapticStyle="light"
          >
            <AppIcon name="shirt" size={18} color={COLORS.text} />
          </AnimatedButton>
        </CuteCard>
      </View>
      
      <CelebrationOverlay 
        visible={showCelebration} 
        onDismiss={() => {
          setShowCelebration(false);
          setGameStatus('menu');
        }} 
      />
      
      {/* Educational Modal */}
      <EducationalModal />
      
      {/* Info Panel */}
      <InfoPanel />
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  tileTypeIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  soundToggleWrapper: {
    position: 'absolute',
    top: 110,
    right: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EFE6DC',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  tileText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  bottomDockWrapper: {
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  dockButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F1EB',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
});
