import { HapticStyle, triggerHaptic } from '@/src/utils/haptics';
import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

interface AnimatedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
  hapticStyle?: HapticStyle;
  hapticsEnabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  disabled,
  style,
  children,
  hapticStyle = 'light',
  hapticsEnabled = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    if (hapticsEnabled) triggerHaptic(hapticStyle);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };
  
  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }, disabled && styles.buttonDisabled]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.6,
  },
});
