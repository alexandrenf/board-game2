import { Dice3D } from '@/src/game/Dice3D';
import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import { Canvas } from '@react-three/fiber/native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Color palette
const COLORS = {
  primary: '#FF7B6B',
  primaryDark: '#E85A4F',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#2D3436',
  cardBg: 'rgba(255, 255, 255, 0.12)',
  cardBorder: 'rgba(255, 255, 255, 0.2)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  success: '#6BCB77',
  warning: '#FFD93D',
};

// Animated button component with spring physics
const AnimatedButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}> = ({ onPress, disabled, style, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };
  
  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Glassmorphism card component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <View style={[styles.glassCard, style]}>
    {children}
  </View>
);

// Dice menu component
const DiceMenu: React.FC = () => {
  const { rollDice, isRolling, isMoving } = useGameStore();
  const canRoll = !isRolling && !isMoving;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Pulsing animation when dice is ready
  useEffect(() => {
    if (canRoll) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [canRoll, pulseAnim]);

  return (
    <AnimatedButton onPress={rollDice} disabled={!canRoll}>
      <Animated.View 
        style={[
          styles.diceContainer,
          { transform: [{ scale: pulseAnim }] },
          canRoll && styles.diceContainerReady,
        ]}
      >
        <View style={styles.diceCanvasWrapper} pointerEvents="none">
          <Canvas camera={{ position: [0, 0, 4] }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 5, 2]} intensity={1} />
            <Dice3D />
          </Canvas>
        </View>
        <Text style={[styles.rollLabel, !canRoll && styles.rollLabelDisabled]}>
          {isRolling ? '...' : canRoll ? '🎲 ROLL' : 'MOVING'}
        </Text>
      </Animated.View>
    </AnimatedButton>
  );
};

// Customization modal
const CustomizationModal: React.FC = () => {
  const { 
    showCustomization, 
    setShowCustomization,
    shirtColor,
    hairColor,
    setShirtColor,
    setHairColor
  } = useGameStore();
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showCustomization ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [showCustomization, slideAnim]);

  const shirtColors = [
    { color: '#FF6B6B', name: 'Coral' },
    { color: '#4ECDC4', name: 'Teal' },
    { color: '#95E1D3', name: 'Mint' },
    { color: '#FFE66D', name: 'Yellow' },
    { color: '#DDA0DD', name: 'Plum' },
    { color: '#87CEEB', name: 'Sky' },
  ];
  
  const hairColors = [
    { color: '#4A3B2A', name: 'Brown' },
    { color: '#1A1A2E', name: 'Black' },
    { color: '#D4A574', name: 'Blonde' },
    { color: '#8B4513', name: 'Auburn' },
    { color: '#E6B8A2', name: 'Strawberry' },
    { color: '#6B5B95', name: 'Purple' },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showCustomization}
      onRequestClose={() => setShowCustomization(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [
                { 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  })
                },
                {
                  scale: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }
              ],
              opacity: slideAnim,
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalEmoji}>✨</Text>
            <Text style={styles.modalTitle}>Customize Your Character</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👕 Shirt Color</Text>
            <View style={styles.colorGrid}>
              {shirtColors.map(({ color, name }) => (
                <AnimatedButton 
                  key={color}
                  onPress={() => setShirtColor(color)}
                >
                  <View style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    shirtColor === color && styles.colorOptionSelected,
                  ]}>
                    {shirtColor === color && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                </AnimatedButton>
              ))}
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>💇 Hair Color</Text>
            <View style={styles.colorGrid}>
              {hairColors.map(({ color, name }) => (
                <AnimatedButton 
                  key={color}
                  onPress={() => setHairColor(color)}
                >
                  <View style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    hairColor === color && styles.colorOptionSelected,
                  ]}>
                    {hairColor === color && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                </AnimatedButton>
              ))}
            </View>
          </View>

          <AnimatedButton 
            style={styles.startButton} 
            onPress={() => setShowCustomization(false)}
          >
            <View style={styles.startButtonInner}>
              <Text style={styles.startButtonText}>🎮 START ADVENTURE</Text>
            </View>
          </AnimatedButton>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Message toast with animation
const MessageToast: React.FC<{ message: string | null }> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevMessage = useRef(message);
  
  useEffect(() => {
    if (message && message !== prevMessage.current) {
      // Bounce in animation
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.spring(fadeAnim, { 
          toValue: 1, 
          useNativeDriver: true,
          speed: 20,
          bounciness: 12,
        }),
      ]).start();
      prevMessage.current = message;
    }
  }, [message, fadeAnim]);
  
  if (!message) return null;
  
  return (
    <Animated.View 
      style={[
        styles.messageToast,
        {
          opacity: fadeAnim,
          transform: [
            { 
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            },
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              })
            }
          ],
        }
      ]}
    >
      <Text style={styles.messageText}>{message}</Text>
    </Animated.View>
  );
};

// UI overlay
const UIOverlay: React.FC = () => {
  const { 
    lastMessage,
    playerIndex,
    path,
    roamMode,
    setRoamMode,
    setShowCustomization
  } = useGameStore();
  
  const progress = path.length > 0 ? (playerIndex / (path.length - 1)) * 100 : 0;

  return (
    <View style={styles.overlayContainer}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <GlassCard style={styles.statsCard}>
          <Text style={styles.statsLabel}>Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.tileText}>{playerIndex}/{path.length - 1}</Text>
          </View>
        </GlassCard>
        
        <MessageToast message={lastMessage} />
        
        <AnimatedButton 
          style={styles.settingsButton}
          onPress={() => setShowCustomization(true)}
        >
          <View style={styles.iconButtonInner}>
            <Text style={styles.iconText}>⚙️</Text>
          </View>
        </AnimatedButton>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <AnimatedButton 
          onPress={() => setRoamMode(!roamMode)}
        >
          <View style={[
            styles.modeButton, 
            roamMode ? styles.modeButtonActive : styles.modeButtonInactive
          ]}>
            <Text style={styles.modeIcon}>{roamMode ? '🗺️' : '🎯'}</Text>
            <Text style={styles.modeText}>
              {roamMode ? 'EXPLORE' : 'FOLLOW'}
            </Text>
          </View>
        </AnimatedButton>
        
        <DiceMenu />
        
        <View style={styles.spacer} />
      </View>

      <CustomizationModal />
    </View>
  );
};

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.gameContainer}>
        <GameScene />
      </View>
      <UIOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gameContainer: {
    flex: 1,
  },
  
  // Glass Card
  glassCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
  },
  
  // Overlay
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  statsCard: {
    minWidth: 120,
  },
  statsLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  tileText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
  
  // Message Toast
  messageToast: {
    backgroundColor: COLORS.text,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messageText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  
  // Settings Button
  settingsButton: {},
  iconButtonInner: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  
  // Bottom Controls
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  // Mode Button
  modeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
  },
  modeButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  modeButtonInactive: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
  },
  modeIcon: {
    fontSize: 16,
  },
  modeText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  
  // Dice
  diceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceContainerReady: {
    // Ready state styling handled by animation
  },
  diceCanvasWrapper: {
    width: 90,
    height: 90,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  rollLabel: {
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  rollLabelDisabled: {
    color: COLORS.textMuted,
  },
  
  spacer: {
    width: 90,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1A1A2E',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: COLORS.text,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  checkMark: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Start Button
  startButton: {
    marginTop: 8,
  },
  startButtonInner: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  startButtonText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
