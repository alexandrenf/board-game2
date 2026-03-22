export type GameStatus = 'menu' | 'playing' | 'multiplayer';

export type TileEffect = {
  advance?: number;
  retreat?: number;
  [key: string]: unknown;
};

export type Tile = {
  row: number;
  col: number;
  index: number;
  id: number;
  imageKey?: string;
  type?: string;
  color?: string;
  text?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

export type RuleEffect = 'advance' | 'retreat' | 'none';

export type RuleDefinition = {
  effect: RuleEffect;
  value?: number;
};

export type BoardRules = {
  green?: RuleDefinition;
  red?: RuleDefinition;
  blue?: RuleDefinition;
  yellow?: RuleDefinition;
};

export type BoardTileDefinition = {
  id: number;
  imageKey?: string;
  type?: string;
  color?: string;
  text?: string;
  effect?: TileEffect;
  meta?: Record<string, unknown>;
};

export type BoardConfig = {
  version: number;
  board: {
    id: string;
    flow?: string;
    startTile?: number;
    endTile?: number;
    rules?: BoardRules;
  };
  tiles: BoardTileDefinition[];
};

export type GameSnapshot = {
  gameStatus: GameStatus;
  pathLength: number;
  playerIndex: number;
  targetIndex: number;
  isMoving: boolean;
  isRolling: boolean;
  isApplyingEffect: boolean;
};

export type MoveResult = {
  fromIndex: number;
  targetIndex: number;
  movedBy: number;
  reachedEnd: boolean;
};

export type EffectResult = {
  effect: TileEffect | null;
  source: 'rules' | 'tile' | 'none';
};

export type GameEvent = {
  type:
    | 'game_started'
    | 'dice_rolled'
    | 'movement_finished'
    | 'effect_applied'
    | 'tile_preview_opened'
    | 'game_reset';
  timestamp: number;
  payload?: Record<string, unknown>;
};
