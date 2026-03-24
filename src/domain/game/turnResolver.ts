import {
  BoardRules,
  EffectResult,
  GameSnapshot,
  LandingTilePayload,
  MoveResult,
  MovementSegment,
  ResolvedTurnScript,
  RuleDefinition,
  Tile,
  TileEffect,
} from './types';

type TurnTile = Pick<
  Tile,
  'id' | 'color' | 'type' | 'text' | 'imageKey' | 'effect' | 'meta'
>;

type MovementDurationProfile = {
  minMs?: number;
  maxMs?: number;
  baseMs?: number;
  perStepMs?: number;
};

const DEFAULT_DURATION_PROFILE: Required<MovementDurationProfile> = {
  minMs: 220,
  maxMs: 2200,
  baseMs: 220,
  perStepMs: 170,
};

export const clampIndex = (index: number, pathLength: number): number => {
  if (pathLength <= 0) return 0;
  return Math.max(0, Math.min(index, pathLength - 1));
};

export const resolveRoll = (
  snapshot: Pick<GameSnapshot, 'playerIndex' | 'pathLength'>,
  roll: number
): MoveResult => {
  const fromIndex = clampIndex(snapshot.playerIndex, snapshot.pathLength);
  const targetIndex = clampIndex(fromIndex + roll, snapshot.pathLength);

  return {
    fromIndex,
    targetIndex,
    movedBy: targetIndex - fromIndex,
    reachedEnd: snapshot.pathLength > 0 && targetIndex === snapshot.pathLength - 1,
  };
};

const effectFromRule = (rule: RuleDefinition | undefined): TileEffect | null => {
  if (!rule) return null;
  if (rule.effect === 'advance' && typeof rule.value === 'number' && rule.value > 0) {
    return { advance: rule.value };
  }
  if (rule.effect === 'retreat' && typeof rule.value === 'number' && rule.value > 0) {
    return { retreat: rule.value };
  }
  return null;
};

const effectFromTile = (effect: TileEffect | undefined): TileEffect | null => {
  if (!effect) return null;
  if (typeof effect.advance === 'number' && effect.advance > 0) {
    return { advance: effect.advance };
  }
  if (typeof effect.retreat === 'number' && effect.retreat > 0) {
    return { retreat: effect.retreat };
  }
  return null;
};

const getRuleForTileColor = (tileColor: string | undefined, rules?: BoardRules): RuleDefinition | undefined => {
  if (!tileColor || !rules) return undefined;

  switch (tileColor) {
    case 'red':
      return rules.red;
    case 'green':
      return rules.green;
    case 'blue':
      return rules.blue;
    case 'yellow':
      return rules.yellow;
    default:
      return undefined;
  }
};

export const resolveLandingEffect = (
  tile: Pick<Tile, 'color' | 'effect'> | undefined,
  rules?: BoardRules
): EffectResult => {
  if (!tile) {
    return { effect: null, source: 'none' };
  }

  const rule = getRuleForTileColor(tile.color, rules);
  if (rule) {
    const effect = effectFromRule(rule);
    return {
      effect,
      source: effect ? 'rules' : 'none',
    };
  }

  const tileEffect = effectFromTile(tile.effect);
  if (tileEffect) {
    return {
      effect: tileEffect,
      source: 'tile',
    };
  }

  return { effect: null, source: 'none' };
};

export const advanceWithEffect = (
  snapshot: Pick<GameSnapshot, 'playerIndex' | 'pathLength'>,
  effect: TileEffect
): MoveResult => {
  const fromIndex = clampIndex(snapshot.playerIndex, snapshot.pathLength);

  let targetIndex = fromIndex;
  if (typeof effect.advance === 'number' && effect.advance > 0) {
    targetIndex = clampIndex(fromIndex + effect.advance, snapshot.pathLength);
  } else if (typeof effect.retreat === 'number' && effect.retreat > 0) {
    targetIndex = clampIndex(fromIndex - effect.retreat, snapshot.pathLength);
  }

  return {
    fromIndex,
    targetIndex,
    movedBy: targetIndex - fromIndex,
    reachedEnd: snapshot.pathLength > 0 && targetIndex === snapshot.pathLength - 1,
  };
};

export const movementDuration = (
  fromIndex: number,
  toIndex: number,
  profile: MovementDurationProfile = DEFAULT_DURATION_PROFILE
): number => {
  const { minMs, maxMs, baseMs, perStepMs } = {
    ...DEFAULT_DURATION_PROFILE,
    ...profile,
  };
  const steps = Math.abs(toIndex - fromIndex);
  return Math.max(minMs, Math.min(maxMs, baseMs + steps * perStepMs));
};

const toLandingTilePayload = (tile: TurnTile, index: number): LandingTilePayload => ({
  index,
  id: tile.id,
  color: tile.color,
  type: tile.type ?? null,
  text: tile.text,
  imageKey: tile.imageKey,
  effect: tile.effect,
  meta: tile.meta,
});

export const resolveTurnScript = (params: {
  fromIndex: number;
  rollValue: number;
  boardLength: number;
  tiles: readonly TurnTile[];
  rules?: BoardRules;
  durationProfile?: MovementDurationProfile;
}): ResolvedTurnScript => {
  const maxPathLength = Math.max(2, params.tiles.length);
  const pathLength = Math.max(2, Math.min(params.boardLength, maxPathLength));
  const fromIndex = clampIndex(params.fromIndex, pathLength);
  const baseToIndex = clampIndex(fromIndex + params.rollValue, pathLength);

  const segments: MovementSegment[] = [
    {
      kind: 'dice',
      fromIndex,
      toIndex: baseToIndex,
      value: params.rollValue,
      durationMs: movementDuration(fromIndex, baseToIndex, params.durationProfile),
    },
  ];

  const landingTileDefinition = params.tiles[baseToIndex] ?? params.tiles[Math.max(0, pathLength - 1)]!;
  const landingTile = toLandingTilePayload(landingTileDefinition, baseToIndex);
  const landing = resolveLandingEffect(landingTile, params.rules);

  let finalIndex = baseToIndex;
  let effect: ResolvedTurnScript['effect'] = null;

  if (landing.effect) {
    const effectType = landing.effect.advance ? 'advance' : 'retreat';
    const effectValue = landing.effect.advance ?? landing.effect.retreat ?? 0;
    const effectTarget =
      effectType === 'advance'
        ? clampIndex(baseToIndex + effectValue, pathLength)
        : clampIndex(baseToIndex - effectValue, pathLength);

    if (effectTarget !== baseToIndex) {
      segments.push({
        kind: 'effect',
        fromIndex: baseToIndex,
        toIndex: effectTarget,
        value: effectValue,
        durationMs: movementDuration(baseToIndex, effectTarget, params.durationProfile),
        effectType,
      });
    }

    finalIndex = effectTarget;
    effect = {
      source: landing.source === 'none' ? 'tile' : landing.source,
      type: effectType,
      value: effectValue,
      fromIndex: baseToIndex,
      toIndex: effectTarget,
    };
  }

  return {
    rollValue: params.rollValue,
    fromIndex,
    baseToIndex,
    finalIndex,
    segments,
    landingTile,
    effect,
    reachedEnd: finalIndex >= pathLength - 1,
  };
};

export const firstActiveTurn = <T extends string>(
  turnOrder: readonly T[],
  activeIds: ReadonlySet<T>
): { playerId: T; index: number } | null => {
  for (let i = 0; i < turnOrder.length; i += 1) {
    const playerId = turnOrder[i]!;
    if (activeIds.has(playerId)) {
      return { playerId, index: i };
    }
  }

  return null;
};

export const nextActiveTurn = <T extends string>(
  turnOrder: readonly T[],
  currentPlayerId: T,
  activeIds: ReadonlySet<T>
): { playerId: T; index: number } | null => {
  if (turnOrder.length === 0) {
    return null;
  }

  const currentIndex = Math.max(0, turnOrder.indexOf(currentPlayerId));

  for (let step = 1; step <= turnOrder.length; step += 1) {
    const candidateIndex = (currentIndex + step) % turnOrder.length;
    const candidate = turnOrder[candidateIndex]!;

    if (activeIds.has(candidate)) {
      return {
        playerId: candidate,
        index: candidateIndex,
      };
    }
  }

  return null;
};
