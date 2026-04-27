import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Animated,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MainMenuOverlay } from "@/src/components/game/MainMenuOverlay";
import { BRAND, COLORS } from "@/src/constants/colors";
import { CHARACTER_ASSET } from "@/src/game/characterAsset";
import { useGameStore } from "@/src/game/state/gameState";
import { audioManager } from "@/src/services/audio/audioManager";
import { theme } from "@/src/styles/theme";

// Code-split heavy components out of the initial bundle.
// GameScene -> Three.js + @react-three/fiber + @react-three/drei + postprocessing
// GameOverlay -> quiz content, celebration, educational content
// MultiplayerOverlay -> convex/react, multiplayer runtime
// CustomizationModal -> its own @react-three/fiber Canvas + useGLTF
const GameScene = lazy(async () => {
  const { GameScene } = await import('@/src/game/GameScene');
  return { default: GameScene };
});
const GameOverlay = lazy(async () => {
  const { GameOverlay } = await import('@/src/components/game/GameOverlay');
  return { default: GameOverlay };
});
const MultiplayerOverlay = lazy(async () => {
  const { MultiplayerOverlay } = await import('@/src/components/game/MultiplayerOverlay');
  return { default: MultiplayerOverlay };
});
const CustomizationModal = lazy(async () => {
  const { CustomizationModal } = await import('@/src/components/game/CustomizationModal');
  return { default: CustomizationModal };
});
const HelpCenterModal = lazy(async () => {
  const { HelpCenterModal } = await import('@/src/components/game/HelpCenterModal');
  return { default: HelpCenterModal };
});
// ─────────────────────────────────────────────
// Loading Screen
// ─────────────────────────────────────────────
const STRIPE_COLORS = [
  BRAND.orange,
  BRAND.pink,
  BRAND.red,
  BRAND.purple,
  BRAND.blue,
  BRAND.green,
  BRAND.teal,
];

const LOADING_FALLBACK_TIMEOUT_MS = 8000;
const LOADING_FADE_DURATION_MS = 550;
const LOADING_BAR_FORWARD_MS = 1400;
const LOADING_BAR_BACKWARD_MS = 500;
const AUDIO_PRELOAD_TIMEOUT_MS = 700;

/** Full-screen loading overlay with animated progress bar, rotating tips, and fallback on timeout. */
const LoadingScreen: React.FC<{
  onFinished: () => void;
  onRetry: () => void;
  modelsReady: boolean;
  audioReady: boolean;
}> = ({ onFinished, onRetry, modelsReady, audioReady }) => {
  const sceneReady = useGameStore((s) => s.sceneReady);
  const setRenderQuality = useGameStore((s) => s.setRenderQuality);
  const setSceneReady = useGameStore((s) => s.setSceneReady);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [canDismiss, setCanDismiss] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFinishedRef = useRef(false);

  const clearFallbackTimeout = useCallback(() => {
    if (!fallbackTimeoutRef.current) return;
    clearTimeout(fallbackTimeoutRef.current);
    fallbackTimeoutRef.current = null;
  }, []);

  const clearFinishTimeout = useCallback(() => {
    if (!finishTimeoutRef.current) return;
    clearTimeout(finishTimeoutRef.current);
    finishTimeoutRef.current = null;
  }, []);

  const finalizeLoading = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    clearFinishTimeout();
    onFinished();
  }, [clearFinishTimeout, onFinished]);

  const finishLoading = useCallback(() => {
    if (isDismissing || dismissed) return;

    setIsDismissing(true);
    clearFallbackTimeout();
    clearFinishTimeout();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: LOADING_FADE_DURATION_MS,
      useNativeDriver: false,
    }).start(() => {
      finalizeLoading();
    });
    finishTimeoutRef.current = setTimeout(
      finalizeLoading,
      LOADING_FADE_DURATION_MS + 120,
    );
  }, [
    clearFallbackTimeout,
    clearFinishTimeout,
    dismissed,
    fadeAnim,
    finalizeLoading,
    isDismissing,
  ]);

  const handleRetryLoading = useCallback(() => {
    clearFallbackTimeout();
    clearFinishTimeout();
    hasFinishedRef.current = false;
    setShowFallback(false);
    setCanDismiss(false);
    setDismissed(false);
    setIsDismissing(false);
    fadeAnim.setValue(1);
    setSceneReady(false);
    setLoadingAttempt((current) => current + 1);
    onRetry();
  }, [
    clearFallbackTimeout,
    clearFinishTimeout,
    fadeAnim,
    onRetry,
    setSceneReady,
  ]);

  const handleContinueLowerQuality = useCallback(() => {
    setRenderQuality("low");
    setShowFallback(false);
    setSceneReady(true);
    finishLoading();
  }, [finishLoading, setRenderQuality, setSceneReady]);

  // Animated loading bar
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, {
          toValue: 1,
          duration: LOADING_BAR_FORWARD_MS,
          useNativeDriver: false,
        }),
        Animated.timing(barAnim, {
          toValue: 0,
          duration: LOADING_BAR_BACKWARD_MS,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [barAnim]);

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => setCanDismiss(true), 1500);
    return () => clearTimeout(timer);
  }, [loadingAttempt]);

  // Fallback if the scene takes too long to report readiness.
  useEffect(() => {
    clearFallbackTimeout();
    setShowFallback(false);

    if (sceneReady) {
      return undefined;
    }

    fallbackTimeoutRef.current = setTimeout(() => {
      setShowFallback(true);
    }, LOADING_FALLBACK_TIMEOUT_MS);

    return clearFallbackTimeout;
  }, [clearFallbackTimeout, loadingAttempt, sceneReady]);

  // Fade out when ready
  useEffect(() => {
    if (sceneReady && modelsReady && audioReady && canDismiss && !dismissed && !showFallback) {
      setDismissed(true);
      finishLoading();
    }
  }, [audioReady, canDismiss, dismissed, finishLoading, sceneReady, showFallback, modelsReady]);

  useEffect(() => {
    return () => {
      clearFallbackTimeout();
      clearFinishTimeout();
    };
  }, [clearFallbackTimeout, clearFinishTimeout]);

  // Rotating educational loading tips
  const LOADING_TIPS = useMemo(
    () => [
      "Casas verdes representam preven\u00e7\u00e3o!",
      "Casas vermelhas alertam sobre riscos de transmiss\u00e3o.",
      "Personalize seu personagem antes de jogar!",
      "Voc\u00ea pode arrastar a c\u00e2mera para explorar o tabuleiro.",
      "O dado define quantas casas voc\u00ea avan\u00e7a.",
      "Aprenda sobre HIV/AIDS enquanto se diverte!",
    ],
    [],
  );
  const [tipIndex, setTipIndex] = useState(0);
  const tipFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(tipFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        Animated.timing(tipFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [LOADING_TIPS.length, tipFade]);

  // Animated loading bar — indeterminate while models load, full once ready.
  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: modelsReady && audioReady ? ["100%", "100%"] : ["15%", "85%"],
  });

  const isLoadingModels = !modelsReady;
  const isLoadingAudio = modelsReady && !audioReady;

  return (
    <Animated.View
      pointerEvents={isDismissing ? "none" : "auto"}
      style={[styles.loadingRoot, { opacity: fadeAnim }]}
    >
      {/* Rainbow stripe top */}
      <View style={[styles.loadingStripeBar, { marginTop: insets.top }]}>
        {STRIPE_COLORS.map((color, i) => (
          <View
            key={i}
            style={[styles.loadingStripe, { backgroundColor: color }]}
          />
        ))}
      </View>

      <View style={styles.loadingContent}>
        {/* Brand label */}
        <View style={styles.loadingBrandBox}>
          <Text style={styles.loadingBrandText}>JUVENTUDE PROTAGONISTA</Text>
        </View>

        {/* Title */}
        <Text style={styles.loadingTitle}>JOGO DA{"\n"}PREVENÇÃO</Text>

        {showFallback ? (
          <View style={styles.loadingFallbackCard}>
            <View style={styles.loadingFallbackHeader}>
              <ActivityIndicator color={BRAND.orange} />
              <Text style={styles.loadingFallbackLabel}>
                CARREGAMENTO DEMORANDO
              </Text>
            </View>
            <Text style={styles.loadingFallbackTitle}>
              A cena ainda não ficou pronta.
            </Text>
            <Text style={styles.loadingFallbackText}>
              Você pode tentar carregar novamente ou seguir com qualidade baixa
              para entrar mais rápido.
            </Text>

            <View style={styles.loadingFallbackActions}>
              <Pressable
                testID="loading-retry-button"
                accessibilityRole="button"
                onPress={handleRetryLoading}
                style={({ pressed }) => [
                  styles.loadingActionSecondary,
                  pressed && styles.loadingActionPressed,
                ]}
              >
                <Text style={styles.loadingActionSecondaryText}>
                  Tentar novamente
                </Text>
              </Pressable>

              <Pressable
                testID="loading-continue-low-quality-button"
                accessibilityRole="button"
                onPress={handleContinueLowerQuality}
                style={({ pressed }) => [
                  styles.loadingActionPrimary,
                  pressed && styles.loadingActionPressed,
                ]}
              >
                <Text style={styles.loadingActionPrimaryText}>
                  Continuar com qualidade baixa
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.loadingSection}>
            <Text style={styles.loadingLabel}>
              {isLoadingModels
                ? "CARREGANDO MODELOS"
                : isLoadingAudio
                  ? "CARREGANDO ÁUDIO"
                  : "CARREGANDO"}
            </Text>
            <View style={styles.loadingTrack}>
              <Animated.View
                style={[styles.loadingFill, { width: barWidth }]}
              />
            </View>
            <Animated.Text style={[styles.loadingTip, { opacity: tipFade }]}>
              {isLoadingModels
                ? "Carregando modelos 3D..."
                : isLoadingAudio
                  ? "Preparando sons..."
                : LOADING_TIPS[tipIndex]}
            </Animated.Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
/** Root application component managing loading, game scene, overlay layers, and modals. */
export default function App() {
  const { gameStatus } = useGameStore();
  const modelsReady = useGameStore((state) => state.modelsReady);
  const audioReady = useGameStore((state) => state.audioReady);
  const setModelsReady = useGameStore((state) => state.setModelsReady);
  const setAudioReady = useGameStore((state) => state.setAudioReady);
  const showCustomization = useGameStore((state) => state.showCustomization);
  const showHelpCenter = useGameStore((state) => state.showHelpCenter);
  const [showLoading, setShowLoading] = useState(true);

  const handleRetryLoading = useCallback(() => {
    setModelsReady(false);
  }, [setModelsReady]);

  useEffect(() => {
    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) setAudioReady(true);
    }, AUDIO_PRELOAD_TIMEOUT_MS);

    // Kick the 10 MB character GLB download off in parallel with audio preload
    // so GameScene's Suspense fallback doesn't block first gameplay frame.
    // Web only: on native the GLB is bundled and Asset.uri is unresolved until
    // downloadAsync runs, which expo-asset triggers on first useGLTF call anyway.
    // Uses dynamic import to avoid pulling drei/three into the initial bundle.
    if (Platform.OS === "web" && CHARACTER_ASSET.uri) {
      import('@/src/lib/r3f/drei')
        .then(({ useGLTF }) => {
          try {
            useGLTF.preload(CHARACTER_ASSET.uri);
          } catch (error) {
            console.warn("[GLTF] character.glb preload failed", error);
          }
        })
        .catch((error) => {
          console.warn("[GLTF] dynamic preload failed", error);
        });
    }

    audioManager
      .preloadAll()
      .catch((error) => {
        console.warn("[AudioManager] preloadAll failed", error);
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(fallback);
        setAudioReady(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [setAudioReady]);

  return (
    <View testID="screen-game" style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 3D Background always separate safe layer */}
      <View
        style={[
          styles.gameLayer,
          gameStatus === "menu" && { opacity: 0 },
        ]}
        pointerEvents={gameStatus === "menu" ? "none" : "auto"}
      >
        <Suspense fallback={null}><GameScene /></Suspense>
      </View>

      {/* UI Layer */}
      <View style={styles.uiLayer} pointerEvents={showLoading ? "none" : "box-none"}>
        {gameStatus === "menu" ? (
          <MainMenuOverlay />
        ) : gameStatus === "playing" ? (
          <Suspense fallback={null}><GameOverlay /></Suspense>
        ) : (
          <Suspense fallback={null}><MultiplayerOverlay /></Suspense>
        )}
      </View>

      {showCustomization && <Suspense fallback={null}><CustomizationModal /></Suspense>}
      {showHelpCenter && <Suspense fallback={null}><HelpCenterModal /></Suspense>}

      {/* Loading screen overlay */}
      {showLoading && (
        <LoadingScreen
          onFinished={() => setShowLoading(false)}
          onRetry={handleRetryLoading}
          modelsReady={modelsReady}
          audioReady={audioReady}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const FRAME_OUTER = "#4E2C17";
const FRAME_BG = "#8A5A34";
const PANEL_BG = "#F7EBD9";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...(Platform.OS === "web"
      ? { overflow: "hidden", height: "100%", width: "100%" }
      : {}),
  },
  gameLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    ...(Platform.OS === "web" ? { height: "100%" } : {}),
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    ...(Platform.OS === "web" ? { height: "100%" } : {}),
  },
  multiplayerBackground: {
    flex: 1,
    backgroundColor: "#DDEAF5",
  },

  // ── Loading Screen ──
  loadingRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: PANEL_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingStripeBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 6,
    borderBottomWidth: 2,
    borderBottomColor: FRAME_OUTER,
  },
  loadingStripe: {
    flex: 1,
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  loadingBrandBox: {
    backgroundColor: BRAND.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.normal,
    borderColor: FRAME_OUTER,
    ...theme.shadows.sm,
  },
  loadingBrandText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 3,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  loadingTitle: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "900",
    color: FRAME_OUTER,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  loadingSection: {
    width: "100%",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  loadingLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: FRAME_BG,
    letterSpacing: 3,
  },
  loadingTip: {
    fontSize: 12,
    fontWeight: "700",
    color: FRAME_BG,
    textAlign: "center",
    marginTop: 6,
    opacity: 0.7,
    paddingHorizontal: 20,
    lineHeight: 17,
  },
  loadingTrack: {
    width: "100%",
    height: 12,
    backgroundColor: "#E5D5BF",
    borderRadius: 6,
    borderWidth: theme.borderWidth.thin,
    borderColor: "#B78D5F",
    overflow: "hidden",
  },
  loadingFill: {
    height: "100%",
    backgroundColor: BRAND.orange,
    borderRadius: 6,
  },
  loadingFallbackCard: {
    width: "100%",
    gap: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#D5B48F",
    backgroundColor: "#FFF9F1",
    ...theme.shadows.md,
  },
  loadingFallbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingFallbackLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: FRAME_BG,
    letterSpacing: 2.5,
  },
  loadingFallbackTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: FRAME_OUTER,
    textAlign: "center",
  },
  loadingFallbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7A5635",
    textAlign: "center",
  },
  loadingFallbackActions: {
    gap: 10,
  },
  loadingActionPrimary: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: BRAND.orange,
    borderWidth: 1,
    borderColor: FRAME_OUTER,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingActionPrimaryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  loadingActionSecondary: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#C8A783",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingActionSecondaryText: {
    color: FRAME_OUTER,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  loadingActionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
