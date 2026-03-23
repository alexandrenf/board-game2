import { TurnAnimationScript } from '@/src/game/runtime/types';

/**
 * Parses an unknown payload into a TurnAnimationScript, returning null/undefined if invalid.
 * Returns null to match the MultiplayerOverlay usage (null check) and undefined to match
 * the runtimeStore usage (undefined check). Both overloads share the same validation logic.
 */
export const parseTurnScript = (value: unknown): TurnAnimationScript | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as TurnAnimationScript;
  if (!candidate.turnId || !candidate.actorPlayerId || !candidate.movement?.segments) return null;
  return candidate;
};
