import { triggerHaptic } from "@/src/utils/haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

export type Card3DTheme = {
  face: readonly [string, string, string];
  side: readonly [string, string, string];
  bevel: string;
  dropShadow: string;
};

export const CARD_3D_THEMES: Record<string, Card3DTheme> = {
  teal: {
    face: ["#75D9B8", "#58C4A0", "#42B08E"],
    side: ["#2A9B7E", "#258268", "#1E6B55"],
    bevel: "rgba(255,255,255,0.22)",
    dropShadow: "#1E6650",
  },
  blue: {
    face: ["#7FC4EE", "#4FA6DD", "#2E85C4"],
    side: ["#1F6FA8", "#185A8A", "#12486F"],
    bevel: "rgba(255,255,255,0.24)",
    dropShadow: "#133F5F",
  },
  green: {
    face: ["#8EDC7C", "#66C25A", "#46A63C"],
    side: ["#2E8B30", "#237428", "#1A5E1E"],
    bevel: "rgba(255,255,255,0.24)",
    dropShadow: "#144814",
  },
  pink: {
    face: ["#F5A3C7", "#E87FAE", "#C85F95"],
    side: ["#8E3E6E", "#762F59", "#5C2244"],
    bevel: "rgba(255,255,255,0.26)",
    dropShadow: "#4A1A36",
  },
  orange: {
    face: ["#FFC145", "#FF9E1B", "#ED7501"],
    side: ["#A84D08", "#8B3E06", "#6B2F04"],
    bevel: "rgba(255,255,255,0.26)",
    dropShadow: "#5C2803",
  },
  purple: {
    face: ["#B292E8", "#8F66D4", "#6E44B8"],
    side: ["#4A2D85", "#3A236A", "#2B1A50"],
    bevel: "rgba(255,255,255,0.24)",
    dropShadow: "#211340",
  },
  slate: {
    face: ["#F8F6F1", "#ECE5D8", "#D6CDBC"],
    side: ["#8A7F6C", "#6F6656", "#554D3F"],
    bevel: "rgba(255,255,255,0.55)",
    dropShadow: "#3A3223",
  },
};

type Card3DProps = {
  /** Fixed width. Omit to stretch to parent width. */
  width?: number;
  height: number;
  borderRadius?: number;
  theme?: keyof typeof CARD_3D_THEMES | Card3DTheme;
  depth?: number;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  haptic?: "light" | "medium" | "heavy" | false;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "none";
  /** Children render on top face, clipped by borderRadius. */
  children?: React.ReactNode;
  /** Render an extra layer on top of the face, *above* children but inside the clipped face. */
  overlay?: React.ReactNode;
  /** Bevel style: 'default' (themed) or 'glass' (soft white translucent edge). */
  bevelMode?: "default" | "glass";
};


export const Card3D: React.FC<Card3DProps> = ({
  width,
  height,
  borderRadius = 14,
  theme = "teal",
  depth,
  onPress,
  disabled,
  haptic = "light",
  style,
  testID,
  accessibilityLabel,
  accessibilityRole = "button",
  children,
  overlay,
  bevelMode = "default",
}) => {
  const resolvedTheme = typeof theme === "string" ? CARD_3D_THEMES[theme] ?? CARD_3D_THEMES.teal : theme;
  const resolvedDepth =
    depth ?? Math.max(6, Math.round(Math.min(width ?? height * 2, height) * 0.07));
  const pressAnim = useRef(new Animated.Value(0)).current;

  const animatePress = (to: number) => {
    Animated.spring(pressAnim, {
      toValue: to,
      useNativeDriver: false,
      speed: to === 1 ? 34 : 18,
      bounciness: to === 1 ? 2 : 10,
    }).start();
  };

  const handlePressIn = () => {
    if (disabled) return;
    if (haptic) triggerHaptic(haptic);
    animatePress(1);
  };
  const handlePressOut = () => {
    if (disabled) return;
    animatePress(0);
  };

  const topY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, resolvedDepth * 0.75],
  });
  const topScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.99],
  });
  const sideScaleY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.28],
  });

  const outerHeight = height + resolvedDepth;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled ? { disabled: true } : undefined}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
      style={[
        width !== undefined
          ? { width, height: outerHeight, opacity: disabled ? 0.6 : 1 }
          : { alignSelf: "stretch", height: outerHeight, opacity: disabled ? 0.6 : 1 },
        style,
      ]}
    >
      {/* Outer soft drop shadow */}
      <View
        pointerEvents="none"
        style={[
          styles.shadowBase,
          {
            top: resolvedDepth + 4,
            height: height - 4,
            borderRadius,
          },
        ]}
      />

      {/* Side / depth band */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: resolvedDepth,
          height,
          borderRadius,
          overflow: "hidden",
          transform: [{ scaleY: sideScaleY }],
          transformOrigin: "bottom" as any,
        }}
      >
        <LinearGradient
          colors={[...resolvedTheme.side] as [string, string, string]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />
      </Animated.View>

      {/* Top face */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height,
          borderRadius,
          overflow: "hidden",
          transform: [{ translateY: topY }, { scale: topScale }],
          shadowColor: resolvedTheme.dropShadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.22,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        {/* Face gradient */}
        <LinearGradient
          colors={[...resolvedTheme.face] as [string, string, string]}
          start={{ x: 0.15, y: 0.05 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Top-left specular highlight */}
        <LinearGradient
          colors={["rgba(255,255,255,0.28)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.55 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {/* Bottom-right depth shadow */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.18)"]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Children */}
        {children}

        {/* Inner bevel ring — on top of children so it frames them */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius,
              borderWidth: bevelMode === "glass" ? 1 : 1.25,
              borderColor: bevelMode === "glass"
                ? "rgba(255,255,255,0.4)"
                : resolvedTheme.bevel,
            },
          ]}
        />

        {overlay}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shadowBase: {
    position: "absolute",
    left: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.10)",
    ...Platform.select<ViewStyle>({
      web: { filter: "blur(10px)" } as unknown as ViewStyle,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
    }),
  },
});
