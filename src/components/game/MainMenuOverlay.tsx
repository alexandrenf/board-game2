import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { BRAND, COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Rainbow stripe decoration component
const RainbowStripes: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => {
  const colors = [BRAND.orange, BRAND.pink, BRAND.red, BRAND.purple, BRAND.blue, BRAND.green, BRAND.teal];
  const isTop = position === 'top';
  
  return (
    <View style={[styles.stripesContainer, isTop ? styles.stripesTop : styles.stripesBottom]}>
      {colors.map((color, index) => (
        <View
          key={index}
          style={[
            styles.stripe,
            { 
              backgroundColor: color,
              transform: [{ rotate: isTop ? '-15deg' : '15deg' }],
              top: isTop ? -20 + index * 8 : undefined,
              bottom: isTop ? undefined : -20 + index * 8,
            },
          ]}
        />
      ))}
    </View>
  );
};

export const MainMenuOverlay: React.FC = () => {
  const { 
    startGame, 
    setShowCustomization,
    setShowInfoPanel,
    playerIndex,
    path,
    resetGame
  } = useGameStore();
  
  const progress = Math.round((playerIndex / Math.max(1, path.length - 1)) * 100);
  const isComplete = playerIndex === path.length - 1 && path.length > 1;
  const stepsRemaining = Math.max(0, Math.max(1, path.length - 1) - playerIndex);
  const isContinuing = !isComplete && playerIndex > 0;
  const mainAction = isComplete
    ? { icon: 'rotate-right', label: 'Nova jornada' }
    : isContinuing
      ? { icon: 'play', label: 'Continuar jornada' }
      : { icon: 'rocket', label: 'Iniciar agora' };

  return (
    <SafeAreaView style={styles.menuContainer}>
      {/* Top rainbow decoration */}
      <RainbowStripes position="top" />
      
      <View style={styles.menuContent}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandName}>JUVENTUDE</Text>
          <Text style={styles.brandNameAccent}>PROTAGONISTA</Text>
        </View>
        
        <View style={styles.titleStack}>
          <Text style={styles.gameTitle}>Jogo da Prevenção</Text>
          <Text style={styles.gameSubtitle}>Aprenda brincando sobre HIV/AIDS e outras infecções transmissíveis</Text>
        </View>

        <CuteCard style={styles.heroCard}>
          <View style={styles.heroTitleRow}>
            {isComplete && (
              <AppIcon name="trophy" size={18} color={COLORS.warning} />
            )}
            <Text style={styles.heroTitle}>
              {isComplete ? 'Percurso concluído!' : 'Pronto para o próximo passo'}
            </Text>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROGRESSO</Text>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>
            <View style={styles.timelineTrack}>
              <View style={[styles.timelineFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.compactStats}>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>PASSOS</Text>
                <Text style={styles.statChipValue}>{playerIndex}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>FALTAM</Text>
                <Text style={styles.statChipValue}>{stepsRemaining}</Text>
              </View>
              <View style={[styles.statChip, styles.statChipStatus]}>
                <Text style={styles.statChipLabel}>STATUS</Text>
                <View style={styles.statChipValueRow}>
                  {isComplete && (
                    <AppIcon name="check" size={12} color={BRAND.green} />
                  )}
                  <Text style={[styles.statChipValue, isComplete && styles.statChipComplete]}>
                    {isComplete ? 'Fim' : 'Em jogo'}
                  </Text>
                </View>
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
                <View style={styles.mainPlayLabelRow}>
                  <AppIcon name={mainAction.icon} size={18} color="#FFF" />
                  <Text style={styles.mainPlayText}>
                    {mainAction.label}
                  </Text>
                </View>
                {!isContinuing && (
                  <Text style={styles.mainPlaySubtext}>
                    {isComplete ? 'Reforce os conceitos-chave' : 'Você está na casa ' + (playerIndex + 1)}
                  </Text>
                )}
              </View>
            </AnimatedButton>

            <View style={styles.secondaryButtonsRow}>
              <AnimatedButton 
                style={styles.secondaryButton} 
                onPress={() => {
                  triggerHaptic('light');
                  setShowInfoPanel(true);
                }}
                hapticStyle="light"
              >
                <AppIcon name="book-open" size={18} color={COLORS.text} />
                <Text style={styles.secondaryButtonText}>Como Jogar</Text>
              </AnimatedButton>

              <AnimatedButton 
                style={styles.secondaryButton} 
                onPress={() => {
                  triggerHaptic('light');
                  setShowCustomization(true);
                }}
                hapticStyle="light"
              >
                <AppIcon name="shirt" size={18} color={COLORS.text} />
                <Text style={styles.secondaryButtonText}>Personalizar</Text>
              </AnimatedButton>
            </View>
          </View>
        </CuteCard>

      </View>
      
      {/* Bottom rainbow decoration */}
      <RainbowStripes position="bottom" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  stripesContainer: {
    position: 'absolute',
    left: -50,
    right: -50,
    height: 80,
    overflow: 'hidden',
  },
  stripesTop: {
    top: 40,
  },
  stripesBottom: {
    bottom: 0,
  },
  stripe: {
    position: 'absolute',
    left: -50,
    right: -50,
    height: 6,
    borderRadius: 3,
  },
  menuContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 4,
  },
  brandNameAccent: {
    fontSize: 22,
    fontWeight: '900',
    color: BRAND.orange,
    letterSpacing: 2,
  },
  titleStack: {
    gap: 6,
  },
  gameTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  gameSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.98)',
    gap: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  progressValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },
  timelineTrack: {
    position: 'relative',
    height: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 7,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: BRAND.orange,
  },
  compactStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statChipStatus: {
    backgroundColor: '#F0FFF4',
  },
  statChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  statChipValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  statChipValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statChipComplete: {
    color: BRAND.green,
  },
  primaryActionsColumn: {
    gap: 12,
    marginTop: 4,
  },
  mainPlayButton: {
    backgroundColor: BRAND.orange,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: 'rgba(247, 147, 30, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  mainPlayText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  mainPlayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainPlaySubtext: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
});
