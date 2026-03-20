import { CustomizationModal } from '@/src/components/game/CustomizationModal';
import { GameOverlay } from '@/src/components/game/GameOverlay';
import { HelpCenterModal } from '@/src/components/game/HelpCenterModal';
import { MainMenuOverlay } from '@/src/components/game/MainMenuOverlay';
import { BRAND, COLORS } from '@/src/constants/colors';
import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const LOADING_BAR_FORWARD_MS = 1600;
const LOADING_BAR_BACKWARD_MS = 600;

const LOADING_TIPS = [
  'O preservativo é o método mais eficaz para prevenir ISTs.',
  'HIV não se transmite por abraço, aperto de mão ou beijo.',
  'A PrEP é um comprimido que previne o HIV quando tomado diariamente.',
  'Testagem regular é a melhor forma de cuidar da sua saúde.',
  'Toda pessoa vivendo com HIV tem direito a tratamento gratuito pelo SUS.',
  'ISTs podem ser assintomáticas — o teste é o único jeito de saber.',
  'Usar preservativo protege contra mais de 20 tipos de ISTs.',
];

// ── Rainbow Dots Wave ──
const RainbowDotsWave: React.FC = () => {
  const dotAnims = useRef(STRIPE_COLORS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = dotAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, (STRIPE_COLORS.length - 1 - i) * 120)),
        ])
      )
    );
    Animated.parallel(animations).start();
  }, [dotAnims]);

  return (
    <View style={styles.dotsRow}>
      {STRIPE_COLORS.map((color, i) => {
        const scale = dotAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.5],
        });
        const translateY = dotAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: color,
                transform: [{ scale }, { translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ── Animated Loading Dots Text ──
const AnimatedDotsText: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((c) => (c + 1) % 4);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const dots = '.'.repeat(dotCount);
  const pad = '\u00A0'.repeat(3 - dotCount);

  return (
    <Text style={styles.loadingLabel}>
      CARREGANDO{dots}{pad}
    </Text>
  );
};

const LoadingScreen: React.FC<{
  onFinished: () => void;
  onRetry: () => void;
}> = ({ onFinished, onRetry }) => {
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

  // ── Rotating tips ──
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
  const tipFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(tipFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        Animated.timing(tipFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [tipFade]);

  // ── Logo entrance animation ──
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoScale, logoOpacity]);

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
      useNativeDriver: true,
    }).start(() => {
      finalizeLoading();
    });
    finishTimeoutRef.current = setTimeout(finalizeLoading, LOADING_FADE_DURATION_MS + 120);
  }, [clearFallbackTimeout, clearFinishTimeout, dismissed, fadeAnim, finalizeLoading, isDismissing]);

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
  }, [clearFallbackTimeout, clearFinishTimeout, fadeAnim, onRetry, setSceneReady]);

  const handleContinueLowerQuality = useCallback(() => {
    setRenderQuality('low');
    setShowFallback(false);
    finishLoading();
  }, [finishLoading, setRenderQuality]);

  // Animated loading bar
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, {
          toValue: 1,
          duration: LOADING_BAR_FORWARD_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(barAnim, {
          toValue: 0,
          duration: LOADING_BAR_BACKWARD_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
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
    if (sceneReady && canDismiss && !dismissed && !showFallback) {
      setDismissed(true);
      finishLoading();
    }
  }, [canDismiss, dismissed, finishLoading, sceneReady, showFallback]);

  useEffect(() => {
    return () => {
      clearFallbackTimeout();
      clearFinishTimeout();
    };
  }, [clearFallbackTimeout, clearFinishTimeout]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '88%'],
  });

  return (
    <Animated.View pointerEvents={isDismissing ? 'none' : 'auto'} style={[styles.loadingRoot, { opacity: fadeAnim }]}>
      {/* Rainbow stripe top */}
      <View style={[styles.loadingStripeBar, { marginTop: insets.top }]}>
        {STRIPE_COLORS.map((color, i) => (
          <View key={i} style={[styles.loadingStripe, { backgroundColor: color }]} />
        ))}
      </View>

      <View style={styles.loadingContent}>
        {/* Logo */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            source={require('@/assets/images/logojp.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Text style={styles.loadingTitle}>JOGO DA{'\n'}PREVENÇÃO</Text>

        {showFallback ? (
          <View style={styles.loadingFallbackCard}>
            <View style={styles.loadingFallbackHeader}>
              <ActivityIndicator color={BRAND.orange} />
              <Text style={styles.loadingFallbackLabel}>CARREGAMENTO DEMORANDO</Text>
            </View>
            <Text style={styles.loadingFallbackTitle}>A cena ainda não ficou pronta.</Text>
            <Text style={styles.loadingFallbackText}>
              Você pode tentar carregar novamente ou seguir com qualidade baixa para entrar mais
              rápido.
            </Text>

            <View style={styles.loadingFallbackActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleRetryLoading}
                style={({ pressed }) => [
                  styles.loadingActionSecondary,
                  pressed && styles.loadingActionPressed,
                ]}
              >
                <Text style={styles.loadingActionSecondaryText}>Tentar novamente</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleContinueLowerQuality}
                style={({ pressed }) => [
                  styles.loadingActionPrimary,
                  pressed && styles.loadingActionPressed,
                ]}
              >
                <Text style={styles.loadingActionPrimaryText}>Continuar com qualidade baixa</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.loadingSection}>
            {/* Tip card */}
            <View style={styles.tipCard}>
              <Text style={styles.tipLabel}>💡 SABIA QUE?</Text>
              <Animated.Text style={[styles.tipText, { opacity: tipFade }]}>
                {LOADING_TIPS[tipIndex]}
              </Animated.Text>
            </View>

            {/* Loading bar */}
            <AnimatedDotsText />
            <View style={styles.loadingTrack}>
              <Animated.View style={[styles.loadingFill, { width: barWidth }]} />
            </View>

            {/* Rainbow dots wave */}
            <RainbowDotsWave />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
export default function App() {
  const { gameStatus, showCustomization } = useGameStore();
  const [showLoading, setShowLoading] = useState(true);
  const [sceneInstanceKey, setSceneInstanceKey] = useState(0);

  const handleRetryLoading = useCallback(() => {
    setSceneInstanceKey((current) => current + 1);
  }, []);

  return (
    <View testID="screen-game" style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 3D Background always separate safe layer */}
      <View style={styles.gameLayer}>
        {!showCustomization && <GameScene key={sceneInstanceKey} />}
      </View>
      
      {/* UI Layer */}
      <View style={styles.uiLayer}>
        {gameStatus === 'menu' ? <MainMenuOverlay /> : <GameOverlay />}
      </View>

      <CustomizationModal />
      <HelpCenterModal />

      {/* Loading screen overlay */}
      {showLoading && (
        <LoadingScreen
          onFinished={() => setShowLoading(false)}
          onRetry={handleRetryLoading}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const FRAME_OUTER = '#4E2C17';
const FRAME_BG = '#8A5A34';
const PANEL_BG = '#F7EBD9';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...(Platform.OS === 'web' ? { overflow: 'hidden', height: '100%', width: '100%' } : {}),
  },
  gameLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    ...(Platform.OS === 'web' ? { height: '100%' } : {}),
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    pointerEvents: 'box-none',
    ...(Platform.OS === 'web' ? { height: '100%' } : {}),
  },

  // ── Loading Screen ──
  loadingRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: PANEL_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingStripeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 6,
    borderBottomWidth: 2,
    borderBottomColor: FRAME_OUTER,
  },
  loadingStripe: {
    flex: 1,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  loadingLogo: {
    width: 140,
    height: 80,
    marginBottom: -8,
  },
  loadingTitle: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '900',
    color: FRAME_OUTER,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  loadingSection: {
    width: '100%',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  tipCard: {
    backgroundColor: '#FFF9F1',
    borderWidth: 2,
    borderColor: '#D5B48F',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 8,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: BRAND.orange,
    letterSpacing: 2,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: FRAME_OUTER,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: FRAME_BG,
    letterSpacing: 3,
  },
  loadingTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5D5BF',
    borderRadius: 6,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    backgroundColor: BRAND.orange,
    borderRadius: 6,
  },
  loadingFallbackCard: {
    width: '100%',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D5B48F',
    backgroundColor: '#FFF9F1',
    ...theme.shadows.md,
  },
  loadingFallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingFallbackLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: FRAME_BG,
    letterSpacing: 2.5,
  },
  loadingFallbackTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: FRAME_OUTER,
    textAlign: 'center',
  },
  loadingFallbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7A5635',
    textAlign: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingActionPrimaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingActionSecondary: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#C8A783',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingActionSecondaryText: {
    color: FRAME_OUTER,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingActionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
