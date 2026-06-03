import {
  isFinishedMatchExpired,
  buildReportSummary,
  assembleMatchReport,
} from '../matchReport';

const DAY = 24 * 60 * 60 * 1000;

describe('isFinishedMatchExpired', () => {
  it('treats missing finishedAt (legacy rooms) as expired', () => {
    expect(isFinishedMatchExpired(undefined, 1000, DAY)).toBe(true);
    expect(isFinishedMatchExpired(null, 1000, DAY)).toBe(true);
  });

  it('keeps a match within the retention window', () => {
    expect(isFinishedMatchExpired(1000, 1000 + DAY, DAY)).toBe(false);
  });

  it('expires a match past the retention window', () => {
    expect(isFinishedMatchExpired(1000, 1000 + DAY + 1, DAY)).toBe(true);
  });
});

describe('buildReportSummary', () => {
  const players = [
    { playerId: 'a', name: 'Ana', quizPoints: 5, joinedAt: 1 },
    { playerId: 'b', name: 'Bia', quizPoints: 10, joinedAt: 2 },
    { playerId: 'c', name: 'Caio', quizPoints: 10, joinedAt: 3 },
  ];

  it('puts the winner first, then sorts by points desc, then joinedAt asc', () => {
    const summary = buildReportSummary({
      players,
      resolvedRoundCount: 4,
      winnerPlayerId: 'a',
      finishReason: 'reached_end',
    });
    expect(summary.questionCount).toBe(4);
    expect(summary.finishReason).toBe('reached_end');
    expect(summary.players.map((p) => p.playerId)).toEqual(['a', 'b', 'c']);
    expect(summary.players[0].isWinner).toBe(true);
    expect(summary.players[1].isWinner).toBe(false);
  });

  it('without a winner, sorts purely by points then joinedAt', () => {
    const summary = buildReportSummary({
      players,
      resolvedRoundCount: 0,
      finishReason: 'no_active_players',
    });
    expect(summary.players.map((p) => p.playerId)).toEqual(['b', 'c', 'a']);
    expect(summary.players.every((p) => !p.isWinner)).toBe(true);
  });
});

describe('assembleMatchReport', () => {
  const base = {
    matchId: 'room1',
    code: 'ABC',
    finishedAt: 123,
    status: 'finished' as const,
    finishReason: 'reached_end',
    players: [
      { playerId: 'a', name: 'Ana', quizPoints: 5 },
      { playerId: 'b', name: 'Bia', quizPoints: 0 },
    ],
    rounds: [
      {
        roundId: 'r2',
        questionId: 'q2',
        questionText: 'Segunda?',
        options: [
          { id: 'o1', text: 'Um' },
          { id: 'o2', text: 'Dois' },
        ],
        correctOptionId: 'o2',
        explanation: 'porque dois',
        tileColor: 'red',
        turnNumber: 5,
        startedAt: 200,
      },
      {
        roundId: 'r1',
        questionId: 'q1',
        questionText: 'Primeira?',
        options: [
          { id: 'o1', text: 'Sim' },
          { id: 'o2', text: 'Nao' },
        ],
        correctOptionId: 'o1',
        explanation: undefined,
        tileColor: 'green',
        turnNumber: 2,
        startedAt: 100,
      },
    ],
    answers: [
      { roundId: 'r1', playerId: 'a', selectedOptionId: 'o1', result: 'correct' as const },
      { roundId: 'r1', playerId: 'b', selectedOptionId: 'o2', result: 'incorrect' as const },
      { roundId: 'r2', playerId: 'a', selectedOptionId: undefined, result: 'timeout' as const },
      // player b has no answer row for r2 at all
    ],
  };

  it('orders questions chronologically by turnNumber then startedAt', () => {
    const report = assembleMatchReport(base);
    expect(report.questions.map((q) => q.questionId)).toEqual(['q1', 'q2']);
    expect(report.totalQuestions).toBe(2);
  });

  it('resolves correct option text and per-answer selected text', () => {
    const report = assembleMatchReport(base);
    const q1 = report.questions[0];
    expect(q1.correctOptionText).toBe('Sim');
    const ana = q1.answers.find((x) => x.playerId === 'a')!;
    expect(ana.result).toBe('correct');
    expect(ana.selectedOptionText).toBe('Sim');
  });

  it('renders timeout and missing answer rows as not-answered', () => {
    const report = assembleMatchReport(base);
    const q2 = report.questions[1];
    const ana = q2.answers.find((x) => x.playerId === 'a')!;
    const bia = q2.answers.find((x) => x.playerId === 'b')!;
    expect(ana.result).toBe('timeout');
    expect(ana.selectedOptionText).toBeNull();
    expect(bia.result).toBe('timeout');
    expect(bia.selectedOptionId).toBeNull();
  });

  it('computes per-player accuracy and sorts summary by points desc', () => {
    const report = assembleMatchReport(base);
    expect(report.players.map((p) => p.playerId)).toEqual(['a', 'b']);
    const ana = report.players[0];
    expect(ana.correctCount).toBe(1);
    expect(ana.answeredCount).toBe(1); // answered r1, timed out r2
    expect(ana.totalQuestions).toBe(2);
  });

  it('passes status through and defaults to finished', () => {
    const finished = assembleMatchReport(base);
    expect(finished.status).toBe('finished');
    expect(finished.finishReason).toBe('reached_end');

    const ongoing = assembleMatchReport({
      ...base,
      status: 'ongoing',
      finishReason: undefined,
    });
    expect(ongoing.status).toBe('ongoing');
    expect(ongoing.finishReason).toBeUndefined();
    // partial report still assembles the resolved questions
    expect(ongoing.questions.map((q) => q.questionId)).toEqual(['q1', 'q2']);
  });
});
