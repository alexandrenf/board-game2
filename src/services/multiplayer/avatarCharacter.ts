export const AVATAR_CHARACTER_PREFIX = 'avatar:';

const sanitizeHexToken = (color: string): string =>
  color.replace('#', '').slice(0, 6).toLowerCase();

export const buildAvatarCharacterId = (palette: {
  shirtColor: string;
  hairColor: string;
  skinColor: string;
}): string =>
  `${AVATAR_CHARACTER_PREFIX}${sanitizeHexToken(palette.shirtColor)}-${sanitizeHexToken(
    palette.hairColor
  )}-${sanitizeHexToken(palette.skinColor)}`;
