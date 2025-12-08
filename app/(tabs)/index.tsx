import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UIOverlay = () => {
  const { 
    rollDice, 
    isRolling, 
    isMoving, 
    currentRoll, 
    playerIndex, 
    lastMessage,
    shirtColor,
    hairColor,
    setShirtColor,
    setHairColor
  } = useGameStore();

  const canRoll = !isRolling && !isMoving;

  return (
    <View style={styles.overlayContainer}>
      {/* Top Info Bubble */}
      {lastMessage && (
        <View style={styles.bubbleContainer}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{lastMessage}</Text>
          </View>
          <View style={styles.bubbleTail} />
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>Tile: {playerIndex}</Text>
          <Text style={styles.statText}>Roll: {currentRoll ?? '-'}</Text>
        </View>

        {/* Customization */}
        <View style={styles.customizationContainer}>
          <Text style={styles.sectionTitle}>Customization</Text>
          <View style={styles.colorRow}>
            <Text style={styles.label}>Shirt:</Text>
            {['#ff5555', '#5555ff', '#55ff55'].map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.colorBtn, { backgroundColor: c, borderWidth: shirtColor === c ? 2 : 0 }]} 
                onPress={() => setShirtColor(c)}
              />
            ))}
          </View>
          <View style={styles.colorRow}>
            <Text style={styles.label}>Hair:</Text>
            {['#4a3b2a', '#000000', '#eebb55'].map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.colorBtn, { backgroundColor: c, borderWidth: hairColor === c ? 2 : 0 }]} 
                onPress={() => setHairColor(c)}
              />
            ))}
          </View>
        </View>

        {/* Roll Button */}
        <TouchableOpacity 
          style={[styles.rollButton, !canRoll && styles.disabledButton]} 
          onPress={rollDice}
          disabled={!canRoll}
        >
          <Text style={styles.rollButtonText}>
            {isRolling ? 'Rolling...' : isMoving ? 'Moving...' : 'ROLL DICE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.gameContainer}>
        <GameScene />
      </View>
      <UIOverlay />
    </SafeAreaView>
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
    padding: 20,
    pointerEvents: 'box-none', // Allow touches to pass through to canvas where not covered
  },
  bubbleContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  bubble: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bubbleText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
  controlsContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customizationContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  label: {
    color: 'white',
    marginRight: 10,
    width: 40,
  },
  colorBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderColor: 'white',
  },
  rollButton: {
    backgroundColor: '#ff5555',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  rollButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
