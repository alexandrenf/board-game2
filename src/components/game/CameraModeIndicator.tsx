import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface CameraModeIndicatorProps {
  isRoamMode: boolean;
}

export const CameraModeIndicator: React.FC<CameraModeIndicatorProps> = ({ isRoamMode }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isRoamMode ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [isRoamMode, slideAnim]);

  return (
    <View style={styles.cameraModeContainer}>
      <View style={styles.cameraModeTrack}>
        <Animated.View 
          style={[
            styles.cameraModeIndicator,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 38],
                })
              }],
              backgroundColor: isRoamMode ? COLORS.accent : COLORS.primary,
            }
          ]} 
        />
        <View style={styles.cameraModeOption}>
          <AppIcon
            name="video"
            size={16}
            color={COLORS.text}
            style={[styles.cameraModeIcon, !isRoamMode && styles.cameraModeActive]}
          />
        </View>
        <View style={styles.cameraModeOption}>
          <AppIcon
            name="hand-pointer"
            size={16}
            color={COLORS.text}
            style={[styles.cameraModeIcon, isRoamMode && styles.cameraModeActive]}
          />
        </View>
      </View>
      <Text style={styles.cameraModeLabel}>
        {isRoamMode ? 'Explorar' : 'Seguir'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cameraModeContainer: {
    alignItems: 'center',
  },
  cameraModeTrack: {
    flexDirection: 'row',
    backgroundColor: '#EFE6DC',
    borderRadius: 20,
    padding: 2,
    width: 76,
    height: 36,
  },
  cameraModeIndicator: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    top: 2,
  },
  cameraModeOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraModeIcon: {
    opacity: 0.4,
  },
  cameraModeActive: {
    opacity: 1,
  },
  cameraModeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
