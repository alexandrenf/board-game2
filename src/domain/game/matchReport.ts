/** Pure, dependency-free helpers for building match reports. Unit-tested. */

export type QuizResultValue = 'correct' | 'incorrect' | 'timeout';

/** Returns true when a finished match is past its retention window (or never stamped). */
export function isFinishedMatchExpired(
  finishedAt: number | null | undefined,
  now: number,
  retentionMs: number
): boolean {
  if (finishedAt == null) return true;
  return now - finishedAt > retentionMs;
}

// ---- reportSummary (stored on the room at finish; powers the list) ----

export type SummaryPlayerInput = {
  playerId: string;
  name: string;
  quizPoints: number;
  joinedAt: number;
};

export type ReportSummary = {
  finishReason: string;
  questionCount: number;
  players: { playerId: string; name: string; quizPoints: number; isWinner: boolean }[];
};

export function buildReportSummary(input: {
  players: SummaryPlayerInput[];
  resolvedRoundCount: number;
  winnerPlayerId?: string;
  finishReason: string;
}): ReportSummary {
  const players = [...input.players]
    .sort((l, r) => {
      if (input.winnerPlayerId) {
        if (l.playerId === input.winnerPlayerId) return -1;
        if (r.playerId === input.winnerPlayerId) return 1;
      }
      const pointsDelta = r.quizPoints - l.quizPoints;
      if (pointsDelta !== 0) return pointsDelta;
      return l.joinedAt - r.joinedAt;
    })
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      quizPoints: p.quizPoints,
      isWinner: p.playerId === input.winnerPlayerId,
    }));
  return { finishReason: input.finishReason, questionCount: input.resolvedRoundCount, players };
}

// ---- list item (shared between query and UI) ----

export type MatchStatus = 'finished' | 'ongoing';

export type MatchListItem = {
  matchId: string;
  code: string;
  status: MatchStatus;
  /** finishedAt for finished matches, lastActiveAt for ongoing ones. */
  timestamp: number;
  questionCount: number;
  finishReason?: string;
  players: { name: string; quizPoints: number; isWinner: boolean }[];
};

// ---- full report (detail view) ----

export type ReportPlayerInput = { playerId: string; name: string; quizPoints: number };

export type ReportRoundInput = {
  roundId: string;
  questionId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;
  tileColor: string;
  turnNumber: number;
  startedAt: number;
};

export type ReportAnswerInput = {
  roundId: string;
  playerId: string;
  selectedOptionId?: string;
  result: QuizResultValue;
};

export type ReportQuestionAnswer = {
  playerId: string;
  name: string;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  result: QuizResultValue;
};

export type ReportQuestion = {
  questionId: string;
  questionText: string;
  tileColor: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  correctOptionText: string;
  explanation: string | null;
  answers: ReportQuestionAnswer[];
};

export type ReportPlayerSummary = {
  playerId: string;
  name: string;
  quizPoints: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
};

export type MatchReport = {
  matchId: string;
  code: string;
  status: MatchStatus;
  finishedAt: number;
  finishReason?: string;
  totalQuestions: number;
  players: ReportPlayerSummary[];
  questions: ReportQuestion[];
};

export function assembleMatchReport(input: {
  matchId: string;
  code: string;
  status?: MatchStatus;
  finishedAt: number;
  finishReason?: string;
  players: ReportPlayerInput[];
  rounds: ReportRoundInput[];
  answers: ReportAnswerInput[];
}): MatchReport {
  const playersInOrder = [...input.players];

  const sortedRounds = [...input.rounds].sort((a, b) =>
    a.turnNumber !== b.turnNumber ? a.turnNumber - b.turnNumber : a.startedAt - b.startedAt
  );

  // roundId -> (playerId -> answer)
  const answersByRound = new Map<string, Map<string, ReportAnswerInput>>();
  for (const ans of input.answers) {
    let m = answersByRound.get(ans.roundId);
    if (!m) {
      m = new Map();
      answersByRound.set(ans.roundId, m);
    }
    m.set(ans.playerId, ans);
  }

  const questions: ReportQuestion[] = sortedRounds.map((round) => {
    const optText = new Map(round.options.map((o) => [o.id, o.text] as const));
    const roundAnswers = answersByRound.get(round.roundId) ?? new Map<string, ReportAnswerInput>();
    const answers: ReportQuestionAnswer[] = playersInOrder.map((p) => {
      const a = roundAnswers.get(p.playerId);
      if (!a) {
        return {
          playerId: p.playerId,
          name: p.name,
          selectedOptionId: null,
          selectedOptionText: null,
          result: 'timeout',
        };
      }
      const selectedOptionId = a.selectedOptionId ?? null;
      return {
        playerId: p.playerId,
        name: p.name,
        selectedOptionId,
        selectedOptionText: selectedOptionId != null ? optText.get(selectedOptionId) ?? null : null,
        result: a.result,
      };
    });
    return {
      questionId: round.questionId,
      questionText: round.questionText,
      tileColor: round.tileColor,
      options: round.options,
      correctOptionId: round.correctOptionId,
      correctOptionText: optText.get(round.correctOptionId) ?? '',
      explanation: round.explanation ?? null,
      answers,
    };
  });

  const totalQuestions = sortedRounds.length;
  const players: ReportPlayerSummary[] = playersInOrder
    .map((p) => {
      let correctCount = 0;
      let answeredCount = 0;
      for (const round of sortedRounds) {
        const a = answersByRound.get(round.roundId)?.get(p.playerId);
        if (a && a.result === 'correct') correctCount += 1;
        if (a && a.result !== 'timeout') answeredCount += 1;
      }
      return {
        playerId: p.playerId,
        name: p.name,
        quizPoints: p.quizPoints,
        correctCount,
        answeredCount,
        totalQuestions,
      };
    })
    .sort((a, b) => b.quizPoints - a.quizPoints || a.name.localeCompare(b.name));

  return {
    matchId: input.matchId,
    code: input.code,
    status: input.status ?? 'finished',
    finishedAt: input.finishedAt,
    finishReason: input.finishReason,
    totalQuestions,
    players,
    questions,
  };
}
