import { useGameStore } from '@/src/game/state/gameState';
import { buildSoloSessionSnapshot } from '@/src/game/session/snapshots';
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
    isRolling,
    showEducationalModal,
    educationalModalDelayMs,
    currentTileContent,
    pendingEffect,
    roamMode,
    hapticsEnabled,
    setRoamMode,
    setShowCustomization,
    setGameStatus,
    openHelpCenter,
    closeHelpCenter,
    dismissEducationalModal,
    playerName,
    targetIndex,
    shirtColor,
    hairColor,
    skinColor,
    sessionHistory,
  } = useGameStore();

  const [showCelebration, setShowCelebration] = useState(false);
  const hasFinished = playerIndex === path.length - 1 && path.length > 1;
  const sessionSnapshot = buildSoloSessionSnapshot({
    playerName,
    playerIndex,
    targetIndex,
    isMoving,
    isRolling,
    showTileModal: showEducationalModal,
    lastMessage,
    shirtColor,
    hairColor,
    skinColor,
    hasFinished,
    history: sessionHistory,
  });

  useEffect(() => {
    if (sessionSnapshot.status === 'finished') {
      setShowCelebration(true);
    }
  }, [sessionSnapshot.status]);

  return (
    <>
      <GamePlayingHUD
        playerIndex={playerIndex}
        focusTileIndex={focusTileIndex}
        totalSteps={Math.max(path.length, 1)}
        tile={path[focusTileIndex] || path[playerIndex]}
        isMoving={isMoving}
        lastMessage={sessionSnapshot.message}
        roamMode={roamMode}
        hapticsEnabled={hapticsEnabled}
        showEducationalModal={sessionSnapshot.showTileModal}
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
        subtitle={sessionSnapshot.winnerMessage}
      />

      <EducationalModal
        visible={showEducationalModal}
        content={currentTileContent}
        pendingEffect={pendingEffect}
        path={path}
        focusTileIndex={focusTileIndex}
        playerIndex={playerIndex}
        onDismiss={dismissEducationalModal}
        openDelayMs={educationalModalDelayMs}
      />
    </>
  );
};
