import { PlayerSummaryHeader } from '@/src/components/report/PlayerSummaryHeader';
import { QuestionReportCard } from '@/src/components/report/QuestionReportCard';
import { finishReasonLabel, formatMatchDate } from '@/src/components/report/format';
import { injectReportPrintStyles, printReport } from '@/src/components/report/printWeb';
import { COLORS } from '@/src/constants/colors';
import type { MatchReport } from '@/src/domain/game/matchReport';
import { multiplayerApi } from '@/src/services/multiplayer/api';
import { isConvexConfigured } from '@/src/services/multiplayer/convexClient';
import { useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RelatorioDetailScreen() {
  if (!isConvexConfigured) {
    return (
      <View testID="screen-relatorio-detail" style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notice}>Backend não configurado.</Text>
      </View>
    );
  }
  return <RelatorioDetailContent />;
}

function RelatorioDetailContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = params.matchId;
  const report = useQuery(multiplayerApi.reports.getMatchReport, { matchId }) as
    | MatchReport
    | null
    | undefined;

  useEffect(() => {
    if (Platform.OS === 'web') injectReportPrintStyles();
  }, []);

  return (
    <View testID="screen-relatorio-detail" style={styles.container} nativeID="relatorio-root">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push('/relatorio')} nativeID="relatorio-no-print">
          <Text style={styles.back}>← Voltar</Text>
        </Pressable>

        {report === undefined ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : report === null ? (
          <Text style={styles.empty}>Partida não encontrada ou expirada.</Text>
        ) : (
          <>
            <View style={styles.titleRow}>
              <View style={styles.titleCol}>
                <Text style={styles.title}>Sala {report.code}</Text>
                <Text style={styles.subtitle}>
                  {formatMatchDate(report.finishedAt)} · {finishReasonLabel(report.finishReason)}
                </Text>
              </View>
              {Platform.OS === 'web' ? (
                <Pressable onPress={printReport} style={styles.printBtn} nativeID="relatorio-no-print">
                  <Text style={styles.printBtnText}>Imprimir / PDF</Text>
                </Pressable>
              ) : null}
            </View>

            <PlayerSummaryHeader players={report.players} />

            {report.questions.length === 0 ? (
              <Text style={styles.empty}>Esta partida não teve perguntas respondidas.</Text>
            ) : (
              report.questions.map((q, i) => (
                <QuestionReportCard key={`${q.questionId}-${i}`} question={q} index={i} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  back: { fontSize: 15, color: COLORS.info, fontWeight: '700', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  titleCol: { flex: 1, paddingRight: 12 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  printBtn: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  printBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  loader: { marginTop: 40 },
  empty: { fontSize: 15, color: COLORS.textMuted, marginTop: 24, textAlign: 'center' },
  notice: { fontSize: 15, color: COLORS.textMuted },
});
