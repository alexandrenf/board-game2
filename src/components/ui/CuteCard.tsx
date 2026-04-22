import { COLORS } from '@/src/constants/colors';
import { theme } from '@/src/styles/theme';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CuteCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'primary' | 'secondary';
}

export const CuteCard = React.memo<CuteCardProps>(function CuteCard({ children, style, variant = 'default' }) {
  let bg = COLORS.cardBg;
  let border = COLORS.cardBorder;
  
  if (variant === 'primary') {
    bg = COLORS.primary;
    border = COLORS.text;
  } else if (variant === 'secondary') {
    bg = COLORS.secondary;
    border = COLORS.text;
  }

  return (
    <View style={[styles.cuteCard, { backgroundColor: bg, borderColor: border }, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  cuteCard: theme.card,
});
