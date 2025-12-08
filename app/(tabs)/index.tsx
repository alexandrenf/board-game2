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

// Cartoon Color palette
const COLORS = {
  primary: '#FF9F89',    // Salmon/Coral
  secondary: '#FFD54F',  // Mustard/Yellow
  accent: '#81C784',     // Soft Green
  background: '#FFF8E7', // Cream/Ivory
  cardBg: '#FFFFFF',     // Pure White
  cardBorder: '#E0E0E0', 
  text: '#4E342E',       // Dark Brown
  textMuted: '#8D6E63',  // Lighter Brown
  shadow: 'rgba(78, 52, 46, 0.2)', // Brownish shadow
  success: '#81C784',
  warning: '#FFD54F',
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

// Cute card component (Solid, Shadow, Rounded)
const CuteCard: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <View style={[styles.cuteCard, style]}>
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
  
  const [activeTab, setActiveTab] = React.useState<'shirt' | 'hair'>('shirt');
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
          
          
          {/* Tabs */}
          <View style={styles.modalTabs}>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'shirt' && styles.modalTabActive]}
              onPress={() => setActiveTab('shirt')}
            >
              <Text style={[styles.modalTabText, activeTab === 'shirt' && styles.modalTabTextActive]}>
                👕 SHIRT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'hair' && styles.modalTabActive]}
              onPress={() => setActiveTab('hair')}
            >
              <Text style={[styles.modalTabText, activeTab === 'hair' && styles.modalTabTextActive]}>
                💇 HAIR
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            {activeTab === 'shirt' ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Pick your style:</Text>
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
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Pick your style:</Text>
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
            )}
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
      {/* Top Bar - Compact Pill */}
      <View style={styles.topBar}>
        <CuteCard style={styles.statsCard}>
          <Text style={styles.statsLabel}>Adventure Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.tileText}>{playerIndex}/{path.length - 1}</Text>
          </View>
        </CuteCard>
        
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

      {/* Bottom Dock - Unified Control Center */}
      <CuteCard style={styles.bottomDock}>
        {/* Camera Segmented Control */}
        <View style={styles.cameraSegmentedControl}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRoamMode(false)}
            style={styles.segmentOption}
          >
            {/* Active Indicator Background */}
            {!roamMode && (
              <Animated.View style={styles.segmentActiveBg} />
            )}
            <Text style={[styles.segmentText, !roamMode && styles.segmentTextActive]}>
              🎯 FOCUS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRoamMode(true)}
            style={styles.segmentOption}
          >
            {/* Active Indicator Background */}
            {roamMode && (
              <Animated.View style={styles.segmentActiveBg} />
            )}
            <Text style={[styles.segmentText, roamMode && styles.segmentTextActive]}>
              🖐️ FREE
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Dice is the centerpiece */}
        <DiceMenu />
        
        {/* Settings button moved to dock for easier reach */}
        <AnimatedButton 
          style={styles.dockSettingsButton}
          onPress={() => setShowCustomization(true)}
        >
          <Text style={styles.iconText}>⚙️</Text>
        </AnimatedButton>
      </CuteCard>

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
  
  // Cute Card
  cuteCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0, // Hard shadow for cartoon look
    elevation: 4,
    borderColor: COLORS.text, // Subtle border
    borderWidth: 2, // Cartoon outline
  },
  
  // Overlay
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 60, // More space from top notch
    paddingBottom: 40,
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Center the pill
    width: '100%',
  },
  statsCard: {
    minWidth: 200,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 12, // Thicker bar
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary, // Yellow bar
    borderRadius: 6,
  },
  tileText: {
    color: COLORS.text,
    fontWeight: '800', // Bolder text
    fontSize: 14,
  },
  
  // Message Toast
  messageToast: {
    backgroundColor: COLORS.primary, // Salmon toast
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.text,
    marginTop: 20, // push down a bit
  },
  messageText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  
  // Settings Button (Hidden from top bar now)
  settingsButton: { display: 'none' },
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
  
  // Bottom Controls (Legacy style removed/merged into dock)
  bottomControls: {
    display: 'none',
  },
  
  // Bottom Dock
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly', // Distribute evenly
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', // Ensure solid background
    gap: 12,
  },
  
  dockSettingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  
  // Camera Segmented Control
  cameraSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 4,
    height: 44,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  segmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 70,
  },
  segmentActiveBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary, // Salmon active
    borderRadius: 14,
    borderWidth: 2, // Cartoon border
    borderColor: COLORS.text, 
  },
  segmentText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
    zIndex: 1,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  
  // Dice
  diceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40, // Pop out of the dock slightly
  },
  diceContainerReady: {
    // Ready state styling handled by animation
  },
  diceCanvasWrapper: {
    width: 80, // Slightly smaller to fit Better
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3, // Thick border
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow, // Card shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  rollLabel: {
    color: COLORS.text,
    fontWeight: '900',
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rollLabelDisabled: {
    color: COLORS.textMuted,
    opacity: 0.6,
  },
  
  spacer: {
    width: 90,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(78, 52, 46, 0.4)', // Warm brown dimmer
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 3, // Thick border
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 4 }, // Pop out shadow
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900', // Extra bold
    textAlign: 'center',
  },
  
  // Modal Tabs
  modalTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  modalTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  modalTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
  },
  modalTabText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  modalTabTextActive: {
    color: COLORS.text,
    fontWeight: '900',
  },
  modalBody: {
    minHeight: 160, // Prevent layout shift
    justifyContent: 'center',
  },
  
  // Sections
  section: {
    marginBottom: 10,
    alignItems: 'center',
  },
  sectionLabel: {
    color: COLORS.textMuted,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // More spacing
    justifyContent: 'center',
  },
  colorOption: {
    width: 56, // Larger touch target
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: COLORS.text,
    transform: [{ scale: 1.1 }],
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },
  checkMark: {
    color: COLORS.text,
    fontSize: 24, // Larger check
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
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
