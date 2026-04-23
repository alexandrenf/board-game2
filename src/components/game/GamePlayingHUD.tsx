import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { BRAND, COLORS } from '@/src/constants/colors';
import { Tile } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

// ─────────────────────────────────────────────
// Turn indicator: pulsing glow border on the bottom dock when player can act
// ─────────────────────────────────────────────
const TurnIndicatorGlow: React.FC<{ active: boolean }> = ({ active }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      pulse.setValue(0);
    }
    return () => {
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, [active, pulse]);

  if (!active) return null;

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: theme.borderRadius.xl,
          borderWidth: 3,
          borderColor: BRAND.orange,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

// ─────────────────────────────────────────────
// Breathing wrapper for actionable buttons
// ─────────────────────────────────────────────
const BreathingWrapper: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
  const breathe = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.04, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      breathe.setValue(1);
    }
    return () => {
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, [active, breathe]);

  return (
    <Animated.View style={{ transform: [{ scale: breathe }] }}>
      {children}
    </Animated.View>
  );
};

/** Single entry displayed in the session history panel. */
export type GamePlayingHUDHistoryEntry = {
  id: string | number;
  text: string;
  player: string;
  timestamp: number;
};

/** Props for the {@link GamePlayingHUD} component. */
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

/** In-game HUD showing tile info, controls, dice menu, messages, and session history. */
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
  historyActorLabel = 'Você',
  scoreboardPlayers,
  onEducationalModalShown,
  quizPhase = 'idle',
}) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [topSlotHeight, setTopSlotHeight] = useState(150);
  const [derivedHistory, setDerivedHistory] = useState<GamePlayingHUDHistoryEntry[]>([]);
  const historyAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const historyCounter = useRef(0);
  const lastLoggedMessage = useRef<string | null>(null);
  const previousShowEducationalModal = useRef(false);

  const sortedScoreboardPlayers = useMemo(() => {
    if (!scoreboardPlayers || scoreboardPlayers.length === 0) return [];
    return [...scoreboardPlayers].sort((a, b) => b.points - a.points);
  }, [scoreboardPlayers]);

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
    Animated.spring(menuAnim, {
      toValue: showMenu ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [menuAnim, showMenu]);

  useEffect(() => {
    const wasShown = previousShowEducationalModal.current;
    previousShowEducationalModal.current = showEducationalModal;

    if (!showEducationalModal || wasShown) return;

    setShowHistory(false);
    setShowMenu(false);
    onEducationalModalShown?.();
  }, [onEducationalModalShown, showEducationalModal]);

  const historyPointerEvents = showHistory && !showEducationalModal ? 'auto' : 'none';
  const menuPointerEvents = showMenu && !showEducationalModal ? 'auto' : 'none';
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

      <View style={styles.bottomSection} pointerEvents="box-none">
        {!showEducationalModal && (
          <View style={styles.bottomAuxRow} pointerEvents="box-none">
            {sortedScoreboardPlayers.length > 0 ? (
              <View style={styles.scoreStack} pointerEvents="box-none">
                {sortedScoreboardPlayers.map((player) => (
                  <View key={player.id} style={[styles.scorePill, player.isMe && styles.scorePillMe]}>
                    <Text style={styles.scoreName} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={styles.scorePoints}>{player.points} pts</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.scoreStack} pointerEvents="box-none" />
            )}

            <View style={styles.menuContainer} pointerEvents="box-none">
              <Animated.View
                pointerEvents={menuPointerEvents}
                style={[
                  styles.menuDropdown,
                  {
                    opacity: menuAnim,
                    transform: [
                      {
                        translateY: menuAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <AnimatedButton
                  style={styles.menuItemButton}
                  testID="btn-home-menu"
                  onPress={() => {
                    setShowMenu(false);
                    onMenuPress();
                  }}
                  hapticStyle="medium"
                  hapticsEnabled={hapticsEnabled}
                  accessibilityLabel="Voltar ao menu"
                  accessibilityHint="Retorna para a tela principal"
                >
                  <View style={styles.menuItemContent}>
                    <AppIcon name="house" size={15} color={COLORS.text} />
                    <Text style={styles.menuItemText}>Menu</Text>
                  </View>
                </AnimatedButton>

                <AnimatedButton
                  style={styles.menuItemButton}
                  testID="btn-open-info-panel"
                  onPress={() => {
                    setShowMenu(false);
                    onHelpPress();
                  }}
                  hapticStyle="light"
                  hapticsEnabled={hapticsEnabled}
                  accessibilityLabel="Abrir ajuda"
                >
                  <View style={styles.menuItemContent}>
                    <AppIcon name="circle-question" size={15} color={COLORS.text} />
                    <Text style={styles.menuItemText}>Ajuda</Text>
                  </View>
                </AnimatedButton>

                <AnimatedButton
                  style={styles.menuItemButton}
                  testID="btn-history-toggle"
                  onPress={() => {
                    setShowMenu(false);
                    setShowHistory((previous) => !previous);
                  }}
                  hapticStyle="light"
                  hapticsEnabled={hapticsEnabled}
                  accessibilityLabel="Abrir historico"
                >
                  <View style={styles.menuItemContent}>
                    <AppIcon name="clock-rotate-left" size={15} color={COLORS.text} />
                    <Text style={styles.menuItemText}>Historico</Text>
                  </View>
                </AnimatedButton>

                <AnimatedButton
                  style={styles.menuItemButton}
                  testID="btn-open-settings-panel"
                  onPress={() => {
                    setShowMenu(false);
                    onSettingsPress();
                  }}
                  hapticStyle="light"
                  hapticsEnabled={hapticsEnabled}
                  accessibilityLabel="Abrir ajustes"
                >
                  <View style={styles.menuItemContent}>
                    <AppIcon name="sliders" size={15} color={COLORS.text} />
                    <Text style={styles.menuItemText}>Ajustes</Text>
                  </View>
                </AnimatedButton>
              </Animated.View>

              <AnimatedButton
                style={styles.hamburgerButton}
                testID="btn-hamburger-menu"
                onPress={() => {
                  setShowMenu((previous) => !previous);
                }}
                hapticStyle="light"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel={showMenu ? 'Fechar menu' : 'Abrir menu'}
              >
                <AppIcon name={showMenu ? 'xmark' : 'bars'} size={20} color={COLORS.text} />
              </AnimatedButton>
            </View>
          </View>
        )}

        <View style={styles.bottomDockWrapper}>
          <CuteCard style={styles.bottomDock}>
            <TurnIndicatorGlow active={!!canRoll && !isRolling && !isMoving} />
            <BreathingWrapper active={!isMoving && !isRolling}>
              <AnimatedButton
                onPress={onToggleCamera}
                hapticStyle="medium"
                hapticsEnabled={hapticsEnabled}
                accessibilityRole="button"
                accessibilityLabel="Alternar modo de camera"
              >
                <CameraModeIndicator isRoamMode={roamMode} />
              </AnimatedButton>
            </BreathingWrapper>

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
    height: 150,
    pointerEvents: 'none',
  },
  tileBannerContainer: {
    zIndex: 1,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'stretch',
  },
  bottomAuxRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 52,
    gap: 12,
  },
  scoreStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    flexShrink: 1,
  },
  scorePill: {
    maxWidth: 180,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
    backgroundColor: '#FFF8EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...theme.shadows.sm,
  },
  scorePillMe: {
    borderColor: '#8A6744',
    backgroundColor: '#FAE8A4',
  },
  scoreName: {
    maxWidth: 100,
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    flexShrink: 1,
  },
  scorePoints: {
    fontSize: 11,
    fontWeight: '900',
    color: '#5B351E',
  },
  menuContainer: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  menuDropdown: {
    position: 'absolute',
    bottom: 56,
    right: 0,
    gap: 6,
    alignItems: 'stretch',
    minWidth: 136,
  },
  menuItemButton: {
    minHeight: 38,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    backgroundColor: COLORS.cardBg,
    ...theme.shadows.sm,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  hamburgerButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    backgroundColor: COLORS.cardBg,
    ...theme.shadows.sm,
    justifyContent: 'center',
    alignItems: 'center',
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
