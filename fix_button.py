import os

content = """import { triggerHaptic } from "@/src/utils/haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";

type Launch3DButtonProps = {
  size?: number;
  testID?: string;
  onPress?: (event: GestureResponderEvent) => void;
};

const DEFAULT_SIZE = 230;
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export function Launch3DButton({
  size = DEFAULT_SIZE,
  testID = "launch-3d-button",
  onPress,
}: Launch3DButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  // SVG was 1254 bounding box, and the button visual size vs background shadow means the shadow extends beyond the "button size".
  // Let size = button diameter = approx 1060 base width. Then containerSize = size * (1254/1060)
  const containerSize = size * (1254 / 1060); 
  const scale = containerSize / 1254;

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
    triggerHaptic("medium");
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

  // Layers 1-5 (Normal state) vs 6-10 (Pressed State overlays/replacements)
  // Crossfade between sets for natural lighting integration + mechanical movement
  
  const pressedOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  const normalOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12 * scale], // physical depression
  });
  
  const rocketTranslateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18 * scale], // Rocket dips slightly more playfully
  });

  const buttonScale = pressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.99, 0.98],
  });

  // Since Image requires absolute dimensions and positions to render perfectly:
  const L1 = { w: 1254, h: 1254, x: 0, y: 0 };
  const L2 = { w: 1060, h: 1079, x: 97, y: 78 };
  const L3 = { w: 980, h: 1000, x: 137, y: 117 };
  const L4 = { w: 883, h: 883, x: 176, y: 176 };
  const L5 = { w: 491, h: 510, x: 372, y: 333 };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Iniciar jogo"
      hitSlop={16}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      pressRetentionOffset={24}
      style={[
        styles.pressable,
        { width: containerSize, height: containerSize },
      ]}
      testID={testID}
    >
      <Animated.View style={[styles.stage, { width: containerSize, height: containerSize, transform: [{ scale: buttonScale }] }]}>
        
        {/* Layer 1 - Outer Shadow */}
        <Animated.Image 
          source={require("@/assets/images/launchButton/layer_01.png")} 
          style={[{ position: "absolute", width: L1.w * scale, height: L1.h * scale, left: L1.x * scale, top: L1.y * scale, opacity: normalOpacity }]} 
        />
        <Animated.Image 
          source={require("@/assets/images/launchButton/layer_06.png")} 
          style={[{ position: "absolute", width: L1.w * scale, height: L1.h * scale, left: L1.x * scale, top: L1.y * scale, opacity: pressedOpacity }]} 
        />

        {/* Layer 2 - Base Casing */}
        <Animated.View style={[{ position: "absolute" }, { transform: [{ translateY }] }]}>
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_02.png")} 
            style={{ position: "absolute", width: L2.w * scale, height: L2.h * scale, left: L2.x * scale, top: L2.y * scale, opacity: normalOpacity }} 
          />
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_07.png")} 
            style={{ position: "absolute", width: L2.w * scale, height: L2.h * scale, left: L2.x * scale, top: L2.y * scale, opacity: pressedOpacity }} 
          />
          
          {/* Layer 3 - Inner Ring */}
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_03.png")} 
            style={{ position: "absolute", width: L3.w * scale, height: L3.h * scale, left: L3.x * scale, top: L3.y * scale, opacity: normalOpacity }} 
          />
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_08.png")} 
            style={{ position: "absolute", width: L3.w * scale, height: L3.h * scale, left: L3.x * scale, top: L3.y * scale, opacity: pressedOpacity }} 
          />
          
          {/* Layer 4 - Face */}
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_04.png")} 
            style={{ position: "absolute", width: L4.w * scale, height: L4.h * scale, left: L4.x * scale, top: L4.y * scale, opacity: normalOpacity }} 
          />
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_09.png")} 
            style={{ position: "absolute", width: L4.w * scale, height: L4.h * scale, left: L4.x * scale, top: L4.y * scale, opacity: pressedOpacity }} 
          />
        </Animated.View>

        {/* Layer 5 - Rocket */}
        <Animated.View style={[{ position: "absolute" }, { transform: [{ translateY: rocketTranslateY }] }]}>
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_05.png")} 
            style={{ position: "absolute", width: L5.w * scale, height: L5.h * scale, left: L5.x * scale, top: L5.y * scale, opacity: normalOpacity }} 
          />
          <Animated.Image 
            source={require("@/assets/images/launchButton/layer_10.png")} 
            style={{ position: "absolute", width: L5.w * scale, height: L5.h * scale, left: L5.x * scale, top: L5.y * scale, opacity: pressedOpacity }} 
          />
        </Animated.View>

      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    flex: 1,
  },
});
"""

with open("src/components/ui/Launch3DButton.tsx", "w") as f:
    f.write(content)
