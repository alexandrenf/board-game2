import { CustomizationModal } from '@/src/components/game/CustomizationModal';
import { GameOverlay } from '@/src/components/game/GameOverlay';
import { HelpCenterModal } from '@/src/components/game/HelpCenterModal';
import { MainMenuOverlay } from '@/src/components/game/MainMenuOverlay';
import { BRAND, COLORS } from '@/src/constants/colors';
import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet, Text, View } from 'react-native';
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

const LoadingScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const sceneReady = useGameStore((s) => s.sceneReady);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [canDismiss, setCanDismiss] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Animated loading bar
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(barAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ])
    ).start();
  }, [barAnim]);

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => setCanDismiss(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fade out when ready
  useEffect(() => {
    if (sceneReady && canDismiss && !dismissed) {
      setDismissed(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinished());
    }
  }, [sceneReady, canDismiss, dismissed, fadeAnim, onFinished]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['15%', '85%'],
  });

  return (
    <Animated.View style={[styles.loadingRoot, { opacity: fadeAnim }]}>
      {/* Rainbow stripe top */}
      <View style={[styles.loadingStripeBar, { marginTop: insets.top }]}>
        {STRIPE_COLORS.map((color, i) => (
          <View key={i} style={[styles.loadingStripe, { backgroundColor: color }]} />
        ))}
      </View>

      <View style={styles.loadingContent}>
        {/* Brand label */}
        <View style={styles.loadingBrandBox}>
          <Text style={styles.loadingBrandText}>JUVENTUDE PROTAGONISTA</Text>
        </View>

        {/* Title */}
        <Text style={styles.loadingTitle}>JOGO DA{'\n'}PREVENÇÃO</Text>

        {/* Loading indicator */}
        <View style={styles.loadingSection}>
          <Text style={styles.loadingLabel}>CARREGANDO</Text>
          <View style={styles.loadingTrack}>
            <Animated.View style={[styles.loadingFill, { width: barWidth }]} />
          </View>
        </View>
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

  return (
    <View testID="screen-game" style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 3D Background always separate safe layer */}
      <View style={styles.gameLayer}>
        {!showCustomization && <GameScene />}
      </View>
      
      {/* UI Layer */}
      <View style={styles.uiLayer}>
        {gameStatus === 'menu' ? <MainMenuOverlay /> : <GameOverlay />}
      </View>

      <CustomizationModal />
      <HelpCenterModal />

      {/* Loading screen overlay */}
      {showLoading && (
        <LoadingScreen onFinished={() => setShowLoading(false)} />
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
  },
  gameLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'box-none',
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
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
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
});
