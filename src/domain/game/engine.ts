import {
  BoardRules,
  EffectResult,
  GameSnapshot,
  MoveResult,
  Tile,
  TileEffect,
} from './types';

export const clampIndex = (index: number, pathLength: number): number => {
  if (pathLength <= 0) return 0;
  return Math.max(0, Math.min(index, pathLength - 1));
};

export const resolveRoll = (snapshot: GameSnapshot, roll: number): MoveResult => {
  const fromIndex = clampIndex(snapshot.playerIndex, snapshot.pathLength);
  const targetIndex = clampIndex(fromIndex + roll, snapshot.pathLength);

  return {
    fromIndex,
    targetIndex,
    movedBy: targetIndex - fromIndex,
    reachedEnd: snapshot.pathLength > 0 && targetIndex === snapshot.pathLength - 1,
  };
};

const effectFromRule = (effectName: string | undefined, value: number | undefined): TileEffect | null => {
  if (effectName === 'advance' && typeof value === 'number' && value > 0) {
    return { advance: value };
  }
  if (effectName === 'retreat' && typeof value === 'number' && value > 0) {
    return { retreat: value };
  }
  return null;
};

export const resolveLandingEffect = (tile: Tile | undefined, rules?: BoardRules): EffectResult => {
  if (!tile) {
    return { effect: null, source: 'none' };
  }

  if (tile.color === 'red' && rules?.red) {
    return {
      effect: effectFromRule(rules.red.effect, rules.red.value),
      source: 'rules',
    };
  }

  if (tile.color === 'green' && rules?.green) {
    return {
      effect: effectFromRule(rules.green.effect, rules.green.value),
      source: 'rules',
    };
  }

  if (tile.effect && (tile.effect.advance || tile.effect.retreat)) {
    return {
      effect: tile.effect,
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
