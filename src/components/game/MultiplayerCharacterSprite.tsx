import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const characterBase = require('@/assets/models/multiplayer_avatar/base.webp');
const shirtMask = require('@/assets/models/multiplayer_avatar/shirt-mask.webp');
const skinMask = require('@/assets/models/multiplayer_avatar/skin-mask.webp');
const hairMask = require('@/assets/models/multiplayer_avatar/hair-mask.webp');
const shadowOverlay = require('@/assets/models/multiplayer_avatar/shadow-overlay.webp');
const highlightOverlay = require('@/assets/models/multiplayer_avatar/highlight-overlay.webp');

type MultiplayerCharacterSpriteProps = {
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  height?: number;
};

const ASPECT_RATIO = 570 / 1209;

export const MultiplayerCharacterSprite: React.FC<MultiplayerCharacterSpriteProps> = ({
  shirtColor,
  hairColor,
  skinColor,
  height = 68,
}) => {
  const width = Math.round(height * ASPECT_RATIO);
  const dimensions = { width, height };

  return (
    <View style={[styles.container, dimensions]}>
      <Image source={characterBase} style={[styles.layer, dimensions]} contentFit="contain" />
      <Image source={shirtMask} style={[styles.layer, dimensions]} contentFit="contain" tintColor={shirtColor} />
      <Image source={skinMask} style={[styles.layer, dimensions]} contentFit="contain" tintColor={skinColor} />
      <Image source={hairMask} style={[styles.layer, dimensions]} contentFit="contain" tintColor={hairColor} />
      <Image source={shadowOverlay} style={[styles.layer, dimensions]} contentFit="contain" />
      <Image source={highlightOverlay} style={[styles.layer, dimensions]} contentFit="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  layer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
