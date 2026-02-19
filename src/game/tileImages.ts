import type { ImageSourcePropType } from 'react-native';

type TileImageDescriptor = {
  imageKey?: string;
  color?: string;
  type?: string;
};

const TILE_IMAGE_REGISTRY: Record<string, ImageSourcePropType> = {
  'tile-start': require('../../assets/images/icon.png'),
  'tile-end': require('../../assets/images/splash-icon.png'),
  'tile-risk': require('../../assets/images/android-icon-foreground.png'),
  'tile-prevention': require('../../assets/images/react-logo.png'),
  'tile-safe': require('../../assets/images/partial-react-logo.png'),
  'tile-special': require('../../assets/images/splash-icon.png'),
};

const COLOR_FALLBACK_IMAGES: Record<string, ImageSourcePropType> = {
  red: TILE_IMAGE_REGISTRY['tile-risk'],
  green: TILE_IMAGE_REGISTRY['tile-prevention'],
  blue: TILE_IMAGE_REGISTRY['tile-safe'],
  yellow: TILE_IMAGE_REGISTRY['tile-special'],
};

const DEFAULT_TILE_IMAGE = require('../../assets/images/partial-react-logo.png');

export const resolveTileImage = ({ imageKey, color, type }: TileImageDescriptor): ImageSourcePropType => {
  if (imageKey && TILE_IMAGE_REGISTRY[imageKey]) {
    return TILE_IMAGE_REGISTRY[imageKey];
  }

  if (type === 'start') return TILE_IMAGE_REGISTRY['tile-start'];
  if (type === 'end') return TILE_IMAGE_REGISTRY['tile-end'];

  if (color) {
    const fallbackByColor = COLOR_FALLBACK_IMAGES[color.toLowerCase()];
    if (fallbackByColor) return fallbackByColor;
  }

  return DEFAULT_TILE_IMAGE;
};
