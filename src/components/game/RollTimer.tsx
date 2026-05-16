import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type RollTimerProps = {
  /** Server-side ms timestamp at which the autoRollTurn scheduler will fire. */
  deadlineAt: number;
  /** Server-time minus client-time, in ms, used to defeat client-clock skew. */
  serverClockOffsetMs: number;
  /** True if the local player is the current actor (changes copy + voice). */
  isMyTurn: boolean;
  /** Name of the player whose turn it is (used in watcher copy). */
  actorName: string;
};

const computeSecondsLeft = (deadlineAt: number, offsetMs: number): number =>
  Math.max(0, Math.ceil((deadlineAt - (Date.now() + offsetMs)) / 1000));

/**
 * Countdown pill displayed during the awaiting_roll phase. Mirrors QuizTimer's
 * role but is presentational only — the actual auto-roll is driven by the
 * server's scheduled `autoRollTurn` mutation. This component just makes the
 * window visible so the user understands what's happening.
 */
export const RollTimer: React.FC<RollTimerProps> = ({
  deadlineAt,
  serverClockOffsetMs,
  isMyTurn,
  actorName,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    computeSecondsLeft(deadlineAt, serverClockOffsetMs)
  );

  useEffect(() => {
    setSecondsLeft(computeSecondsLeft(deadlineAt, serverClockOffsetMs));
    const id = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(deadlineAt, serverClockOffsetMs));
    }, 500);
    return () => clearInterval(id);
  }, [deadlineAt, serverClockOffsetMs]);

  if (secondsLeft <= 0) return null;

  const urgent = secondsLeft <= 10;
  const text = isMyTurn
    ? `Rolagem automática em ${secondsLeft}s`
    : `${actorName} tem ${secondsLeft}s para rolar`;

  return (
    <View
      style={[styles.pill, urgent && styles.pillUrgent]}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <View style={[styles.dot, urgent && styles.dotUrgent]} />
      <Text style={[styles.text, urgent && styles.textUrgent]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 248, 238, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B78D5F',
    alignSelf: 'center',
  },
  pillUrgent: {
    borderColor: '#D97706',
    backgroundColor: '#FFE9C2',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22A36B',
  },
  dotUrgent: {
    backgroundColor: '#D97706',
  },
  text: {
    fontWeight: '700',
    fontSize: 12,
    color: '#4E2C17',
  },
  textUrgent: {
    color: '#A0440A',
  },
});
