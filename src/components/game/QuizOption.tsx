import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { theme } from '@/src/styles/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type QuizOptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'disabled';

type QuizOptionProps = {
  letter: string;
  text: string;
  state: QuizOptionState;
  onPress: () => void;
};

export const QuizOption: React.FC<QuizOptionProps> = ({
  letter,
  text,
  state,
  onPress,
}) => {
  const disabled = state === 'disabled' || state === 'correct' || state === 'incorrect';
  const stateStyle =
    state === 'correct'
      ? styles.correct
      : state === 'incorrect'
        ? styles.incorrect
        : state === 'selected'
          ? styles.selected
          : null;

  return (
    <TouchableOpacity
      style={[styles.option, stateStyle, state === 'disabled' && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${letter}, ${text}, ${state}`}
      accessibilityState={{ disabled, selected: state === 'selected' }}
    >
      <View style={[styles.letterBadge, stateStyle]}>
        <Text style={styles.letterText}>{letter}</Text>
      </View>
      <Text style={styles.optionText}>{text}</Text>
      {state === 'correct' ? (
        <AppIcon name="check" size={13} color={COLORS.text} />
      ) : state === 'incorrect' ? (
        <AppIcon name="xmark" size={13} color={COLORS.text} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#E3D1B8',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selected: {
    borderColor: '#8A6744',
    backgroundColor: '#FFF8EE',
  },
  correct: {
    borderColor: '#BDE7C9',
    backgroundColor: '#F2FFF6',
  },
  incorrect: {
    borderColor: '#F3B0B0',
    backgroundColor: '#FFF3F3',
  },
  disabled: {
    opacity: 0.6,
  },
  letterBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
    backgroundColor: '#F7EBD9',
  },
  letterText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
});
