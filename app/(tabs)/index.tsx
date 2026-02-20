import { CustomizationModal } from '@/src/components/game/CustomizationModal';
import { GameOverlay } from '@/src/components/game/GameOverlay';
import { MainMenuOverlay } from '@/src/components/game/MainMenuOverlay';
import { COLORS } from '@/src/constants/colors';
import { GameScene } from '@/src/game/GameScene';
import { useGameStore } from '@/src/game/state/gameState';
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

export default function App() {
  const { gameStatus, showCustomization } = useGameStore();

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
    pointerEvents: 'box-none',
  },
});
