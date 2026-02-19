import { COLORS } from '@/src/constants/colors';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React, { ComponentProps } from 'react';

type FontAwesomeName = ComponentProps<typeof FontAwesome6>['name'];

export type AppIconProps = Omit<ComponentProps<typeof FontAwesome6>, 'size' | 'color' | 'name'> & {
  name: FontAwesomeName | string;
  size?: number;
  color?: string;
};

export const AppIcon: React.FC<AppIconProps> = ({ size = 18, color = COLORS.text, ...rest }) => {
  return <FontAwesome6 size={size} color={color} {...(rest as ComponentProps<typeof FontAwesome6>)} />;
};
