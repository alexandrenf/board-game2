import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraModeIndicator } from './CameraModeIndicator';
import { CelebrationOverlay } from './CelebrationOverlay';
import { DiceMenu } from './DiceMenu';
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
    setGameStatus
  } = useGameStore();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const progress = path.length > 0 ? (playerIndex / (path.length - 1)) * 100 : 0;
  
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
          <Text style={styles.backButtonText}>🏠</Text>
        </AnimatedButton>

        <CuteCard style={styles.statsCard}>
          <Text style={styles.statsLabel}>PROGRESSO</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.tileText}>{playerIndex}/{path.length - 1}</Text>
          </View>
        </CuteCard>
        
        <SoundToggle />
      </View>
      
      <MessageToast message={lastMessage} />
      
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
            <Text style={styles.dockIcon}>👕</Text>
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
  backButtonText: {
    fontSize: 20,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 4,
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
  dockIcon: { fontSize: 20 },
});
