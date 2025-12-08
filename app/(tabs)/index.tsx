import { Dice3D } from '@/src/game/Dice3D';
import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import { Canvas } from '@react-three/fiber/native';
import React from 'react';
import { Dimensions, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const DiceMenu = () => {
  const { rollDice, isRolling, isMoving } = useGameStore();
  const canRoll = !isRolling && !isMoving;

  return (
    <TouchableOpacity 
      style={styles.diceContainer} 
      onPress={rollDice}
      disabled={!canRoll}
      activeOpacity={0.9}
    >
      <View style={styles.diceCanvasWrapper} pointerEvents="none">
        <Canvas camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 5, 2]} intensity={1} />
          <Dice3D />
        </Canvas>
      </View>
      <Text style={styles.rollLabel}>{isRolling ? '...' : 'ROLL'}</Text>
    </TouchableOpacity>
  );
};

const CustomizationModal = () => {
  const { 
    showCustomization, 
    setShowCustomization,
    shirtColor,
    hairColor,
    setShirtColor,
    setHairColor
  } = useGameStore();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showCustomization}
      onRequestClose={() => setShowCustomization(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Customize Player</Text>
          
          <View style={styles.section}>
            <Text style={styles.label}>Shirt Color</Text>
            <View style={styles.colorRow}>
              {['#ff5555', '#5555ff', '#55ff55', '#ffff55'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.colorBtn, { backgroundColor: c, borderWidth: shirtColor === c ? 3 : 0 }]} 
                  onPress={() => setShirtColor(c)}
                />
              ))}
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>Hair Color</Text>
            <View style={styles.colorRow}>
              {['#4a3b2a', '#000000', '#eebb55', '#aa2222'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.colorBtn, { backgroundColor: c, borderWidth: hairColor === c ? 3 : 0 }]} 
                  onPress={() => setHairColor(c)}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowCustomization(false)}
          >
            <Text style={styles.closeButtonText}>START GAME</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const UIOverlay = () => {
  const { 
    lastMessage,
    playerIndex,
    roamMode,
    setRoamMode,
    setShowCustomization
  } = useGameStore();

  return (
    <View style={styles.overlayContainer}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.statsBox}>
          <Text style={styles.statsText}>Tile: {playerIndex}</Text>
        </View>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{lastMessage}</Text>
        </View>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={() => setShowCustomization(true)}
        >
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={[styles.lockButton, { backgroundColor: roamMode ? '#2ed573' : '#ff4757' }]} 
          onPress={() => setRoamMode(!roamMode)}
        >
          <Text style={styles.lockText}>{roamMode ? 'EXIT ROAM' : 'ROAM'}</Text>
        </TouchableOpacity>
        
        <DiceMenu />
        
        <View style={{ width: 80 }} />
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
    backgroundColor: '#111',
  },
  gameContainer: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  statsBox: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  statsText: { color: 'white', fontWeight: 'bold' },
  messageBox: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
    maxWidth: '50%',
  },
  messageText: { color: '#333', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
  },
  iconText: { fontSize: 20 },
  
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  diceContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceCanvasWrapper: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  rollLabel: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 5,
    fontSize: 12,
  },
  lockButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 20,
  },
  lockText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    color: '#aaa',
    marginBottom: 10,
    fontSize: 14,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: 'white',
  },
  closeButton: {
    backgroundColor: '#ff4757',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
