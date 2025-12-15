import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraModeIndicator } from './CameraModeIndicator';
import { CelebrationOverlay } from './CelebrationOverlay';
import { DiceMenu } from './DiceMenu';
import { EducationalModal } from './EducationalModal';
import { InfoPanel } from './InfoPanel';
import { MessageToast } from './MessageToast';
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
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: number; text: string; player: string; timestamp: number }[]>([]);
  const historyAnim = useRef(new Animated.Value(0)).current;
  const historyCounter = useRef(0);
  const lastLoggedMessage = useRef<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const playHaptic = (style: Parameters<typeof triggerHaptic>[0]) => {
    if (hapticsOn) triggerHaptic(style);
  };
  const progress = path.length > 1 ? (playerIndex / (path.length - 1)) * 100 : 0;
  const currentStep = Math.min(playerIndex + 1, path.length || 1);
  const totalSteps = Math.max(path.length, 1);
  
  // Current tile info
  const currentTile = path[playerIndex];
  const tileVisual = currentTile ? getTileVisual(currentTile.color) : null;
  
  // Check for win condition
  useEffect(() => {
    if (playerIndex === path.length - 1 && path.length > 1) {
      setShowCelebration(true);
    }
  }, [playerIndex, path.length]);

  useEffect(() => {
    if (lastMessage && lastMessage !== lastLoggedMessage.current) {
      const entry = {
        id: historyCounter.current++,
        text: lastMessage,
        player: 'Você',
        timestamp: Date.now(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 40));
      lastLoggedMessage.current = lastMessage;
    }
  }, [lastMessage]);

  useEffect(() => {
    Animated.spring(historyAnim, {
      toValue: showHistory ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [showHistory, historyAnim]);

  const formattedHistory = useMemo(() => history, [history]);

  const handleCameraToggle = () => {
    playHaptic('medium');
    setRoamMode(!roamMode);
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <View style={styles.accentTop} pointerEvents="none" />
      <View style={styles.accentBottom} pointerEvents="none" />
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.leftStack}>
          <AnimatedButton 
            style={styles.backButton}
            onPress={() => {
              playHaptic('medium');
              setGameStatus('menu');
            }}
            hapticStyle="medium"
            hapticsEnabled={hapticsOn}
          >
            <AppIcon name="house" size={20} color={COLORS.text} />
          </AnimatedButton>
          <AnimatedButton
            style={styles.historyButton}
            onPress={() => {
              playHaptic('light');
              setShowHistory((prev) => !prev);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsOn}
          >
            <AppIcon name="clock-rotate-left" size={16} color={COLORS.text} />
          </AnimatedButton>
        </View>

        <CuteCard style={styles.statsCard}>
          <View style={styles.statsHeaderRow}>
            <View style={styles.badgePill}>
              <AppIcon name="gauge-high" size={12} color={COLORS.text} />
              <Text style={styles.badgeText}>{progress >= 100 ? 'Concluído' : 'Em progresso'}</Text>
            </View>
            {tileVisual && (
              <View style={[styles.tileTypeIndicator, { backgroundColor: tileVisual.base }]}>
                <AppIcon name={tileVisual.icon} size={12} color={COLORS.text} />
                <Text style={styles.tileTypeLabel}>{tileVisual.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileHeadline} numberOfLines={2}>
            {currentTile?.text || 'Explore o tabuleiro e avance conhecendo cada casa.'}
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressMetaRow}>
              <Text style={styles.statsLabel}>PROGRESSO</Text>
              <Text style={styles.tileText}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressMetaRow}>
              <Text style={styles.tileSubtle}>Casa {currentStep} de {totalSteps}</Text>
              {tileVisual && (
                <Text style={styles.tileSubtle}>{tileVisual.effectLabel}</Text>
              )}
            </View>
          </View>
        </CuteCard>
        
        <View style={styles.topActions}>
          <AnimatedButton 
            style={styles.infoButton}
            onPress={() => {
              playHaptic('light');
              setShowInfoPanel(true);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsOn}
          >
            <AppIcon name="circle-info" size={18} color={COLORS.text} />
          </AnimatedButton>
          <View style={styles.togglePill}>
            <TouchableOpacity
              style={[styles.toggleButton, !soundOn && styles.toggleButtonOff]}
              onPress={() => {
                playHaptic('light');
                setSoundOn(!soundOn);
              }}
            >
              <AppIcon name={soundOn ? 'volume-high' : 'volume-xmark'} size={14} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.toggleDivider} />
            <TouchableOpacity
              style={[styles.toggleButton, !hapticsOn && styles.toggleButtonOff]}
              onPress={() => {
                if (!hapticsOn) triggerHaptic('light');
                setHapticsOn(!hapticsOn);
              }}
            >
              <AppIcon name="vibrate" size={14} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
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
              playHaptic('light');
              setShowCustomization(true);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsOn}
          >
            <View style={styles.dockButtonContent}>
              <AppIcon name="shirt" size={18} color={COLORS.text} />
              <Text style={styles.dockButtonText}>Avatar</Text>
            </View>
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

      {/* History Panel */}
      <Animated.View
        pointerEvents={showHistory ? 'auto' : 'none'}
        style={[
          styles.historyPanel,
          {
            opacity: historyAnim,
            transform: [
              {
                translateX: historyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [260, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.historyHeader}>
          <View style={styles.historyHeaderRow}>
            <AppIcon name="book-open" size={14} color={COLORS.text} />
            <Text style={styles.historyTitle}>Histórico</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              playHaptic('light');
              setShowHistory(false);
            }}
          >
            <AppIcon name="xmark" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.historyList}
          contentContainerStyle={styles.historyListContent}
          showsVerticalScrollIndicator={true}
        >
          {formattedHistory.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyMeta}>
                <Text style={styles.historyPlayer}>{entry.player}</Text>
                <Text style={styles.historyTime}>
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.historyText}>{entry.text}</Text>
            </View>
          ))}
          {formattedHistory.length === 0 && (
            <Text style={styles.historyEmpty}>Sem atualizações ainda.</Text>
          )}
        </ScrollView>
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 28,
  },
  accentTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(247, 147, 30, 0.12)',
    zIndex: 0,
  },
  accentBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(236, 0, 140, 0.1)',
    zIndex: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF8EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F0E4D7',
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E4D7',
  },
  leftStack: {
    gap: 8,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF1DF',
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  tileTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tileTypeLabel: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  tileHeadline: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F0E4D7',
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F0E4D7',
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toggleButtonOff: {
    opacity: 0.4,
  },
  toggleDivider: {
    width: 1,
    backgroundColor: '#E8DCCE',
    alignSelf: 'stretch',
  },
  historyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF8EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F0E4D7',
    marginTop: 8,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3E9DD',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  tileSubtle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  bottomDockWrapper: {
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 380,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  dockButton: {
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F1EB',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  dockButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dockButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  historyPanel: {
    position: 'absolute',
    top: 130,
    right: 12,
    width: 260,
    maxHeight: 320,
    backgroundColor: '#FFFCF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E4D7',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    padding: 12,
    zIndex: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  historyList: {
    maxHeight: 280,
  },
  historyListContent: {
    gap: 10,
    paddingBottom: 6,
  },
  historyItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0E4D7',
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyPlayer: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  historyTime: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  historyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 17,
  },
  historyEmpty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
