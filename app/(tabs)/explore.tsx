import { AppIcon } from '@/src/components/ui/AppIcon';
import { CuteCard } from '@/src/components/ui/CuteCard';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { theme } from '@/src/styles/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const StepRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepIconWrap}>
      <AppIcon name={icon} size={14} color={COLORS.text} />
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

export default function ExploreScreen() {
  const { playerIndex, path } = useGameStore();
  const progress = path.length > 1 ? Math.round((playerIndex / (path.length - 1)) * 100) : 0;

  return (
    <SafeAreaView testID="screen-explore" style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Sobre o Projeto</Text>
          <Text style={styles.subtitle}>
            MVP de jogo educativo para prevenção combinada ao HIV/AIDS e outras ISTs.
          </Text>
        </View>

        <CuteCard style={styles.card}>
          <View style={styles.cardTitleRow}>
            <AppIcon name="chart-line" size={16} color={COLORS.text} />
            <Text style={styles.cardTitle}>Progresso Atual</Text>
          </View>
          <Text style={styles.cardBody}>Você está na casa {playerIndex + 1} de {Math.max(path.length, 1)}.</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progress}% concluído</Text>
        </CuteCard>

        <CuteCard style={styles.card}>
          <View style={styles.cardTitleRow}>
            <AppIcon name="list-check" size={16} color={COLORS.text} />
            <Text style={styles.cardTitle}>Como Funciona</Text>
          </View>
          <StepRow icon="dice" text="Role o dado e avance pelo tabuleiro." />
          <StepRow icon="book-open" text="Leia o conteúdo educativo de cada casa." />
          <StepRow icon="shuffle" text="Aplique efeitos de avanço ou recuo por cor." />
          <StepRow icon="trophy" text="Finalize o percurso para completar a jornada." />
        </CuteCard>

        <CuteCard style={styles.card}>
          <View style={styles.cardTitleRow}>
            <AppIcon name="wand-magic-sparkles" size={16} color={COLORS.text} />
            <Text style={styles.cardTitle}>Foco do MVP</Text>
          </View>
          <Text style={styles.cardBody}>
            Experiência mobile estável, interface clara em modo retrato e mecânica de jogo confiável.
          </Text>
        </CuteCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 14,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    gap: 12,
    borderRadius: theme.borderRadius.xl,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
    fontWeight: '600',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E3DED8',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F4EEE7',
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
    fontWeight: '600',
  },
});
