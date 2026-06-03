import { COLORS } from '@/src/constants/colors';
import type { MatchListItem } from '@/src/domain/game/matchReport';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMatchDate } from './format';

type Props = { match: MatchListItem; onPress: () => void };

export function MatchListRow({ match, onPress }: Props) {
  const isOngoing = match.status === 'ongoing';
  const names = match.players.map((p) => (p.isWinner ? `${p.name} 🏆` : p.name)).join(', ');
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      testID={`relatorio-match-${match.matchId}`}
      accessibilityRole="button"
    >
      <View style={styles.headerLine}>
        <View style={styles.codeWrap}>
          <Text style={styles.code}>Sala {match.code}</Text>
          <View style={[styles.badge, isOngoing ? styles.badgeLive : styles.badgeDone]}>
            <Text style={[styles.badgeText, isOngoing ? styles.badgeTextLive : styles.badgeTextDone]}>
              {isOngoing ? '● Ao vivo' : 'Finalizada'}
            </Text>
          </View>
        </View>
        <Text style={styles.date}>{formatMatchDate(match.timestamp)}</Text>
      </View>
      <Text style={styles.players} numberOfLines={2}>
        {names || 'Sem jogadores'}
      </Text>
      <Text style={styles.meta}>
        {match.questionCount} {match.questionCount === 1 ? 'pergunta' : 'perguntas'}
        {isOngoing ? ' · em andamento' : ''}
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
  headerLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeWrap: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  code: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  badgeLive: { backgroundColor: COLORS.success },
  badgeDone: { backgroundColor: COLORS.background },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextLive: { color: '#FFFFFF' },
  badgeTextDone: { color: COLORS.textMuted },
  date: { fontSize: 13, color: COLORS.textMuted, marginLeft: 8 },
  players: { fontSize: 15, color: COLORS.text, marginBottom: 4 },
  meta: { fontSize: 13, color: COLORS.textMuted },
});
