import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraModeIndicator } from './CameraModeIndicator';
import { CelebrationOverlay } from './CelebrationOverlay';
import { DiceMenu } from './DiceMenu';
import { EducationalModal } from './EducationalModal';
import { InfoPanel } from './InfoPanel';
import { MessageToast } from './MessageToast';
import { TileFocusBanner } from './TileFocusBanner';
import { ZoomControls } from './ZoomControls';

export const GameOverlay: React.FC = () => {
  const { 
    lastMessage,
    playerIndex,
    focusTileIndex,
    path,
    isMoving,
    roamMode,
    hapticsEnabled,
    setRoamMode,
    setHapticsEnabled,
    setShowCustomization,
    setGameStatus,
    setShowInfoPanel,
  } = useGameStore();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: number; text: string; player: string; timestamp: number }[]>([]);
  const historyAnim = useRef(new Animated.Value(0)).current;
  const historyCounter = useRef(0);
  const lastLoggedMessage = useRef<string | null>(null);
  const playHaptic = (style: Parameters<typeof triggerHaptic>[0]) => triggerHaptic(style);
  const progressIndex = isMoving ? focusTileIndex : playerIndex;
  const progress = path.length > 1 ? (progressIndex / (path.length - 1)) * 100 : 0;
  const totalSteps = Math.max(path.length, 1);
  const focusedTile = path[focusTileIndex] || path[playerIndex];
  const historyMaxHeight = Math.max(180, Math.min(320, height - insets.top - insets.bottom - 180));
  const historyPanelWidth = Math.max(220, Math.min(300, width - 24));
  const historySlideOffset = historyPanelWidth + 24;
  const overlayInsets = useMemo(
    () => ({
      paddingTop: insets.top + 8,
      paddingBottom: Math.max(insets.bottom, 12) + 8,
    }),
    [insets.bottom, insets.top]
  );
  
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
    <View style={[styles.overlayContainer, overlayInsets]} pointerEvents="box-none">
      <View style={styles.accentTop} pointerEvents="none" />
      <View style={styles.accentBottom} pointerEvents="none" />
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.leftStack}>
          <AnimatedButton 
            style={styles.backButton}
            onPress={() => {
              setGameStatus('menu');
            }}
            hapticStyle="medium"
            hapticsEnabled={hapticsEnabled}
          >
            <AppIcon name="house" size={20} color={COLORS.text} />
          </AnimatedButton>
          <AnimatedButton
            style={styles.historyButton}
            onPress={() => {
              setShowHistory((prev) => !prev);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsEnabled}
          >
            <AppIcon name="clock-rotate-left" size={16} color={COLORS.text} />
          </AnimatedButton>
        </View>

        <TileFocusBanner
          tile={focusedTile}
          focusIndex={progressIndex}
          totalSteps={totalSteps}
          progress={progress}
          isMoving={isMoving}
          roamMode={roamMode}
        />
        
        <View style={styles.topActions}>
          <AnimatedButton 
            style={styles.infoButton}
            onPress={() => {
              setShowInfoPanel(true);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsEnabled}
          >
            <AppIcon name="circle-info" size={18} color={COLORS.text} />
          </AnimatedButton>
          <AnimatedButton
            style={[styles.hapticButton, !hapticsEnabled && styles.hapticButtonOff]}
            onPress={() => setHapticsEnabled(!hapticsEnabled)}
            hapticStyle="light"
            hapticsEnabled={hapticsEnabled}
          >
            <AppIcon name={hapticsEnabled ? 'vibrate' : 'ban'} size={16} color={COLORS.text} />
          </AnimatedButton>
        </View>
      </View>
      
      <MessageToast message={lastMessage} bottomOffset={Math.max(insets.bottom + 96, 120)} />
      
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
              setShowCustomization(true);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsEnabled}
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
          { top: insets.top + 86, maxHeight: historyMaxHeight, width: historyPanelWidth },
          {
            opacity: historyAnim,
            transform: [
              {
                translateX: historyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [historySlideOffset, 0],
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
  },
  accentTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary, // Solid color for Neobrutalism (no opacity)
    opacity: 0.1,
    zIndex: 0,
  },
  accentBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
    zIndex: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backButton: {
    ...theme.circularButton(42),
    backgroundColor: COLORS.cardBg,
    ...theme.shadows.sm,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    backgroundColor: COLORS.cardBg,
    ...theme.shadows.sm,
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
    backgroundColor: COLORS.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text, // Darker text for Neo
    letterSpacing: 0.5,
  },
  tileTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
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
    ...theme.circularButton(40),
    backgroundColor: COLORS.cardBg,
    ...theme.shadows.sm,
  },
  hapticButton: {
    ...theme.circularButton(40),
    backgroundColor: COLORS.cardBg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    ...theme.shadows.sm,
  },
  hapticButtonOff: {
    opacity: 0.45,
  },
  historyButton: {
    ...theme.circularButton(38),
    backgroundColor: COLORS.cardBg,
    marginTop: 8,
    ...theme.shadows.sm,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 12, // Thicker bar
    backgroundColor: COLORS.background,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 0, // Flat fill
    borderRightWidth: 2,
    borderRightColor: COLORS.text, 
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
    borderRadius: theme.borderRadius.xl,
    backgroundColor: COLORS.cardBg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    ...theme.shadows.md,
  },
  dockButton: {
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    ...theme.shadows.sm,
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
    right: 12,
    width: 260,
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    ...theme.shadows.xl,
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
    flexGrow: 0,
  },
  historyListContent: {
    gap: 10,
    paddingBottom: 6,
  },
  historyItem: {
    backgroundColor: COLORS.background,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
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
