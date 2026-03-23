import { TurnAnimationScript } from '@/src/game/runtime/types';

type TurnSegment = TurnAnimationScript['movement']['segments'][number];
type LandingTile = NonNullable<TurnAnimationScript['landingTile']>;
type TurnEffect = NonNullable<TurnAnimationScript['effect']>;
type NextTurn = NonNullable<TurnAnimationScript['nextTurn']>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isSegmentKind = (value: unknown): value is TurnSegment['kind'] =>
  value === 'dice' || value === 'effect';

const isEffectType = (value: unknown): value is NonNullable<TurnSegment['effectType']> =>
  value === 'advance' || value === 'retreat';

const isTurnSegment = (value: unknown): value is TurnSegment => {
  if (!isRecord(value)) return false;
  if (!isSegmentKind(value.kind)) return false;
  if (!isFiniteNumber(value.fromIndex)) return false;
  if (!isFiniteNumber(value.toIndex)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isFiniteNumber(value.durationMs)) return false;
  if (value.effectType !== undefined && !isEffectType(value.effectType)) return false;
  return true;
};

const isLandingTile = (value: unknown): value is LandingTile => {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.index)) return false;
  if (!isFiniteNumber(value.id)) return false;
  if (value.color !== undefined && typeof value.color !== 'string') return false;
  if (value.type !== undefined && value.type !== null && typeof value.type !== 'string') return false;
  if (value.text !== undefined && typeof value.text !== 'string') return false;
  if (value.imageKey !== undefined && typeof value.imageKey !== 'string') return false;
  if (value.meta !== undefined && !isRecord(value.meta)) return false;
  return true;
};

const isTurnEffect = (value: unknown): value is TurnEffect => {
  if (!isRecord(value)) return false;
  if (value.source !== 'rules' && value.source !== 'tile') return false;
  if (!isEffectType(value.type)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isFiniteNumber(value.fromIndex)) return false;
  if (!isFiniteNumber(value.toIndex)) return false;
  return true;
};

const isNextTurn = (value: unknown): value is NextTurn => {
  if (!isRecord(value)) return false;
  if (typeof value.playerId !== 'string' || value.playerId.length === 0) return false;
  if (!isFiniteNumber(value.turnNumber)) return false;
  return true;
};

/**
 * Parses an unknown payload into a TurnAnimationScript, returning null when the
 * payload is missing required runtime fields or contains malformed nested data.
 */
export const parseTurnScript = (value: unknown): TurnAnimationScript | null => {
  if (!isRecord(value)) return null;
  if (typeof value.turnId !== 'string' || value.turnId.length === 0) return null;
  if (typeof value.actorPlayerId !== 'string' || value.actorPlayerId.length === 0) return null;
  if (!isFiniteNumber(value.turnNumber)) return null;

  if (!isRecord(value.roll)) return null;
  if (!isFiniteNumber(value.roll.value)) return null;
  if (!isFiniteNumber(value.roll.startedAt)) return null;
  if (!isFiniteNumber(value.roll.durationMs)) return null;

  if (!isRecord(value.movement)) return null;
  if (!isFiniteNumber(value.movement.fromIndex)) return null;
  if (!isFiniteNumber(value.movement.baseToIndex)) return null;
  if (!isFiniteNumber(value.movement.finalIndex)) return null;
  if (!Array.isArray(value.movement.segments) || !value.movement.segments.every(isTurnSegment)) return null;

  if (value.landingTile !== undefined && !isLandingTile(value.landingTile)) return null;
  if (value.effect !== undefined && value.effect !== null && !isTurnEffect(value.effect)) return null;
  if (value.nextTurn !== undefined && value.nextTurn !== null && !isNextTurn(value.nextTurn)) return null;

  if (!isRecord(value.result)) return null;
  if (typeof value.result.gameFinished !== 'boolean') return null;
  if (!isOptionalString(value.result.winnerPlayerId)) return null;
  if (!isOptionalString(value.result.reason)) return null;

  if (value.deadlineAt !== undefined && !isFiniteNumber(value.deadlineAt)) return null;

  return value as TurnAnimationScript;
};
