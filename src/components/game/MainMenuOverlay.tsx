import { AppIcon } from "@/src/components/ui/AppIcon";
import { Card3D, type Card3DTheme, CARD_3D_THEMES } from "@/src/components/ui/Card3D";
import { Launch3DButton } from "@/src/components/ui/Launch3DButton";
import { useGameStore } from "@/src/game/state/gameState";
import { triggerHaptic } from "@/src/utils/haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const bgImage = require("@/src/assets/images/menu/background.png");
const multiplayerImg = require("@/src/assets/images/menu/multiplayer.webp");
const aprenderImg = require("@/src/assets/images/menu/aprender.webp");
const personalizarImg = require("@/src/assets/images/menu/personalizar.webp");

// ─────────────────────────────────────────────
// Animated counter for stat chips
// ─────────────────────────────────────────────
const AnimatedCounter: React.FC<{ value: number; style?: any }> = ({
  value,
  style,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(0);
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: value,
      duration: 600,
      delay: 500,
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      if (rounded !== displayRef.current) {
        displayRef.current = rounded;
        setDisplay(rounded);
      }
    });

    return () => animValue.removeListener(listener);
  }, [value, animValue]);

  return <Text style={style}>{display}</Text>;
};

// ─────────────────────────────────────────────
// Card Component — 3D themed menu card
// ─────────────────────────────────────────────
const MenuCard: React.FC<{
  image: any;
  label: string;
  themeName: keyof typeof CARD_3D_THEMES;
  onPress: () => void;
  index: number;
  width: number;
  height: number;
  testID?: string;
}> = ({ image, label, themeName, onPress, index, width, height, testID }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 5,
        useNativeDriver: true,
        delay: 150 + index * 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: 150 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacityAnim, slideAnim]);

  const theme: Card3DTheme = CARD_3D_THEMES[themeName];

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <Card3D
        width={width}
        height={height}
        borderRadius={16}
        theme={themeName}
        depth={9}
        onPress={onPress}
        accessibilityLabel={label}
        testID={testID}
      >
        {/* Image sits in the upper ~72% of the face */}
        <View style={styles.cardImageWrap}>
          <Image
            source={image}
            style={styles.cardImage}
            contentFit="cover"
          />
          {/* Soft wash to blend the image with the card theme */}
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(0,0,0,0.04)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        </View>

        {/* Label strip at bottom — themed gradient */}
        <View style={styles.cardLabelStrip}>
          <LinearGradient
            colors={[theme.face[2], theme.side[0]] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.cardLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Card3D>
    </Animated.View>
  );
};

export const MainMenuOverlay: React.FC = () => {
  const {
    startGame,
    restartGame,
    resetGame,
    setShowCustomization,
    setGameStatus,
    openHelpCenter,
    playerIndex,
    path,
  } = useGameStore();

  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const cardGap = 14;
  const horizontalPadding = 16 * 2;
  const availableRowWidth = Math.max(240, windowWidth - horizontalPadding);
  const cardWidth = Math.min(
    116,
    Math.floor((availableRowWidth - cardGap * 2) / 3),
  );
  const cardHeight = Math.round(cardWidth * 1.33);

  const progress = Math.round(
    (playerIndex / Math.max(1, path.length - 1)) * 100,
  );
  const isComplete = playerIndex === path.length - 1 && path.length > 1;
  const stepsRemaining = Math.max(
    0,
    Math.max(1, path.length - 1) - playerIndex,
  );

  const heroSlide = useRef(new Animated.Value(-30)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroSlide, {
        toValue: 0,
        speed: 10,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroOpacity, heroSlide]);

  return (
    <View style={styles.root}>
      <Image
        source={bgImage}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Top Score Bar */}
        <Animated.View
          style={[
            styles.topScoreBar,
            { opacity: heroOpacity, transform: [{ translateY: heroSlide }] },
          ]}
        >
          <View style={styles.scoreItem}>
            <View style={styles.scoreIconRow}>
              <AppIcon name="shoe-prints" size={14} color="#FFF" />
              <AnimatedCounter value={playerIndex} style={styles.scoreNumber} />
            </View>
            <Text style={styles.scoreLabel}>PASSOS</Text>
          </View>

          <View style={styles.scoreDivider} />

          <View style={styles.progressSection}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>
            <Text style={styles.progressTextUnder}>PROGRESSO</Text>
          </View>

          <View style={styles.scoreDivider} />

          <View style={styles.scoreItem}>
            <View style={styles.scoreIconRow}>
              <AppIcon name="flag-checkered" size={14} color="#FFF" />
              <AnimatedCounter
                value={stepsRemaining}
                style={styles.scoreNumber}
              />
            </View>
            <Text style={styles.scoreLabel}>FALTAM</Text>
          </View>
        </Animated.View>

        {/* Hero Titles */}
        <Animated.View
          style={[
            styles.heroTitles,
            { opacity: heroOpacity, transform: [{ translateY: heroSlide }] },
          ]}
        >
          <Text style={styles.heroTitle}>JOGO DA</Text>
          <Text style={styles.heroTitle}>PREVENÇÃO</Text>
          <Text style={styles.heroSubtitle}>
            Aprenda sobre HIV/AIDS e outras
            {"\n"}
            ISTs de forma divertida
          </Text>
        </Animated.View>

        {/* Cards Row */}
        <View style={styles.cardsRow}>
          <MenuCard
            index={0}
            image={multiplayerImg}
            label="MULTIPLAYER"
            themeName="blue"
            width={cardWidth}
            height={cardHeight}
            testID="btn-menu-multiplayer"
            onPress={() => setGameStatus("multiplayer")}
          />
          <MenuCard
            index={1}
            image={aprenderImg}
            label="APRENDER"
            themeName="green"
            width={cardWidth}
            height={cardHeight}
            testID="btn-menu-aprender"
            onPress={() => openHelpCenter("como-jogar")}
          />
          <MenuCard
            index={2}
            image={personalizarImg}
            label="PERSONALIZAR"
            themeName="pink"
            width={cardWidth}
            height={cardHeight}
            testID="btn-menu-personalizar"
            onPress={() => setShowCustomization(true)}
          />
        </View>

        <View style={{ flex: 1 }} />

        {/* Launch Button Area */}
        <Animated.View style={[styles.launchSection, { opacity: heroOpacity }]}>
          <View style={styles.launchButtonWrapper}>
            <Launch3DButton
              size={140}
              onPress={() => {
                if (isComplete) restartGame();
                else startGame();
              }}
            />
            {/* The text overlaid on the button face */}
            <View style={styles.launchTextOverlay} pointerEvents="none">
              <Text style={styles.launchTextTop}>
                {isComplete ? "NOVA" : "INICIAR"}
              </Text>
              <Text style={styles.launchTextBottom}>
                {isComplete ? "JORNADA" : "SOLO"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Reset Button */}
        <Animated.View style={[styles.resetWrapper, { opacity: heroOpacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resetar jogo"
            android_ripple={{ color: "rgba(255,255,255,0.22)" }}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
            onPress={() => {
              triggerHaptic("light");
              resetGame();
            }}
          >
            <AppIcon name="arrow-rotate-left" size={13} color="#FFF" />
            <Text style={styles.resetText}>RESETAR JOGO</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  // Top Score Bar
  topScoreBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125, 195, 226, 0.8)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "90%",
    maxWidth: 360,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    overflow: "visible",
    marginTop: 10,
  },
  scoreItem: {
    alignItems: "center",
    flex: 1,
  },
  scoreIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
  },
  scoreDivider: {
    width: 0,
    height: 40,
    marginHorizontal: 20,
  },
  progressSection: {
    alignItems: "center",
    zIndex: 10,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ADDBEF",
    borderWidth: 4,
    borderColor: "#D4EEF8",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
      web: { filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.1))" } as any,
    }),
  },
  progressValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#55A9CD",
  },
  progressTextUnder: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
    marginTop: 2,
  },

  // Titles
  heroTitles: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  heroTitle: {
    fontSize: 42,
    fontFamily: "System",
    fontWeight: "900",
    color: "#FFF",
    lineHeight: 46,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#FFF",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 10,
    lineHeight: 20,
    opacity: 0.9,
  },

  // Cards Row
  cardsRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    gap: 14,
  },
  cardImageWrap: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 6,
    bottom: 34,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardLabelStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.8,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Launch Button Section
  launchSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  launchButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  launchTextOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: "center",
  },
  launchTextTop: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 16,
  },
  launchTextBottom: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 18,
  },

  // Reset Button
  resetWrapper: {
    paddingBottom: 10,
    alignItems: "center",
  },
  resetButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "rgba(82, 166, 125, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 7,
      },
      android: { elevation: 4 },
      web: {
        cursor: "pointer",
        filter: "drop-shadow(0px 3px 7px rgba(0,0,0,0.18))",
      } as any,
    }),
  },
  resetButtonPressed: {
    opacity: 0.84,
    transform: [{ translateY: 1 }],
  },
  resetText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
