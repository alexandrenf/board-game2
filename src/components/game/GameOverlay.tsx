import { AnimatedButton } from "@/src/components/ui/AnimatedButton";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { CuteCard } from "@/src/components/ui/CuteCard";
import { COLORS } from "@/src/constants/colors";
import { useGameStore } from "@/src/game/state/gameState";
import { theme } from "@/src/styles/theme";
import { triggerHaptic } from "@/src/utils/haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraModeIndicator } from "./CameraModeIndicator";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { DiceMenu } from "./DiceMenu";
import { EducationalModal } from "./EducationalModal";
import { MessageToast } from "./MessageToast";
import { TileFocusBanner } from "./TileFocusBanner";
import { ZoomControls } from "./ZoomControls";

export const GameOverlay: React.FC = () => {
  const {
    lastMessage,
    playerIndex,
    focusTileIndex,
    path,
    isMoving,
    showEducationalModal,
    roamMode,
    hapticsEnabled,
    setRoamMode,
    setShowCustomization,
    setGameStatus,
    openHelpCenter,
    closeHelpCenter,
  } = useGameStore();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const [showCelebration, setShowCelebration] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [topSlotHeight, setTopSlotHeight] = useState(206);
  const [history, setHistory] = useState<
    { id: number; text: string; player: string; timestamp: number }[]
  >([]);
  const historyAnim = useRef(new Animated.Value(0)).current;
  const historyCounter = useRef(0);
  const lastLoggedMessage = useRef<string | null>(null);
  const playHaptic = (style: Parameters<typeof triggerHaptic>[0]) =>
    triggerHaptic(style);

  const progressIndex = isMoving ? focusTileIndex : playerIndex;
  const progress =
    path.length > 1 ? (progressIndex / (path.length - 1)) * 100 : 0;
  const totalSteps = Math.max(path.length, 1);
  const focusedTile = path[focusTileIndex] || path[playerIndex];

  const historyMaxHeight = Math.max(
    180,
    Math.min(320, height - insets.top - insets.bottom - 220),
  );
  const historyPanelWidth = Math.max(220, Math.min(310, width - 24));
  const historySlideOffset = historyPanelWidth + 24;
  const historyTopOffset = Math.max(110, topSlotHeight + 8);

  const overlayInsets = useMemo(
    () => ({
      paddingTop: insets.top + 8,
      paddingBottom: Math.max(insets.bottom, 12) + 8,
    }),
    [insets.bottom, insets.top],
  );

  useEffect(() => {
    if (playerIndex === path.length - 1 && path.length > 1) {
      setShowCelebration(true);
    }
  }, [path.length, playerIndex]);

  useEffect(() => {
    if (lastMessage && lastMessage !== lastLoggedMessage.current) {
      if (lastMessage.includes("Rolando")) {
        lastLoggedMessage.current = lastMessage;
        return;
      }

      const entry = {
        id: historyCounter.current++,
        text: lastMessage,
        player: "Você",
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        if (
          lastMessage.includes("Tirou") &&
          prev[0]?.text.includes("Rolando")
        ) {
          return [{ ...entry, id: prev[0].id }, ...prev.slice(1)].slice(0, 40);
        }
        return [entry, ...prev].slice(0, 40);
      });

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
  }, [historyAnim, showHistory]);

  useEffect(() => {
    if (showEducationalModal && showHistory) {
      setShowHistory(false);
    }
  }, [showEducationalModal, showHistory]);

  useEffect(() => {
    if (showEducationalModal) {
      closeHelpCenter();
    }
  }, [closeHelpCenter, showEducationalModal]);

  const handleCameraToggle = () => {
    playHaptic("medium");
    setRoamMode(!roamMode);
  };

  const historyPointerEvents =
    showHistory && !showEducationalModal ? "auto" : "none";

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
                onPress={() => {
                  closeHelpCenter();
                  setGameStatus("menu");
                }}
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
                onPress={() => {
                  playHaptic("light");
                  openHelpCenter("como-jogar");
                }}
                hapticStyle="light"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel="Abrir ajuda"
              >
                <View style={styles.topActionButtonContent}>
                  <AppIcon
                    name="circle-question"
                    size={15}
                    color={COLORS.text}
                  />
                  <Text style={styles.topActionText}>Ajuda</Text>
                </View>
              </AnimatedButton>

              <AnimatedButton
                style={styles.topActionButton}
                testID="btn-history-toggle"
                onPress={() => {
                  playHaptic("light");
                  setShowHistory((prev) => !prev);
                }}
                hapticStyle="light"
                hapticsEnabled={hapticsEnabled}
                accessibilityLabel="Abrir historico"
              >
                <View style={styles.topActionButtonContent}>
                  <AppIcon
                    name="clock-rotate-left"
                    size={15}
                    color={COLORS.text}
                  />
                  <Text style={styles.topActionText}>Historico</Text>
                </View>
              </AnimatedButton>

              <AnimatedButton
                style={styles.topActionButton}
                testID="btn-open-settings-panel"
                onPress={() => {
                  playHaptic("light");
                  openHelpCenter("qualidade");
                }}
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

            <View style={styles.tileBannerContainer}>
              <TileFocusBanner
                tile={focusedTile}
                focusIndex={progressIndex}
                totalSteps={totalSteps}
                progress={progress}
                isMoving={isMoving}
                roamMode={roamMode}
              />
            </View>
          </View>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      {!showEducationalModal && (
        <MessageToast
          message={lastMessage}
          bottomOffset={Math.max(insets.bottom + 96, 120)}
        />
      )}

      <ZoomControls />

      <View style={styles.bottomDockWrapper}>
        <CuteCard style={styles.bottomDock}>
          <TouchableOpacity
            onPress={handleCameraToggle}
            accessibilityRole="button"
            accessibilityLabel="Alternar modo de camera"
          >
            <CameraModeIndicator isRoamMode={roamMode} />
          </TouchableOpacity>

          <DiceMenu />

          <AnimatedButton
            style={styles.dockButton}
            testID="btn-open-customization"
            onPress={() => {
              setShowCustomization(true);
            }}
            hapticStyle="light"
            hapticsEnabled={hapticsEnabled}
            accessibilityLabel="Abrir personalizacao do personagem"
          >
            <View style={styles.dockButtonContent}>
              <AppIcon name="shirt" size={18} color={COLORS.text} />
              <Text style={styles.dockButtonText}>Personagem</Text>
            </View>
          </AnimatedButton>
        </CuteCard>
      </View>

      <CelebrationOverlay
        visible={showCelebration}
        onDismiss={() => {
          setShowCelebration(false);
          setGameStatus("menu");
        }}
      />

      <EducationalModal />

      <Animated.View
        style={[
          styles.historyPanel,
          {
            top: historyTopOffset,
            maxHeight: historyMaxHeight,
            width: historyPanelWidth,
          },
          {
            pointerEvents: historyPointerEvents,
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
            <Text style={styles.historyTitle}>Histórico da Partida</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              playHaptic("light");
              setShowHistory(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Fechar historico"
          >
            <AppIcon name="xmark" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.historyList}
          contentContainerStyle={styles.historyListContent}
        >
          {history.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyMeta}>
                <Text style={styles.historyPlayer}>{entry.player}</Text>
                <Text style={styles.historyTime}>
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text style={styles.historyText}>{entry.text}</Text>
            </View>
          ))}
          {history.length === 0 && (
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
    justifyContent: "space-between",
    pointerEvents: "box-none",
  },
  accentTop: {
    position: "absolute",
    top: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
    zIndex: 0,
    pointerEvents: "none",
  },
  accentBottom: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
    zIndex: 0,
    pointerEvents: "none",
  },
  topSlot: {
    width: "100%",
    pointerEvents: "box-none",
  },
  topBar: {
    paddingHorizontal: 12,
  },
  topBarSpacer: {
    height: 206,
    pointerEvents: "none",
  },
  topActionsRow: {
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
    marginBottom: Platform.OS === "web" ? 4 : 14,
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  topActionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  topActionText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  bottomDockWrapper: {
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  bottomDock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 390,
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
    ...theme.shadows.sm,
  },
  dockButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dockButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  historyPanel: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "900",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  historyPlayer: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  historyTime: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  historyText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 17,
  },
  historyEmpty: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
});
