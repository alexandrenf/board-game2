import { Dice3D } from '@/src/game/Dice3D';
import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import { Canvas } from '@react-three/fiber/native';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
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
  gold: '#FFD700',
  purple: '#9C27B0',
};

// Haptic feedback helper
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (Platform.OS === 'web') return;
  
  switch (style) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
};

// Animated button component with spring physics and haptics
const AnimatedButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'success';
}> = ({ onPress, disabled, style, children, hapticStyle = 'light' }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    triggerHaptic(hapticStyle);
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
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }, disabled && styles.buttonDisabled]}>
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

// Confetti particle component
const ConfettiParticle: React.FC<{
  delay: number;
  color: string;
  startX: number;
}> = ({ delay, color, startX }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height + 50,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX + (Math.random() - 0.5) * 100,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 720,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, startX, translateY, translateX, rotate, opacity]);

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotate.interpolate({
              inputRange: [0, 720],
              outputRange: ['0deg', '720deg'],
            })},
          ],
          opacity,
        },
      ]}
    />
  );
};

// Celebration overlay
const CelebrationOverlay: React.FC<{ visible: boolean; onDismiss: () => void }> = ({ visible, onDismiss }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#FFD54F', '#95E1D3', '#DDA0DD', '#87CEEB'];
  
  useEffect(() => {
    if (visible) {
      triggerHaptic('success');
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  if (!visible) return null;

  return (
    <View style={styles.celebrationOverlay}>
      {/* Confetti */}
      {Array.from({ length: 30 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 50}
          color={confettiColors[i % confettiColors.length]}
          startX={(i / 30) * width}
        />
      ))}
      
      <Animated.View style={[styles.celebrationCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.celebrationEmoji}>🎉</Text>
        <Text style={styles.celebrationTitle}>PARABÉNS!</Text>
        <Text style={styles.celebrationSubtitle}>Você completou a jornada!</Text>
        
        <View style={styles.celebrationStats}>
          <View style={styles.celebrationStatItem}>
            <Text style={styles.celebrationStatValue}>⭐</Text>
            <Text style={styles.celebrationStatLabel}>3 Estrelas</Text>
          </View>
          <View style={styles.celebrationStatItem}>
            <Text style={styles.celebrationStatValue}>🏆</Text>
            <Text style={styles.celebrationStatLabel}>Novo Recorde</Text>
          </View>
        </View>
        
        <AnimatedButton style={styles.celebrationButton} onPress={onDismiss} hapticStyle="medium">
          <Text style={styles.celebrationButtonText}>CONTINUAR</Text>
        </AnimatedButton>
      </Animated.View>
    </View>
  );
};

// Camera mode indicator
const CameraModeIndicator: React.FC<{ isRoamMode: boolean }> = ({ isRoamMode }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isRoamMode ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [isRoamMode, slideAnim]);

  return (
    <View style={styles.cameraModeContainer}>
      <View style={styles.cameraModeTrack}>
        <Animated.View 
          style={[
            styles.cameraModeIndicator,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 38],
                })
              }],
              backgroundColor: isRoamMode ? COLORS.accent : COLORS.primary,
            }
          ]} 
        />
        <View style={styles.cameraModeOption}>
          <Text style={[styles.cameraModeIcon, !isRoamMode && styles.cameraModeActive]}>🎥</Text>
        </View>
        <View style={styles.cameraModeOption}>
          <Text style={[styles.cameraModeIcon, isRoamMode && styles.cameraModeActive]}>🖐️</Text>
        </View>
      </View>
      <Text style={styles.cameraModeLabel}>
        {isRoamMode ? 'Explorar' : 'Seguir'}
      </Text>
    </View>
  );
};



// Sound toggle button (UI preparation for future sound implementation)
const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  
  const handleToggle = () => {
    triggerHaptic('light');
    setIsMuted(!isMuted);
  };
  
  return (
    <TouchableOpacity style={styles.soundToggle} onPress={handleToggle}>
      <Text style={styles.soundToggleIcon}>{isMuted ? '🔇' : '🔊'}</Text>
    </TouchableOpacity>
  );
};

// Zoom controls component
const ZoomControls: React.FC = () => {
  const { zoomIn, zoomOut, zoomLevel } = useGameStore();
  
  const handleZoomIn = () => {
    triggerHaptic('light');
    zoomIn();
  };
  
  const handleZoomOut = () => {
    triggerHaptic('light');
    zoomOut();
  };
  
  // Calculate if we're at limits
  const isMaxZoom = zoomLevel <= 5;
  const isMinZoom = zoomLevel >= 60;
  
  return (
    <View style={styles.zoomControls}>
      <AnimatedButton 
        style={[styles.zoomButton, isMaxZoom && styles.zoomButtonDisabled]} 
        onPress={handleZoomIn}
        disabled={isMaxZoom}
        hapticStyle="light"
      >
        <Text style={[styles.zoomButtonText, isMaxZoom && styles.zoomButtonTextDisabled]}>+</Text>
      </AnimatedButton>
      <View style={styles.zoomDivider} />
      <AnimatedButton 
        style={[styles.zoomButton, isMinZoom && styles.zoomButtonDisabled]} 
        onPress={handleZoomOut}
        disabled={isMinZoom}
        hapticStyle="light"
      >
        <Text style={[styles.zoomButtonText, isMinZoom && styles.zoomButtonTextDisabled]}>−</Text>
      </AnimatedButton>
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



  const handleRoll = () => {
    if (canRoll) {
      triggerHaptic('heavy');
      rollDice();
    }
  };

  return (
    <View style={styles.diceMenuWrapper}>
      <AnimatedButton onPress={handleRoll} disabled={!canRoll} hapticStyle="heavy">
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
          <View style={[styles.rollLabelContainer, !canRoll && styles.rollLabelContainerDisabled]}>
            <Text style={[styles.rollLabel, !canRoll && styles.rollLabelDisabled]}>
              {isRolling ? '🎲' : canRoll ? 'JOGAR' : 'ESPERA'}
            </Text>
          </View>
        </Animated.View>
      </AnimatedButton>
    </View>
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

  const handleColorSelect = (color: string) => {
    triggerHaptic('light');
    if (activeTab === 'shirt') {
      setShirtColor(color);
    } else {
      setHairColor(color);
    }
  };

  const handleTabChange = (tab: 'shirt' | 'hair') => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

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
              onPress={() => handleTabChange('shirt')}
            >
              <Text style={[styles.modalTabText, activeTab === 'shirt' && styles.modalTabTextActive]}>
                👕 ROUPA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'hair' && styles.modalTabActive]}
              onPress={() => handleTabChange('hair')}
            >
              <Text style={[styles.modalTabText, activeTab === 'hair' && styles.modalTabTextActive]}>
                💇 CABELO
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.colorGrid}>
              {(activeTab === 'shirt' ? shirtColors : hairColors).map(({ color }) => (
                <AnimatedButton 
                  key={color}
                  onPress={() => handleColorSelect(color)}
                  hapticStyle="light"
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
              triggerHaptic('success');
              setShowCustomization(false);
            }}
            hapticStyle="success"
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

// Enhanced message toast with icons
const MessageToast: React.FC<{ message: string | null }> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevMessage = useRef(message);
  
  // Determine icon and color based on message content
  const getMessageStyle = (msg: string | null) => {
    if (!msg) return { icon: '💬', color: COLORS.primary };
    if (msg.includes('Tirou')) return { icon: '🎲', color: COLORS.secondary };
    if (msg.includes('Chegou')) return { icon: '📍', color: COLORS.accent };
    if (msg.includes('Rolando')) return { icon: '⏳', color: COLORS.info };
    if (msg.includes('Bem-vindo')) return { icon: '👋', color: COLORS.primary };
    return { icon: '💬', color: COLORS.primary };
  };
  
  const { icon, color } = getMessageStyle(message);
  
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
        { backgroundColor: color },
        {
          opacity: fadeAnim,
          transform: [
            { scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
          ],
        }
      ]}
    >
      <Text style={styles.messageIcon}>{icon}</Text>
      <Text style={styles.messageText}>{message}</Text>
    </Animated.View>
  );
};

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
  
  const [showCelebration, setShowCelebration] = useState(false);
  const progress = path.length > 0 ? (playerIndex / (path.length - 1)) * 100 : 0;
  
  // Check for win condition
  useEffect(() => {
    if (playerIndex === path.length - 1 && path.length > 1) {
      setShowCelebration(true);
    }
  }, [playerIndex, path.length]);

  const handleCameraToggle = () => {
    triggerHaptic('medium');
    setRoamMode(!roamMode);
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Top Bar */}
      <View style={styles.topBar}>
        <AnimatedButton 
          style={styles.backButton}
          onPress={() => {
            triggerHaptic('medium');
            setGameStatus('menu');
          }}
          hapticStyle="medium"
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
        
        <SoundToggle />
      </View>
      
      <MessageToast message={lastMessage} />
      
      {/* Zoom Controls - positioned on right side */}
      <ZoomControls />

      {/* Bottom Dock */}
      <View style={styles.bottomDockWrapper} pointerEvents="box-none">
        <CuteCard style={styles.bottomDock}>
          <TouchableOpacity onPress={handleCameraToggle}>
            <CameraModeIndicator isRoamMode={roamMode} />
          </TouchableOpacity>
          
          <DiceMenu />
          
          <AnimatedButton 
            style={styles.dockButton}
            onPress={() => {
              triggerHaptic('light');
              setShowCustomization(true);
            }}
            hapticStyle="light"
          >
            <Text style={styles.dockIcon}>👕</Text>
          </AnimatedButton>
        </CuteCard>
      </View>
      
      <CelebrationOverlay 
        visible={showCelebration} 
        onDismiss={() => {
          setShowCelebration(false);
          setGameStatus('menu');
        }} 
      />
    </View>
  );
};

// Main Menu Overlay (Home Screen)
const MainMenuOverlay: React.FC = () => {
  const { 
    startGame, 
    setShowCustomization,
    playerIndex,
    path,
    resetGame
  } = useGameStore();
  
  const progress = Math.round((playerIndex / Math.max(1, path.length - 1)) * 100);
  const isComplete = playerIndex === path.length - 1 && path.length > 1;

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

          {isComplete ? (
            <AnimatedButton 
               style={styles.mainPlayButton} 
               onPress={() => {
                 triggerHaptic('success');
                 resetGame();
               }}
               hapticStyle="success"
            >
               <Text style={styles.mainPlayText}>
                 🔄 NOVA JORNADA
               </Text>
            </AnimatedButton>
          ) : (
            <AnimatedButton 
               style={styles.mainPlayButton} 
               onPress={() => {
                 triggerHaptic('success');
                 startGame();
               }}
               hapticStyle="success"
            >
               <Text style={styles.mainPlayText}>
                 {playerIndex > 0 ? '▶️ CONTINUAR JORNADA' : '🚀 INICIAR AVENTURA'}
               </Text>
            </AnimatedButton>
          )}
        </CuteCard>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
          <AnimatedButton 
            style={styles.gridButton} 
            onPress={() => {
              triggerHaptic('light');
              setShowCustomization(true);
            }}
            hapticStyle="light"
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.gridIcon}>👕</Text>
            </View>
            <Text style={styles.gridLabel}>ROUPA</Text>
          </AnimatedButton>

          <AnimatedButton 
            style={styles.gridButton} 
            onPress={() => triggerHaptic('light')}
            hapticStyle="light"
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.gridIcon}>🎁</Text>
            </View>
            <Text style={styles.gridLabel}>PRÊMIOS</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>EM BREVE</Text>
            </View>
          </AnimatedButton>

          <AnimatedButton 
            style={styles.gridButton} 
            onPress={() => triggerHaptic('light')}
            hapticStyle="light"
          >
             <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.gridIcon}>🏆</Text>
             </View>
             <Text style={styles.gridLabel}>RANK</Text>
             <View style={styles.comingSoonBadge}>
               <Text style={styles.comingSoonText}>EM BREVE</Text>
             </View>
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
  
  // Disabled button state
  buttonDisabled: {
    opacity: 0.6,
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
    textShadowColor: COLORS.text,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  
  highlightCard: {
    padding: 24,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
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
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFF',
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
  
  // Sound toggle
  soundToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  soundToggleIcon: {
    fontSize: 20,
  },
  

  // Camera Mode
  cameraModeContainer: {
    alignItems: 'center',
  },
  cameraModeTrack: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 2,
    width: 76,
    height: 36,
  },
  cameraModeIndicator: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    top: 2,
  },
  cameraModeOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraModeIcon: {
    fontSize: 16,
    opacity: 0.4,
  },
  cameraModeActive: {
    opacity: 1,
  },
  cameraModeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginTop: 4,
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

  // Dice Menu
  diceMenuWrapper: {
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
  rollLabelContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  rollLabelContainerDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#BDBDBD',
  },
  rollLabel: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  rollLabelDisabled: {
    color: COLORS.textMuted,
  },
  
  messageToast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.text,
    zIndex: 10,
  },
  messageIcon: {
    fontSize: 16,
  },
  messageText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // Modal
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
  checkMark: { color: '#FFF', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
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
  
  // Celebration
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    maxWidth: 300,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  celebrationSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  celebrationStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
    marginBottom: 24,
  },
  celebrationStatItem: {
    alignItems: 'center',
  },
  celebrationStatValue: {
    fontSize: 32,
  },
  celebrationStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  celebrationButton: {
    width: '100%',
  },
  celebrationButtonText: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    textAlign: 'center',
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    overflow: 'hidden',
  },
  
  // Confetti
  confettiParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  
  // Zoom Controls
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: '40%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  zoomButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 8,
  },
});
