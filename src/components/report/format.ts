import { COLORS, TILE_COLORS } from '@/src/constants/colors';
import type { QuizResultValue } from '@/src/domain/game/matchReport';

export function formatMatchDate(ts: number): string {
  const date = new Date(ts);
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function finishReasonLabel(reason: string): string {
  switch (reason) {
    case 'reached_end':
      return 'Chegou ao fim';
    case 'only_one_player':
      return 'Restou um jogador';
    case 'no_active_players':
      return 'Sem jogadores ativos';
    default:
      return reason;
  }
}

export const RESULT_LABEL: Record<QuizResultValue, string> = {
  correct: 'Acertou',
  incorrect: 'Errou',
  timeout: 'Não respondeu',
};

export function resultColor(result: QuizResultValue): string {
  if (result === 'correct') return COLORS.success;
  if (result === 'incorrect') return COLORS.danger;
  return COLORS.textMuted;
}

export function tileColorHex(tileColor: string): string {
  return (TILE_COLORS as Record<string, string>)[tileColor] ?? COLORS.textMuted;
}
