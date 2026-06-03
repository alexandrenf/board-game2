import { COLORS } from '@/src/constants/colors';
import type { ReportQuestion } from '@/src/domain/game/matchReport';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RESULT_LABEL, resultColor, tileColorHex } from './format';

type Props = { question: ReportQuestion; index: number };

export function QuestionReportCard({ question, index }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerLine}>
        <View style={[styles.colorChip, { backgroundColor: tileColorHex(question.tileColor) }]} />
        <Text style={styles.qNumber}>Pergunta {index + 1}</Text>
      </View>
      <Text style={styles.questionText}>{question.questionText}</Text>

      <View style={styles.correctBox}>
        <Text style={styles.correctLabel}>Resposta correta</Text>
        <Text style={styles.correctText}>{question.correctOptionText}</Text>
      </View>

      {question.explanation ? <Text style={styles.explanation}>{question.explanation}</Text> : null}

      <Text style={styles.answersTitle}>Respostas dos jogadores</Text>
      {question.answers.map((a) => (
        <View key={a.playerId} style={styles.answerRow}>
          <Text style={styles.answerName} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={styles.answerPick} numberOfLines={2}>
            {a.selectedOptionText ?? '—'}
          </Text>
          <Text style={[styles.answerResult, { color: resultColor(a.result) }]}>
            {RESULT_LABEL[a.result]}
          </Text>
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
  headerLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  colorChip: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: COLORS.cardBorder, marginRight: 8 },
  qNumber: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  questionText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  correctBox: { backgroundColor: '#E9F7EF', borderRadius: 8, padding: 10, marginBottom: 8 },
  correctLabel: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginBottom: 2 },
  correctText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  explanation: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },
  answersTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 4, marginBottom: 6 },
  answerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#EEE' },
  answerName: { width: 90, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  answerPick: { flex: 1, fontSize: 14, color: COLORS.text, paddingHorizontal: 8 },
  answerResult: { width: 110, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
