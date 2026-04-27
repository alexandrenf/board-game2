import { QUIZ_SOURCES, QuizSourceId } from '@/src/content/quizQuestions';
import { useGameStore } from '@/src/game/state/gameState';
import { buildSoloSessionSnapshot } from '@/src/game/session/snapshots';
import React, { useEffect, useMemo, useState } from 'react';
import { CelebrationOverlay } from './CelebrationOverlay';
import { EducationalModal } from './EducationalModal';
import { GamePlayingHUD } from './GamePlayingHUD';
import { QuizModal } from './QuizModal';

/** Composes the solo-game overlay: HUD, educational modal, quiz modal, and celebration. */
export const GameOverlay: React.FC = () => {
  const lastMessage = useGameStore((s) => s.lastMessage);
  const playerIndex = useGameStore((s) => s.playerIndex);
  const focusTileIndex = useGameStore((s) => s.focusTileIndex);
  const path = useGameStore((s) => s.path);
  const isMoving = useGameStore((s) => s.isMoving);
  const isRolling = useGameStore((s) => s.isRolling);
  const showEducationalModal = useGameStore((s) => s.showEducationalModal);
  const educationalModalDelayMs = useGameStore((s) => s.educationalModalDelayMs);
  const currentTileContent = useGameStore((s) => s.currentTileContent);
  const pendingEffect = useGameStore((s) => s.pendingEffect);
  const quizPhase = useGameStore((s) => s.quizPhase);
  const currentQuiz = useGameStore((s) => s.currentQuiz);
  const quizAnswer = useGameStore((s) => s.quizAnswer);
  const quizPoints = useGameStore((s) => s.quizPoints);
  const submitQuizAnswer = useGameStore((s) => s.submitQuizAnswer);
  const dismissQuizFeedback = useGameStore((s) => s.dismissQuizFeedback);
  const roamMode = useGameStore((s) => s.roamMode);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const setRoamMode = useGameStore((s) => s.setRoamMode);
  const setShowCustomization = useGameStore((s) => s.setShowCustomization);
  const setGameStatus = useGameStore((s) => s.setGameStatus);
  const openHelpCenter = useGameStore((s) => s.openHelpCenter);
  const closeHelpCenter = useGameStore((s) => s.closeHelpCenter);
  const dismissEducationalModal = useGameStore((s) => s.dismissEducationalModal);
  const playerName = useGameStore((s) => s.playerName);
  const targetIndex = useGameStore((s) => s.targetIndex);
  const shirtColor = useGameStore((s) => s.shirtColor);
  const hairColor = useGameStore((s) => s.hairColor);
  const skinColor = useGameStore((s) => s.skinColor);
  const sessionHistory = useGameStore((s) => s.sessionHistory);

  const [showCelebration, setShowCelebration] = useState(false);
  const hasFinished = playerIndex === path.length - 1 && path.length > 1;
  const quizModalVisible = quizPhase === 'answering' || quizPhase === 'feedback';
  const sourceLinks = useMemo(() => {
    const ids = currentQuiz?.question.sourceIds ?? [];
    const links: { title: string; url: string }[] = [];
    for (const id of ids) {
      if (typeof QUIZ_SOURCES[id as QuizSourceId] !== 'undefined') {
        links.push(QUIZ_SOURCES[id as QuizSourceId]!);
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn(`Unresolved source id: ${id} for question ${currentQuiz?.question.id}`);
      }
    }
    return links;
  }, [currentQuiz?.question.sourceIds, currentQuiz?.question.id]);
  const scoreboardPlayers = quizPoints >= 0
    ? [{ id: 'solo', name: playerName.trim() || 'Você', points: quizPoints, isMe: true }]
    : undefined;
  const sessionSnapshot = buildSoloSessionSnapshot({
    playerName,
    playerIndex,
    targetIndex,
    isMoving,
    isRolling,
    showTileModal: showEducationalModal || quizModalVisible,
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
        quizPhase={quizPhase}
        scoreboardPlayers={scoreboardPlayers}
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

      <QuizModal
        visible={quizModalVisible}
        tileContent={currentTileContent}
        quiz={currentQuiz}
        quizAnswer={quizAnswer}
        quizPhase={quizPhase === 'feedback' ? 'feedback' : 'answering'}
        path={path}
        focusTileIndex={focusTileIndex}
        onSubmitAnswer={submitQuizAnswer}
        onDismissFeedback={dismissQuizFeedback}
        sourceLinks={sourceLinks}
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
