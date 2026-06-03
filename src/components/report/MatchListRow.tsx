import { COLORS } from '@/src/constants/colors';
import type { FinishedMatchListItem } from '@/src/domain/game/matchReport';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMatchDate } from './format';

type Props = { match: FinishedMatchListItem; onPress: () => void };

export function MatchListRow({ match, onPress }: Props) {
  const names = match.players.map((p) => (p.isWinner ? `${p.name} 🏆` : p.name)).join(', ');
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      testID={`relatorio-match-${match.matchId}`}
      accessibilityRole="button"
    >
      <View style={styles.headerLine}>
        <Text style={styles.code}>Sala {match.code}</Text>
        <Text style={styles.date}>{formatMatchDate(match.finishedAt)}</Text>
      </View>
      <Text style={styles.players} numberOfLines={2}>
        {names || 'Sem jogadores'}
      </Text>
      <Text style={styles.meta}>
        {match.questionCount} {match.questionCount === 1 ? 'pergunta' : 'perguntas'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  headerLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  code: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.textMuted },
  players: { fontSize: 15, color: COLORS.text, marginBottom: 4 },
  meta: { fontSize: 13, color: COLORS.textMuted },
});
