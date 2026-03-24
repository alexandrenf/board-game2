import boardData from '../assets/board.json';
import type {
  BoardRules,
  LandingTilePayload,
  MovementSegment,
  ResolvedTurnScript,
  TileEffect,
} from '../src/domain/game/types';
import { resolveTurnScript as resolveSharedTurnScript } from '../src/domain/game/turnResolver';

type BoardTile = Omit<LandingTilePayload, 'index'> & {
  effect?: TileEffect;
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
export type TurnResolutionScript = ResolvedTurnScript;

export const resolveTurnScript = (params: {
  fromIndex: number;
  rollValue: number;
  boardLength: number;
}): TurnResolutionScript =>
  resolveSharedTurnScript({
    fromIndex: params.fromIndex,
    rollValue: params.rollValue,
    boardLength: Math.max(2, Math.min(params.boardLength, MAX_BOARD_LENGTH)),
    tiles: BOARD_TILES,
    rules: BOARD_RULES,
  });
