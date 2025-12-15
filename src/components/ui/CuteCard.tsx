import { COLORS } from '@/src/constants/colors';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CuteCardProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'default' | 'primary' | 'secondary';
}

export const CuteCard: React.FC<CuteCardProps> = ({ children, style, variant = 'default' }) => {
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
};

const styles = StyleSheet.create({
  cuteCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0, 
    elevation: 4,
    borderColor: COLORS.text, 
    borderWidth: 2,
  },
});
