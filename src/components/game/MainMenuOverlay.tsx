import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export const MainMenuOverlay: React.FC = () => {
  const { 
    startGame, 
    setShowCustomization,
    playerIndex,
    path,
    resetGame
  } = useGameStore();
  
  const progress = Math.round((playerIndex / Math.max(1, path.length - 1)) * 100);
  const isComplete = playerIndex === path.length - 1 && path.length > 1;
  const stepsRemaining = Math.max(0, Math.max(1, path.length - 1) - playerIndex);
  const isContinuing = !isComplete && playerIndex > 0;

  return (
    <SafeAreaView style={styles.menuContainer}>
      <View style={styles.menuContent}>
        <View style={styles.titleStack}>
          <Text style={styles.gameTitle}>Jogo informativo sobre prevenção combinada</Text>
        </View>

        <CuteCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {isComplete ? 'Percurso concluído' : 'Pronto para o próximo passo'}
          </Text>
          <Text style={styles.heroSubtitleSmall}>
            {isComplete ? 'Revise cada etapa e compartilhe dicas.' : 'Lance o dado e percorra as etapas da prevenção combinada.'}
          </Text>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>
            <View style={styles.timelineTrack}>
              <View style={[styles.timelineFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.compactStats}>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>Passos</Text>
                <Text style={styles.statChipValue}>{playerIndex}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>Faltam</Text>
                <Text style={styles.statChipValue}>{stepsRemaining}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>Status</Text>
                <Text style={styles.statChipValue}>{isComplete ? 'Finalizado' : 'Em jogo'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.primaryActionsColumn}>
            <AnimatedButton 
              style={styles.mainPlayButton} 
              onPress={() => {
                triggerHaptic('success');
                if (isComplete) {
                  resetGame();
                } else {
                  startGame();
                }
              }}
              hapticStyle="success"
            >
              <View>
                <Text style={styles.mainPlayText}>
                  {isComplete ? '🔄 Nova jornada' : isContinuing ? '▶️ Continuar' : '🚀 Iniciar agora'}
                </Text>
                {!isContinuing && (
                  <Text style={styles.mainPlaySubtext}>
                    {isComplete ? 'Reforce os conceitos-chave' : 'Conteúdo pronto para avançar'}
                  </Text>
                )}
              </View>
            </AnimatedButton>

            <AnimatedButton 
              style={styles.secondaryButton} 
              onPress={() => {
                triggerHaptic('light');
                setShowCustomization(true);
              }}
              hapticStyle="light"
            >
              <Text style={styles.secondaryButtonText}>Roupa</Text>
              <Text style={styles.secondaryButtonHint}>Cores, avatar e estilo</Text>
            </AnimatedButton>
          </View>
        </CuteCard>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  menuContent: {
    paddingHorizontal: 24,
    gap: 22,
  },
  titleStack: {
    gap: 10,
  },
  gameTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  heroCard: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    gap: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  heroSubtitleSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  progressBlock: {
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },
  timelineTrack: {
    position: 'relative',
    height: 16,
    backgroundColor: '#F1E8DF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  timelineFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  compactStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  statChipValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  primaryActionsColumn: {
    gap: 10,
    marginTop: 6,
  },
  mainPlayButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  mainPlaySubtext: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    minWidth: 140,
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  secondaryButtonHint: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
