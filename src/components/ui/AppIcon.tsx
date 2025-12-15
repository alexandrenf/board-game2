import { COLORS } from '@/src/constants/colors';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React, { ComponentProps } from 'react';

export type AppIconProps = Omit<ComponentProps<typeof FontAwesome6>, 'size' | 'color'> & {
  size?: number;
  color?: string;
};

export const AppIcon: React.FC<AppIconProps> = ({ size = 18, color = COLORS.text, ...rest }) => {
  return <FontAwesome6 size={size} color={color} {...rest} />;
};
