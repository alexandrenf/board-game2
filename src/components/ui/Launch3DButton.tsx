import { triggerHaptic } from "@/src/utils/haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const rocketPng = require("@/src/assets/images/menu/rocket.png");

type Launch3DButtonProps = {
  size?: number;
  testID?: string;
  accessibilityLabel?: string;
  onPress?: (event: GestureResponderEvent) => void;
};

const DEFAULT_SIZE = 230;
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export function Launch3DButton({
  size = DEFAULT_SIZE,
  testID = "launch-3d-button",
  accessibilityLabel = "Iniciar jogo",
  onPress,
}: Launch3DButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  // ── Derived sizes ──
  const r = size / 2;
  const depth = Math.round(size * 0.055);
  const goldDia = size * 0.89;
  const goldOff = (size - goldDia) / 2;
  const faceDia = size * 0.78;
  const faceOff = (size - faceDia) / 2;
  const rocketDia = size * 0.75;
  const rocketOff = (size - rocketDia) / 2;
  const rocketTop = rocketOff - size * 0.065;

  // ── Animation helpers ──
  const animatePress = (to: number) => {
    Animated.spring(pressAnim, {
      toValue: to,
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: to === 1 ? 34 : 18,
      bounciness: to === 1 ? 2 : 12,
    }).start();
  };

  const handlePressIn = () => {
    triggerHaptic("medium");
    animatePress(1);
  };
  const handlePressOut = () => animatePress(0);
  const handlePress = (e: GestureResponderEvent) => {
    popAnim.setValue(0);
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    onPress?.(e);
  };

  // ── Interpolations ──
  const topY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, depth * 0.75],
  });
  const topScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });
  const sideScaleY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });
  const pulseOpacity = popAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.5, 0],
  });
  const pulseScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.18],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={16}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      pressRetentionOffset={24}
      style={{
        width: size + 32,
        height: size + depth + 32,
        alignItems: "center",
        justifyContent: "center",
      }}
      testID={testID}
    >
      {/* ── 1. Outer soft shadow ── */}
      <View
        style={{
          position: "absolute",
          width: size * 1.08,
          height: size * 1.08,
          borderRadius: size * 0.54,
          top: (size + depth + 32 - size * 1.08) / 2 - depth / 2 + depth * 0.5,
          backgroundColor: "rgba(0,0,0,0.06)",
          ...Platform.select({
            web: { filter: "blur(16px)" } as any,
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
            },
          }),
        }}
      />

      {/* ── 2. Depth / side of button ── */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: r,
          top: (size + depth + 32 - size) / 2 - depth / 2 + depth,
          overflow: "hidden",
          transform: [{ scaleY: sideScaleY }],
        }}
      >
        <LinearGradient
          colors={["#2A9B7E", "#258268", "#1E6B55"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: r }]}
        />
      </Animated.View>

      {/* ── 3. Main button (top face) ── */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: r,
          top: (size + depth + 32 - size) / 2 - depth / 2,
          overflow: "visible",
          transform: [{ translateY: topY }, { scale: topScale }],
          shadowColor: "#1E6650",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.22,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        {/* 3a. Teal ring */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: r,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#75D9B8", "#58C4A0", "#42B08E"]}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.85, y: 0.9 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Teal inner bevel highlight */}
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: r,
              borderWidth: Math.max(1, size * 0.006),
              borderColor: "rgba(255,255,255,0.22)",
            }}
          />
          {/* Teal inner shadow */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.08)"]}
            start={{ x: 0.5, y: 0.6 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        {/* 3b. Gold band */}
        <View
          style={{
            position: "absolute",
            width: goldDia,
            height: goldDia,
            left: goldOff,
            top: goldOff,
            borderRadius: goldDia / 2,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#F5D88A", "#E8C060", "#D4A840"]}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Gold top highlight */}
          <LinearGradient
            colors={["rgba(255,255,255,0.40)", "transparent"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Gold bottom shadow */}
          <LinearGradient
            colors={["transparent", "rgba(140,100,30,0.22)"]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Gold inner bevel */}
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: goldDia / 2,
              borderWidth: Math.max(1, size * 0.005),
              borderColor: "rgba(255,255,255,0.28)",
            }}
          />
        </View>

        {/* 3c. Orange face */}
        <View
          style={{
            position: "absolute",
            width: faceDia,
            height: faceDia,
            left: faceOff,
            top: faceOff,
            borderRadius: faceDia / 2,
            overflow: "hidden",
          }}
        >
          {/* Base orange gradient */}
          <LinearGradient
            colors={["#FFC145", "#FF9E1B", "#ED7501"]}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Top-left specular highlight */}
          <LinearGradient
            colors={["rgba(255,240,210,0.55)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.45, y: 0.45 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Bottom-right depth shadow */}
          <LinearGradient
            colors={["transparent", "rgba(140,60,5,0.42)"]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Inner bevel highlight ring */}
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: faceDia / 2,
              borderWidth: Math.max(1, size * 0.008),
              borderColor: "rgba(255,255,255,0.22)",
            }}
          />
          {/* Inner shadow at bottom edge */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.12)"]}
            start={{ x: 0.5, y: 0.7 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        {/* 3d. Rocket image */}
        <Image
          source={rocketPng}
          style={{
            position: "absolute",
            width: rocketDia,
            height: rocketDia,
            left: rocketOff,
            top: rocketTop,
            ...Platform.select({
              web: {
                filter: "drop-shadow(1px 3px 5px rgba(0,0,0,0.30))",
              } as any,
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.28,
                shadowRadius: 5,
              },
              android: {
                elevation: 5,
              },
            }),
          }}
          contentFit="contain"
        />

        {/* 3e. Tap pulse ring */}
        <Animated.View
          style={{
            position: "absolute",
            width: faceDia,
            height: faceDia,
            left: faceOff,
            top: faceOff,
            borderRadius: faceDia / 2,
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.8)",
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
