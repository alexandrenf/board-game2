import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { Tile } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraModeIndicator } from './CameraModeIndicator';
import { DiceMenu } from './DiceMenu';
import { MessageToast } from './MessageToast';
import { TileFocusBanner } from './TileFocusBanner';
import { ZoomControls } from './ZoomControls';

export type GamePlayingHUDHistoryEntry = {
  id: string | number;
  text: string;
  player: string;
  timestamp: number;
};

type GamePlayingHUDProps = {
  playerIndex: number;
  focusTileIndex: number;
  totalSteps: number;
  tile?: Tile;
  isMoving: boolean;
  lastMessage: string | null;
  roamMode: boolean;
  hapticsEnabled: boolean;
  showEducationalModal?: boolean;
  onMenuPress: () => void;
  onHelpPress: () => void;
  onSettingsPress: () => void;
  onToggleCamera: () => void;
  onCharacterPress?: () => void;
  characterButtonLabel?: string;
  characterButtonIcon?: string;
  characterButtonDisabled?: boolean;
  characterButtonTestID?: string;
  canRoll?: boolean;
  isRolling?: boolean;
  onRoll?: () => void;
  rollIdleLabel?: string;
  rollRollingLabel?: string;
  rollDisabledLabel?: string;
  rollTestID?: string;
  historyEntries?: GamePlayingHUDHistoryEntry[];
  historyActorLabel?: string;
  scoreboardPlayers?: { id: string; name: string; points: number; isMe?: boolean }[];
  onEducationalModalShown?: () => void;
  quizPhase?: 'idle' | 'answering' | 'feedback';
};

export const GamePlayingHUD: React.FC<GamePlayingHUDProps> = ({
  playerIndex,
  focusTileIndex,
  totalSteps,
  tile,
  isMoving,
  lastMessage,
  roamMode,
  hapticsEnabled,
  showEducationalModal = false,
  onMenuPress,
  onHelpPress,
  onSettingsPress,
  onToggleCamera,
  onCharacterPress,
  characterButtonLabel = 'Personagem',
  characterButtonIcon = 'shirt',
  characterButtonDisabled = false,
  characterButtonTestID = 'btn-open-customization',
  canRoll,
  isRolling,
  onRoll,
  rollIdleLabel,
  rollRollingLabel,
  rollDisabledLabel,
  rollTestID = 'btn-roll-dice',
  historyEntries,
  historyActorLabel = 'Voce',
  scoreboardPlayers,
  onEducationalModalShown,
  quizPhase = 'idle',
}) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const [showHistory, setShowHistory] = useState(false);
  const [topSlotHeight, setTopSlotHeight] = useState(206);
  const [derivedHistory, setDerivedHistory] = useState<GamePlayingHUDHistoryEntry[]>([]);
  const historyAnim = useRef(new Animated.Value(0)).current;
  const historyCounter = useRef(0);
  const lastLoggedMessage = useRef<string | null>(null);

  const progressIndex = isMoving ? focusTileIndex : playerIndex;
  const progress = totalSteps > 1 ? (progressIndex / (totalSteps - 1)) * 100 : 0;

  const historyMaxHeight = Math.max(180, Math.min(320, height - insets.top - insets.bottom - 220));
  const historyPanelWidth = Math.max(220, Math.min(310, width - 24));
  const historySlideOffset = historyPanelWidth + 24;
  const historyTopOffset = Math.max(110, topSlotHeight + 8);

  const overlayInsets = useMemo(
    () => ({
      paddingTop: insets.top + 8,
      paddingBottom: Math.max(insets.bottom, 12) + 8,
    }),
    [insets.bottom, insets.top]
  );

  const resolvedHistory = historyEntries ?? derivedHistory;

  useEffect(() => {
    if (historyEntries) return;
    if (!lastMessage || lastMessage === lastLoggedMessage.current) return;

    if (lastMessage.includes('Rolando')) {
      lastLoggedMessage.current = lastMessage;
      return;
    }

    const entry = {
      id: historyCounter.current++,
      text: lastMessage,
      player: historyActorLabel,
      timestamp: Date.now(),
    };

    setDerivedHistory((previous) => {
      if (lastMessage.includes('Tirou') && previous[0]?.text.includes('Rolando')) {
        return [{ ...entry, id: previous[0].id }, ...previous.slice(1)].slice(0, 40);
      }
      return [entry, ...previous].slice(0, 40);
    });

    lastLoggedMessage.current = lastMessage;
  }, [historyActorLabel, historyEntries, lastMessage]);

  useEffect(() => {
    Animated.spring(historyAnim, {
      toValue: showHistory ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [historyAnim, showHistory]);

  useEffect(() => {
    if (!showEducationalModal) return;
    if (showHistory) {
      setShowHistory(false);
    }
    onEducationalModalShown?.();
  }, [onEducationalModalShown, showEducationalModal, showHistory]);

  const historyPointerEvents = showHistory && !showEducationalModal ? 'auto' : 'none';
  const canUseCharacterAction = Boolean(onCharacterPress) && !characterButtonDisabled;

  return (
    <View style={[styles.overlayContainer, overlayInsets]}>
      <View style={styles.accentTop} />
      <View style={styles.accentBottom} />

      <View
        style={styles.topSlot}
        onLayout={(event) => {
          setTopSlotHeight(event.nativeEvent.layout.height);
        }}
      >
        {!showEducationalModal ? (
          <View style={styles.topBar}>
            <View style={styles.topActionsRow}>
              <AnimatedButton
                style={styles.topActionButton}
                testID="btn-home-menu"
                onPress={onMenuPress}
                hapticStyle="medium"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel="Voltar ao menu"
                accessibilityHint="Retorna para a tela principal"
              >
                <View style={styles.topActionButtonContent}>
                  <AppIcon name="house" size={15} color={COLORS.text} />
                  <Text style={styles.topActionText}>Menu</Text>
                </View>
              </AnimatedButton>

              <AnimatedButton
                style={styles.topActionButton}
                testID="btn-open-info-panel"
                onPress={onHelpPress}
                hapticStyle="light"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel="Abrir ajuda"
              >
                <View style={styles.topActionButtonContent}>
                  <AppIcon name="circle-question" size={15} color={COLORS.text} />
                  <Text style={styles.topActionText}>Ajuda</Text>
                </View>
              </AnimatedButton>

              <AnimatedButton
                style={styles.topActionButton}
                testID="btn-history-toggle"
                onPress={() => {
                  setShowHistory((previous) => !previous);
                }}
                hapticStyle="light"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel="Abrir historico"
              >
                <View style={styles.topActionButtonContent}>
                  <AppIcon name="clock-rotate-left" size={15} color={COLORS.text} />
                  <Text style={styles.topActionText}>Historico</Text>
                </View>
              </AnimatedButton>

              <AnimatedButton
                style={styles.topActionButton}
                testID="btn-open-settings-panel"
                onPress={onSettingsPress}
                hapticStyle="light"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel="Abrir ajustes"
              >
                <View style={styles.topActionButtonContent}>
                  <AppIcon name="sliders" size={15} color={COLORS.text} />
                  <Text style={styles.topActionText}>Ajustes</Text>
                </View>
              </AnimatedButton>
            </View>

            {scoreboardPlayers && scoreboardPlayers.length > 0 ? (
              <View style={styles.scoreboardRow}>
                {scoreboardPlayers.map((player) => (
                  <View key={player.id} style={[styles.scorePill, player.isMe && styles.scorePillMe]}>
                    <Text style={styles.scoreName} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={styles.scorePoints}>{player.points} pts</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.tileBannerContainer}>
              <TileFocusBanner
                tile={tile}
                focusIndex={progressIndex}
                totalSteps={Math.max(totalSteps, 1)}
                progress={progress}
                isMoving={isMoving}
                roamMode={roamMode}
                quizPhase={quizPhase}
              />
            </View>
          </View>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      {!showEducationalModal && (
        <MessageToast message={lastMessage} bottomOffset={Math.max(insets.bottom + 96, 120)} />
      )}

      <ZoomControls />

      <View style={styles.bottomDockWrapper}>
        <CuteCard style={styles.bottomDock}>
          <AnimatedButton
            onPress={onToggleCamera}
            hapticStyle="medium"
            hapticsEnabled={hapticsEnabled}
            accessibilityRole="button"
            accessibilityLabel="Alternar modo de camera"
          >
            <CameraModeIndicator isRoamMode={roamMode} />
          </AnimatedButton>

          <DiceMenu
            canRoll={canRoll}
            isRolling={isRolling}
            onRoll={onRoll}
            idleLabel={rollIdleLabel}
            rollingLabel={rollRollingLabel}
            disabledLabel={rollDisabledLabel}
            testID={rollTestID}
          />

          <AnimatedButton
            style={[styles.dockButton, characterButtonDisabled && styles.dockButtonDisabled]}
            testID={characterButtonTestID}
            onPress={onCharacterPress ?? (() => {})}
            disabled={!canUseCharacterAction}
            hapticStyle="light"
            hapticsEnabled={hapticsEnabled}
            accessibilityLabel={characterButtonLabel}
          >
            <View style={styles.dockButtonContent}>
              <AppIcon
                name={characterButtonIcon}
                size={18}
                color={characterButtonDisabled ? COLORS.textMuted : COLORS.text}
              />
              <Text style={[styles.dockButtonText, characterButtonDisabled && styles.dockButtonTextDisabled]}>
                {characterButtonLabel}
              </Text>
            </View>
          </AnimatedButton>
        </CuteCard>
      </View>

      <Animated.View
        pointerEvents={historyPointerEvents}
        style={[
          styles.historyPanel,
          {
            top: historyTopOffset,
            maxHeight: historyMaxHeight,
            width: historyPanelWidth,
          },
          {
            opacity: showEducationalModal ? 0 : historyAnim,
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
            <AppIcon name="clock-rotate-left" size={14} color={COLORS.text} />
            <Text style={styles.historyTitle}>Historico da Partida</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowHistory(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Fechar historico"
          >
            <AppIcon name="xmark" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.historyList} contentContainerStyle={styles.historyListContent}>
          {resolvedHistory.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyMeta}>
                <Text style={styles.historyPlayer}>{entry.player}</Text>
                <Text style={styles.historyTime}>
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.historyText}>{entry.text}</Text>
            </View>
          ))}
          {resolvedHistory.length === 0 && (
            <Text style={styles.historyEmpty}>Sem atualizacoes ainda.</Text>
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
    pointerEvents: 'box-none',
  },
  accentTop: {
    position: 'absolute',
    top: -70,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary,
    opacity: 0.18,
    zIndex: 0,
    pointerEvents: 'none',
  },
  accentBottom: {
    position: 'absolute',
    bottom: -50,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.secondary,
    opacity: 0.18,
    zIndex: 0,
    pointerEvents: 'none',
  },
  topSlot: {
    width: '100%',
    pointerEvents: 'box-none',
  },
  topBar: {
    paddingHorizontal: 12,
  },
  topBarSpacer: {
    height: 206,
    pointerEvents: 'none',
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
    marginBottom: Platform.OS === 'web' ? 4 : 14,
  },
  tileBannerContainer: {
    zIndex: 1,
  },
  topActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    backgroundColor: COLORS.cardBg,
    ...theme.shadows.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  topActionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  topActionText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  scoreboardRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  scorePill: {
    maxWidth: 138,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
    backgroundColor: '#FFF8EE',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  scorePillMe: {
    borderColor: '#8A6744',
    backgroundColor: '#FAE8A4',
  },
  scoreName: {
    maxWidth: 80,
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
    flexShrink: 1,
  },
  scorePoints: {
    fontSize: 10,
    fontWeight: '900',
    color: '#5B351E',
  },
  bottomDockWrapper: {
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 390,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: '#FFF5EB',
    borderWidth: theme.borderWidth.normal,
    borderColor: '#C4956A',
    ...theme.shadows.md,
  },
  dockButton: {
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#C4956A',
    ...theme.shadows.sm,
  },
  dockButtonDisabled: {
    backgroundColor: '#F0E1CC',
    borderColor: '#D7B48E',
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
  dockButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  historyPanel: {
    position: 'absolute',
    right: 12,
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
    letterSpacing: 0.3,
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
