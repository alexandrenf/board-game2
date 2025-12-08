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
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

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
  danger: '#FF6B6B',
  info: '#4FC3F7',
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
      toValue: 0.95,
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

// Cute card component
const CuteCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  variant?: 'default' | 'primary' | 'secondary';
}> = ({ children, style, variant = 'default' }) => {
  let bg = COLORS.cardBg;
  let border = COLORS.cardBorder;
  
  if (variant === 'primary') {
    bg = COLORS.primary;
    border = COLORS.text;
  } else if (variant === 'secondary') {
    bg = COLORS.secondary;
    border = COLORS.text;
  }

  return (
    <View style={[styles.cuteCard, { backgroundColor: bg, borderColor: border }, style]}>
      {children}
    </View>
  );
};

// Dice menu component
const DiceMenu: React.FC = () => {
  const { rollDice, isRolling, isMoving } = useGameStore();
  const canRoll = !isRolling && !isMoving;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
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
          {isRolling ? '...' : canRoll ? 'JOGAR' : 'ESPERA'}
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
    setHairColor,
    gameStatus,
    startGame
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
    { color: '#4ECDC4', name: 'Ciano' },
    { color: '#95E1D3', name: 'Menta' },
    { color: '#FFE66D', name: 'Amarelo' },
    { color: '#DDA0DD', name: 'Ameixa' },
    { color: '#87CEEB', name: 'Céu' },
  ];
  
  const hairColors = [
    { color: '#4A3B2A', name: 'Castanho' },
    { color: '#1A1A2E', name: 'Preto' },
    { color: '#D4A574', name: 'Loiro' },
    { color: '#8B4513', name: 'Ruivo' },
    { color: '#E6B8A2', name: 'Cobre' },
    { color: '#6B5B95', name: 'Roxo' },
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
            <Text style={styles.modalTitle}>Personalizar</Text>
          </View>
          
          <View style={styles.modalTabs}>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'shirt' && styles.modalTabActive]}
              onPress={() => setActiveTab('shirt')}
            >
              <Text style={[styles.modalTabText, activeTab === 'shirt' && styles.modalTabTextActive]}>
                👕 ROUPA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'hair' && styles.modalTabActive]}
              onPress={() => setActiveTab('hair')}
            >
              <Text style={[styles.modalTabText, activeTab === 'hair' && styles.modalTabTextActive]}>
                💇 CABELO
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.colorGrid}>
              {(activeTab === 'shirt' ? shirtColors : hairColors).map(({ color, name }) => (
                <AnimatedButton 
                  key={color}
                  onPress={() => activeTab === 'shirt' ? setShirtColor(color) : setHairColor(color)}
                >
                  <View style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    (activeTab === 'shirt' ? shirtColor : hairColor) === color && styles.colorOptionSelected,
                  ]}>
                    {(activeTab === 'shirt' ? shirtColor : hairColor) === color && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                </AnimatedButton>
              ))}
            </View>
          </View>

          <AnimatedButton 
            style={styles.startButton} 
            onPress={() => {
              setShowCustomization(false);
              // If we are in menu, this might be how we "save and close"
            }}
          >
            <View style={styles.startButtonInner}>
              <Text style={styles.startButtonText}>SALVAR</Text>
            </View>
          </AnimatedButton>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Message toast
const MessageToast: React.FC<{ message: string | null }> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevMessage = useRef(message);
  
  useEffect(() => {
    if (message && message !== prevMessage.current) {
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
            { scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
          ],
        }
      ]}
    >
      <Text style={styles.messageText}>{message}</Text>
    </Animated.View>
  );
};

// --- NEW COMPONENTS ---

// Game UI Overlay (When playing)
const GameOverlay: React.FC = () => {
  const { 
    lastMessage,
    playerIndex,
    path,
    roamMode,
    setRoamMode,
    setShowCustomization,
    setGameStatus
  } = useGameStore();
  
  const progress = path.length > 0 ? (playerIndex / (path.length - 1)) * 100 : 0;

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Top Bar */}
      <View style={styles.topBar}>
        <AnimatedButton 
          style={styles.backButton}
          onPress={() => setGameStatus('menu')}
        >
          <Text style={styles.backButtonText}>🏠</Text>
        </AnimatedButton>

        <CuteCard style={styles.statsCard}>
          <Text style={styles.statsLabel}>NÍVEL 1</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.tileText}>{playerIndex}/{path.length - 1}</Text>
          </View>
        </CuteCard>
        
        <View style={{ width: 44 }} /> 
      </View>
      
      <MessageToast message={lastMessage} />

      {/* Bottom Dock */}
      <View style={styles.bottomDockWrapper} pointerEvents="box-none">
        <CuteCard style={styles.bottomDock}>
          <View style={styles.cameraToggle}>
             <TouchableOpacity onPress={() => setRoamMode(!roamMode)}>
               <Text style={{ fontSize: 24, opacity: roamMode ? 1 : 0.5 }}>
                 {roamMode ? '🖐️' : '🎥'}
               </Text>
             </TouchableOpacity>
          </View>
          
          <DiceMenu />
          
          <AnimatedButton 
            style={styles.dockButton}
            onPress={() => setShowCustomization(true)}
          >
            <Text style={styles.dockIcon}>👕</Text>
          </AnimatedButton>
        </CuteCard>
      </View>
    </View>
  );
};

// Main Menu Overlay (Home Screen)
const MainMenuOverlay: React.FC = () => {
  const { 
    startGame, 
    setShowCustomization,
    playerIndex,
    path
  } = useGameStore();
  
  const progress = Math.round((playerIndex / Math.max(1, path.length - 1)) * 100);

  return (
    <SafeAreaView style={styles.menuContainer}>
      <View style={styles.menuContent}>
        
        {/* Title Area */}
        <View style={styles.titleContainer}>
          <Text style={styles.gameTitle}>TINY</Text>
          <Text style={styles.gameTitleAccent}>QUEST</Text>
        </View>

        {/* Highlight Card */}
        <CuteCard style={styles.highlightCard}>
          <View style={styles.highlightHeader}>
            <Text style={styles.highlightLabel}>AVENTURA ATUAL</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NVL 1</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
             <View style={styles.statItem}>
               <Text style={styles.statValue}>{progress}%</Text>
               <Text style={styles.statLabel}>COMPLETO</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statItem}>
               <Text style={styles.statValue}>{playerIndex}</Text>
               <Text style={styles.statLabel}>PASSOS</Text>
             </View>
          </View>

          <AnimatedButton 
             style={styles.mainPlayButton} 
             onPress={startGame}
          >
             <Text style={styles.mainPlayText}>
               {playerIndex > 0 ? 'CONTINUAR JORNADA' : 'INICIAR AVENTURA'}
             </Text>
          </AnimatedButton>
        </CuteCard>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
          <AnimatedButton 
            style={styles.gridButton} 
            onPress={() => setShowCustomization(true)}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.gridIcon}>👕</Text>
            </View>
            <Text style={styles.gridLabel}>ROUPA</Text>
          </AnimatedButton>

          <AnimatedButton style={styles.gridButton} onPress={() => {}}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.gridIcon}>🎁</Text>
            </View>
            <Text style={styles.gridLabel}>PRÊMIOS</Text>
          </AnimatedButton>

          <AnimatedButton style={styles.gridButton} onPress={() => {}}>
             <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.gridIcon}>🏆</Text>
             </View>
             <Text style={styles.gridLabel}>RANK</Text>
          </AnimatedButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  const { gameStatus } = useGameStore();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 3D Background always separate safe layer */}
      <View style={styles.gameLayer}>
        <GameScene />
      </View>
      
      {/* UI Layer */}
      <View style={styles.uiLayer} pointerEvents="box-none">
        {gameStatus === 'menu' ? <MainMenuOverlay /> : <GameOverlay />}
      </View>

      <CustomizationModal />
    </View>
  );
}

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
  },
  
  // Menu Styles
  menuContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  menuContent: {
    paddingHorizontal: 24,
    gap: 20,
  },
  titleContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  gameTitleAccent: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: -15,
    letterSpacing: 2,
    textShadowColor: COLORS.text, // outline effect
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  
  highlightCard: {
    padding: 24,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)', // Slightly transparent
    gap: 20,
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.text,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EEEEEE',
  },
  mainPlayButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  mainPlayText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  gridButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridIcon: {
    fontSize: 22,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  
  // Game Overlay Styles
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  backButtonText: {
    fontSize: 20,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  tileText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  
  bottomDockWrapper: {
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  dockButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  dockIcon: { fontSize: 20 },
  cameraToggle: {
    width: 50,
    alignItems: 'center',
  },

  // Shared / Legacy
  cuteCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0, 
    elevation: 4,
    borderColor: COLORS.text, 
    borderWidth: 2,
  },
  diceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  diceCanvasWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
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
  },
  rollLabelDisabled: {
    color: COLORS.textMuted,
    opacity: 0.6,
  },
  
  messageToast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.text,
    zIndex: 10,
  },
  messageText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },

  // Modal (Partial)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(78, 52, 46, 0.4)',
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
    borderWidth: 3,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalEmoji: { fontSize: 40 },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  modalTabActive: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: COLORS.text,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalTabText: { fontWeight: '700', color: COLORS.textMuted },
  modalTabTextActive: { fontWeight: '900', color: COLORS.text },
  modalBody: { minHeight: 140, justifyContent: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorOption: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: 'transparent',
    justifyContent: 'center', alignItems: 'center'
  },
  colorOptionSelected: { borderColor: COLORS.text, transform: [{scale:1.1}] },
  checkMark: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  startButton: { marginTop: 20 },
  startButtonInner: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  startButtonText: { fontWeight: '900', fontSize: 16, color: COLORS.text },
});
