import boardData from '@/assets/board.json';
import { BoardConfig } from '@/src/domain/game/types';
import { z } from 'zod';

const MAX_SUPPORTED_TILES = 46;

const tileEffectSchema = z
  .object({
    advance: z.number().int().positive().optional(),
    retreat: z.number().int().positive().optional(),
  })
  .catchall(z.unknown())
  .refine(
    (value) => !(value.advance && value.retreat),
    'Tile effect cannot define advance and retreat at the same time'
  );

const ruleDefinitionSchema = z.object({
  effect: z.enum(['advance', 'retreat', 'none']),
  value: z.number().int().positive().optional(),
});

const boardTileDefinitionSchema = z.object({
  id: z.number().int().positive(),
  imageKey: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  text: z.string().optional(),
  effect: tileEffectSchema.optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const boardConfigSchema = z
  .object({
    version: z.number().int().positive(),
    board: z.object({
      id: z.string().min(1),
      flow: z.string().optional(),
      startTile: z.number().int().positive().optional(),
      endTile: z.number().int().positive().optional(),
      rules: z
        .object({
          green: ruleDefinitionSchema.optional(),
          red: ruleDefinitionSchema.optional(),
          blue: ruleDefinitionSchema.optional(),
          yellow: ruleDefinitionSchema.optional(),
        })
        .optional(),
    }),
    tiles: z.array(boardTileDefinitionSchema).min(2).max(MAX_SUPPORTED_TILES),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<number>();

    value.tiles.forEach((tile, index) => {
      if (ids.has(tile.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiles', index, 'id'],
          message: `Duplicate tile id detected: ${tile.id}`,
        });
      }
      ids.add(tile.id);
    });

    const startExists = value.tiles.some((tile) => tile.type === 'start');
    const endExists = value.tiles.some((tile) => tile.type === 'end');

    if (!startExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tiles'],
        message: 'Board must include a start tile',
      });
    }

    if (!endExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tiles'],
        message: 'Board must include an end tile',
      });
    }
  });

let cachedBoardConfig: BoardConfig | null = null;

export const getValidatedBoardConfig = (): BoardConfig => {
  if (cachedBoardConfig) return cachedBoardConfig;

  const parsed = boardConfigSchema.parse(boardData);
  cachedBoardConfig = parsed;
  return cachedBoardConfig;
};
