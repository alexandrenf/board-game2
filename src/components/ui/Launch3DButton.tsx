import { AppIcon } from '@/src/components/ui/AppIcon';
import { triggerHaptic } from '@/src/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type Launch3DButtonProps = {
  size?: number;
  testID?: string;
  onPress?: (event: GestureResponderEvent) => void;
};

const DEFAULT_SIZE = 230;
const DEPTH_RATIO = 0.11;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export function Launch3DButton({
  size = DEFAULT_SIZE,
  testID = 'launch-3d-button',
  onPress,
}: Launch3DButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  const depth = Math.round(size * DEPTH_RATIO);
  const outerRadius = size / 2;
  const creamSize = size * 0.83;
  const creamInset = (size - creamSize) / 2;
  const faceSize = size * 0.7;
  const faceInset = (size - faceSize) / 2;
  const rocketSize = size * 0.45;

  const animatePress = (toValue: number) => {
    Animated.spring(pressAnim, {
      toValue,
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: toValue === 1 ? 34 : 18,
      bounciness: toValue === 1 ? 2 : 12,
    }).start();
  };

  const handlePressIn = () => {
    setIsPressed(true);
    triggerHaptic('medium');
    animatePress(1);
  };

  const handlePressOut = () => {
    setIsPressed(false);
    animatePress(0);
  };

  const handlePress = (event: GestureResponderEvent) => {
    popAnim.setValue(0);
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    onPress?.(event);
  };

  const topTranslateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, depth * 0.68],
  });
  const topScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });
  const depthScaleY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.34],
  });
  const shadowOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0.18],
  });
  const shadowScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.86],
  });
  const popOpacity = popAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.45, 0],
  });
  const popScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.16],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Iniciar jogo"
      hitSlop={16}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      pressRetentionOffset={24}
      style={[styles.pressable, { width: size + 30, height: size + depth + 38 }]}
      testID={testID}
    >
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.groundShadow,
            {
              width: size * 0.95,
              height: size * 0.21,
              borderRadius: size * 0.12,
              bottom: 7,
              opacity: shadowOpacity,
              transform: [{ scaleX: shadowScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.depthStack,
            {
              width: size,
              height: size,
              borderRadius: outerRadius,
              top: depth,
              transform: [{ scaleY: depthScaleY }],
            },
          ]}
        >
          <LinearGradient
            colors={isPressed ? ['#137452', '#0C5A40', '#083F2F'] : ['#1A9C70', '#0C774F', '#064734']}
            locations={[0, 0.55, 1]}
            start={{ x: 0.18, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.fullCircle, { borderRadius: outerRadius }]}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.topStack,
            {
              width: size,
              height: size,
              borderRadius: outerRadius,
              transform: [{ translateY: topTranslateY }, { scale: topScale }],
            },
          ]}
        >
          <LinearGradient
            colors={isPressed ? ['#46C593', '#13885E', '#076245'] : ['#74E1B3', '#1AA876', '#0B6847']}
            locations={[0, 0.52, 1]}
            start={{ x: 0.18, y: 0 }}
            end={{ x: 0.82, y: 1 }}
            style={[styles.fullCircle, { borderRadius: outerRadius }]}
          />
          <View
            style={[
              styles.outerInsetShadow,
              {
                borderRadius: outerRadius,
                borderWidth: size * 0.03,
              },
            ]}
          />

          <LinearGradient
            colors={isPressed ? ['#F5D877', '#DFA947', '#B97620'] : ['#FFF0A8', '#E8B855', '#C47C21']}
            locations={[0, 0.58, 1]}
            start={{ x: 0.16, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[
              styles.ring,
              {
                width: creamSize,
                height: creamSize,
                left: creamInset,
                top: creamInset,
                borderRadius: creamSize / 2,
              },
            ]}
          />

          <LinearGradient
            colors={isPressed ? ['#FFD247', '#F19B10', '#D46900'] : ['#FFE86A', '#FFB020', '#E87906']}
            locations={[0, 0.52, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.82, y: 1 }}
            style={[
              styles.face,
              {
                width: faceSize,
                height: faceSize,
                left: faceInset,
                top: faceInset,
                borderRadius: faceSize / 2,
              },
            ]}
          >
            <View style={styles.faceGlow} />
            <View style={styles.faceInnerShade} />
          </LinearGradient>

          <View
            style={[
              styles.faceRimShadow,
              {
                width: faceSize,
                height: faceSize,
                left: faceInset,
                top: faceInset,
                borderRadius: faceSize / 2,
              },
            ]}
          />

          <View
            style={[
              styles.rocketWrap,
              {
                width: rocketSize * 1.35,
                height: rocketSize * 1.2,
                left: (size - rocketSize * 1.35) / 2 + size * 0.03,
                top: (size - rocketSize * 1.2) / 2 - size * 0.02,
              },
            ]}
          >
            <View style={styles.flameShadow}>
              <LinearGradient
                colors={['#C66C0C', '#F6B91F']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.flame}
              />
            </View>
            <AppIcon
              name="rocket"
              size={rocketSize}
              color="#D8D0BE"
              style={[
                styles.rocketDepth,
                { transform: [{ translateX: -rocketSize * 0.03 }, { translateY: rocketSize * 0.06 }] },
              ]}
            />
            <AppIcon
              name="rocket"
              size={rocketSize}
              color="#FFF9EA"
              style={styles.rocketIcon}
            />
            <View style={styles.windowInset} />
          </View>

          <Animated.View
            style={[
              styles.pressPulse,
              {
                width: size * 0.85,
                height: size * 0.85,
                borderRadius: size * 0.425,
                left: size * 0.075,
                top: size * 0.075,
                opacity: popOpacity,
                transform: [{ scale: popScale }],
              },
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  groundShadow: {
    position: 'absolute',
    backgroundColor: '#063526',
    transform: [{ scaleX: 1 }],
    ...Platform.select({
      web: {
        filter: 'blur(14px)',
      },
      default: {
        shadowColor: '#063526',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
    }),
  },
  depthStack: {
    position: 'absolute',
    overflow: 'hidden',
  },
  topStack: {
    position: 'absolute',
    overflow: 'visible',
    shadowColor: '#063526',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 9,
  },
  fullCircle: {
    ...StyleSheet.absoluteFillObject,
  },
  outerInsetShadow: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(4, 74, 50, 0.34)',
  },
  ring: {
    position: 'absolute',
    shadowColor: '#7A4F16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  face: {
    position: 'absolute',
    overflow: 'hidden',
  },
  faceGlow: {
    position: 'absolute',
    top: '8%',
    left: '14%',
    width: '62%',
    height: '32%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ rotate: '-13deg' }],
  },
  faceInnerShade: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: '5%',
    height: '24%',
    borderRadius: 999,
    backgroundColor: 'rgba(153, 71, 0, 0.14)',
  },
  faceRimShadow: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(135, 80, 0, 0.2)',
  },
  rocketWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameShadow: {
    position: 'absolute',
    left: '16%',
    bottom: '16%',
    width: 45,
    height: 33,
    borderRadius: 28,
    transform: [{ rotate: '-40deg' }],
    shadowColor: '#8B3A00',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 2,
  },
  flame: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 21,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 9,
  },
  rocketDepth: {
    position: 'absolute',
    shadowColor: '#715E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  rocketIcon: {
    position: 'absolute',
    textShadowColor: 'rgba(92, 61, 22, 0.24)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  windowInset: {
    position: 'absolute',
    top: '34%',
    right: '28%',
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#F6A216',
    borderWidth: 3,
    borderColor: 'rgba(142, 80, 0, 0.12)',
    opacity: 0.88,
  },
  pressPulse: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
});
