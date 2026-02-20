import { HapticStyle, triggerHaptic } from '@/src/utils/haptics';
import React, { useRef } from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue,
  Animated,
  Insets,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

interface AnimatedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  hapticStyle?: HapticStyle;
  hapticsEnabled?: boolean;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  hitSlop?: Insets | number;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  disabled,
  style,
  children,
  hapticStyle = 'light',
  hapticsEnabled = true,
  testID,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityValue,
  hitSlop = 8,
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
      testID={testID}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? { disabled: !!disabled }}
      accessibilityValue={accessibilityValue}
      hitSlop={hitSlop}
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
