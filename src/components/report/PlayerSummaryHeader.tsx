import { COLORS } from '@/src/constants/colors';
import type { ReportPlayerSummary } from '@/src/domain/game/matchReport';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { players: ReportPlayerSummary[] };

export function PlayerSummaryHeader({ players }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Desempenho dos jogadores</Text>
      {players.map((p) => (
        <View key={p.playerId} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.stat}>
            {p.correctCount}/{p.totalQuestions} certas
          </Text>
          <Text style={styles.points}>{p.quizPoints} pts</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '600' },
  stat: { width: 110, fontSize: 14, color: COLORS.textMuted, textAlign: 'right' },
  points: { width: 70, fontSize: 14, color: COLORS.text, fontWeight: '700', textAlign: 'right' },
});
