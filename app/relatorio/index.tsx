import { MatchListRow } from '@/src/components/report/MatchListRow';
import { COLORS } from '@/src/constants/colors';
import type { FinishedMatchListItem } from '@/src/domain/game/matchReport';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useQuery } from 'convex/react';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RelatorioListScreen() {
  // isConvexConfigured is a stable module constant, so this early return is
  // consistent across renders (no hooks-order violation).
  if (!isConvexConfigured) {
    return (
      <View testID="screen-relatorio-list" style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notice}>Backend não configurado.</Text>
      </View>
    );
  }
  return <RelatorioListContent />;
}

function RelatorioListContent() {
  const router = useRouter();
  const matches = useQuery(multiplayerApi.reports.listFinishedMatches, {}) as
    | FinishedMatchListItem[]
    | undefined;

  return (
    <View testID="screen-relatorio-list" style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Relatório de partidas</Text>
        <Text style={styles.subtitle}>Partidas finalizadas nas últimas 24 horas</Text>

        {matches === undefined ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : matches.length === 0 ? (
          <Text style={styles.empty}>Nenhuma partida finalizada ainda.</Text>
        ) : (
          matches.map((match) => (
            <MatchListRow
              key={match.matchId}
              match={match}
              onPress={() => router.push(`/relatorio/${match.matchId}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  loader: { marginTop: 40 },
  empty: { fontSize: 15, color: COLORS.textMuted, marginTop: 24, textAlign: 'center' },
  notice: { fontSize: 15, color: COLORS.textMuted },
});
