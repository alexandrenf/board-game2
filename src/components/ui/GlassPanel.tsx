import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

type GlassIntensity = 'light' | 'regular' | 'strong';

type GlassPanelProps = {
  intensity?: GlassIntensity;
  radius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
};

const INTENSITY_MAP: Record<GlassIntensity, number> = {
  light: 10,
  regular: 30,
  strong: 60,
};

const hasNativeBlur = Platform.OS === 'ios' || Platform.OS === 'android';

export const GlassPanel: React.FC<GlassPanelProps> = ({
  intensity = 'regular',
  radius = 16,
  style,
  children,
}) => {
  if (hasNativeBlur) {
    return (
      <BlurView
        intensity={INTENSITY_MAP[intensity]}
        tint="light"
        style={[
          styles.glass,
          { borderRadius: radius, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.glass,
        {
          borderRadius: radius,
          backgroundColor: 'rgba(255,255,255,0.25)',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.4)',
          ...(Platform.OS === 'web'
            ? { backdropFilter: `blur(${INTENSITY_MAP[intensity]}px)` as any }
            : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
  },
});
