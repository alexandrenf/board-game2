import boardData from '../assets/board.json';
import { Id } from './_generated/dataModel';
import { QueryCtx } from './_generated/server';
import { selectQuestion } from '../src/domain/game/quizSelector';
import { QuizBank, QuizQuestion } from '../src/domain/game/quizTypes';
import { BoardRules, LandingTilePayload, TileEffect } from '../src/domain/game/types';
import { ADAPTED_QUESTION_BANK } from '../src/content/quizQuestionAdapter';

type RoomId = Id<'rooms'>;
type BoardTile = Omit<LandingTilePayload, 'index'> & {
  effect?: TileEffect;
};

const boardDefinition = boardData as {
  board: {
    rules?: BoardRules;
  };
  tiles: BoardTile[];
};

const questionBank: QuizBank = { version: 2, questions: ADAPTED_QUESTION_BANK };

export const QUIZ_TIMEOUT_MS = 90 * 1000;
export const BOARD_TILES = boardDefinition.tiles;

export const getBoardTile = (index: number): BoardTile | undefined => BOARD_TILES[index];

export const isQuizEligibleTile = (
  tile: BoardTile | undefined
): tile is BoardTile & { color: string; meta: Record<string, unknown> & { themeId: string } } =>
  Boolean(
    tile &&
      typeof tile.color === 'string' &&
      ['green', 'red', 'blue', 'yellow'].includes(tile.color) &&
      typeof tile.meta?.themeId === 'string' &&
      tile.type !== 'start' &&
      tile.type !== 'end' &&
      tile.type !== 'bonus'
  );

export const getQuizRuleValue = (tileColor: string): number => {
  const rules = boardDefinition.board.rules;
  const rule =
    tileColor === 'green'
      ? rules?.green
      : tileColor === 'red'
        ? rules?.red
        : tileColor === 'blue'
          ? rules?.blue
          : undefined;

  return typeof rule?.value === 'number' && rule.value > 0 ? rule.value : 2;
};

export const selectQuizQuestion = async (
  ctx: QueryCtx,
  roomId: RoomId,
  themeId: string,
): Promise<QuizQuestion> => {
  const previousRounds = await ctx.db
    .query('roomQuizRounds')
    .withIndex('by_room', (q) => q.eq('roomId', roomId))
    .order('desc')
    .take(200);
  const usedQuestionIds = previousRounds
    .filter((round) => round.status !== 'cancelled')
    .map((round) => round.questionId);
  const question = selectQuestion(themeId, usedQuestionIds, questionBank.questions);

  if (!question) {
    throw new Error('Nenhuma pergunta disponivel para esta casa.');
  }

  return question;
};
