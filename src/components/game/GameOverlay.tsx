import { useGameStore } from '@/src/game/state/gameState';
import React, { useEffect, useState } from 'react';
import { CelebrationOverlay } from './CelebrationOverlay';
import { EducationalModal } from './EducationalModal';
import { GamePlayingHUD } from './GamePlayingHUD';

export const GameOverlay: React.FC = () => {
  const {
    lastMessage,
    playerIndex,
    focusTileIndex,
    path,
    isMoving,
    showEducationalModal,
    roamMode,
    hapticsEnabled,
    setRoamMode,
    setShowCustomization,
    setGameStatus,
    openHelpCenter,
    closeHelpCenter,
  } = useGameStore();

  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (playerIndex === path.length - 1 && path.length > 1) {
      setShowCelebration(true);
    }
  }, [path.length, playerIndex]);

  return (
    <>
      <GamePlayingHUD
        playerIndex={playerIndex}
        focusTileIndex={focusTileIndex}
        totalSteps={Math.max(path.length, 1)}
        tile={path[focusTileIndex] || path[playerIndex]}
        isMoving={isMoving}
        lastMessage={lastMessage}
        roamMode={roamMode}
        hapticsEnabled={hapticsEnabled}
        showEducationalModal={showEducationalModal}
        onMenuPress={() => {
          closeHelpCenter();
          setGameStatus('menu');
        }}
        onHelpPress={() => {
          openHelpCenter('como-jogar');
        }}
        onSettingsPress={() => {
          openHelpCenter('qualidade');
        }}
        onToggleCamera={() => {
          setRoamMode(!roamMode);
        }}
        onCharacterPress={() => {
          setShowCustomization(true);
        }}
        onEducationalModalShown={closeHelpCenter}
      />

      <CelebrationOverlay
        visible={showCelebration}
        onDismiss={() => {
          setShowCelebration(false);
          setGameStatus('menu');
        }}
      />

      <EducationalModal />
    </>
  );
};
