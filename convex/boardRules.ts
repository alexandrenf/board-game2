import boardData from '../assets/board.json';

type RuleEffect = 'advance' | 'retreat' | 'none';

type RuleDefinition = {
  effect: RuleEffect;
  value?: number;
};

type TileEffect = {
  advance?: number;
  retreat?: number;
  [key: string]: unknown;
};

type BoardTile = {
  id: number;
  imageKey?: string;
  type?: string | null;
  color?: string;
  text?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

type BoardRules = {
  green?: RuleDefinition;
  red?: RuleDefinition;
  blue?: RuleDefinition;
  yellow?: RuleDefinition;
};

const boardDefinition = boardData as {
  version: number;
  board: {
    id: string;
    rules?: BoardRules;
  };
  tiles: BoardTile[];
};

const BOARD_RULES = boardDefinition.board.rules ?? {};
const BOARD_TILES = boardDefinition.tiles;

export const BOARD_ID = boardDefinition.board.id;
export const BOARD_VERSION = boardDefinition.version;
export const MAX_BOARD_LENGTH = BOARD_TILES.length;

export type MovementSegment = {
  kind: 'dice' | 'effect';
  fromIndex: number;
  toIndex: number;
  value: number;
  durationMs: number;
  effectType?: 'advance' | 'retreat';
};

export type LandingTilePayload = {
  index: number;
  id: number;
  color?: string;
  type?: string | null;
  text?: string;
  imageKey?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

export type TurnResolutionScript = {
  rollValue: number;
  fromIndex: number;
  baseToIndex: number;
  finalIndex: number;
  segments: MovementSegment[];
  landingTile: LandingTilePayload;
  effect:
    | {
        source: 'rules' | 'tile';
        type: 'advance' | 'retreat';
        value: number;
        fromIndex: number;
        toIndex: number;
      }
    | null;
  reachedEnd: boolean;
};

const clampIndex = (index: number, pathLength: number): number => {
  if (pathLength <= 0) return 0;
  return Math.max(0, Math.min(index, pathLength - 1));
};

const effectFromRule = (
  rule: RuleDefinition | undefined
): { type: 'advance' | 'retreat'; value: number } | null => {
  if (!rule) return null;
  if (rule.effect === 'advance' && typeof rule.value === 'number' && rule.value > 0) {
    return { type: 'advance', value: rule.value };
  }
  if (rule.effect === 'retreat' && typeof rule.value === 'number' && rule.value > 0) {
    return { type: 'retreat', value: rule.value };
  }
  return null;
};

const effectFromTile = (
  effect: TileEffect | undefined
): { type: 'advance' | 'retreat'; value: number } | null => {
  if (!effect) return null;
  if (typeof effect.advance === 'number' && effect.advance > 0) {
    return { type: 'advance', value: effect.advance };
  }
  if (typeof effect.retreat === 'number' && effect.retreat > 0) {
    return { type: 'retreat', value: effect.retreat };
  }
  return null;
};

const getLandingTilePayload = (index: number): LandingTilePayload => {
  const tile = BOARD_TILES[clampIndex(index, BOARD_TILES.length)]!;

  return {
    index,
    id: tile.id,
    color: tile.color,
    type: tile.type,
    text: tile.text,
    imageKey: tile.imageKey,
    effect: tile.effect,
    meta: tile.meta,
  };
};

const resolveLandingEffect = (
  tile: LandingTilePayload
):
  | {
      source: 'rules' | 'tile';
      type: 'advance' | 'retreat';
      value: number;
    }
  | null => {
  if (tile.color === 'red') {
    const ruleEffect = effectFromRule(BOARD_RULES.red);
    if (ruleEffect) {
      return {
        source: 'rules',
        type: ruleEffect.type,
        value: ruleEffect.value,
      };
    }
  }

  if (tile.color === 'green') {
    const ruleEffect = effectFromRule(BOARD_RULES.green);
    if (ruleEffect) {
      return {
        source: 'rules',
        type: ruleEffect.type,
        value: ruleEffect.value,
      };
    }
  }

  const tileEffect = effectFromTile(tile.effect);
  if (tileEffect) {
    return {
      source: 'tile',
      type: tileEffect.type,
      value: tileEffect.value,
    };
  }

  return null;
};

const movementDuration = (fromIndex: number, toIndex: number): number => {
  const steps = Math.abs(toIndex - fromIndex);
  return Math.max(220, Math.min(2200, 220 + steps * 170));
};

export const resolveTurnScript = (params: {
  fromIndex: number;
  rollValue: number;
  boardLength: number;
}): TurnResolutionScript => {
  const pathLength = Math.max(2, Math.min(params.boardLength, MAX_BOARD_LENGTH));
  const fromIndex = clampIndex(params.fromIndex, pathLength);
  const baseToIndex = clampIndex(fromIndex + params.rollValue, pathLength);

  const segments: MovementSegment[] = [
    {
      kind: 'dice',
      fromIndex,
      toIndex: baseToIndex,
      value: params.rollValue,
      durationMs: movementDuration(fromIndex, baseToIndex),
    },
  ];

  const landingTile = getLandingTilePayload(baseToIndex);
  const resolvedEffect = resolveLandingEffect(landingTile);

  let finalIndex = baseToIndex;
  let effect: TurnResolutionScript['effect'] = null;

  if (resolvedEffect) {
    const effectTarget =
      resolvedEffect.type === 'advance'
        ? clampIndex(baseToIndex + resolvedEffect.value, pathLength)
        : clampIndex(baseToIndex - resolvedEffect.value, pathLength);

    if (effectTarget !== baseToIndex) {
      segments.push({
        kind: 'effect',
        fromIndex: baseToIndex,
        toIndex: effectTarget,
        value: resolvedEffect.value,
        durationMs: movementDuration(baseToIndex, effectTarget),
        effectType: resolvedEffect.type,
      });
    }

    finalIndex = effectTarget;
    effect = {
      source: resolvedEffect.source,
      type: resolvedEffect.type,
      value: resolvedEffect.value,
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
