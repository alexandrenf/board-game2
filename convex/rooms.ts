import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { DatabaseReader, DatabaseWriter, MutationCtx, internalMutation, mutation, query } from './_generated/server';
import {
  BOARD_ID,
  BOARD_VERSION,
  MAX_BOARD_LENGTH,
  TurnResolutionScript,
  resolveTurnScript,
} from './boardRules';
import { resolveQuizEffect } from '../src/domain/game/quizEffectResolver';
import { QuizResult } from '../src/domain/game/quizTypes';
import { firstActiveTurn, nextActiveTurn, clampIndex, movementDuration } from '../src/domain/game/turnResolver';
import { MovementSegment, ResolvedTurnScript } from '../src/domain/game/types';
import { shouldCancelPendingTurnOnLeave } from '../src/game/session/multiplayerUtils';
import {
  getBoardTile,
  getQuizRuleValue,
  isQuizEligibleTile,
  QUIZ_TIMEOUT_MS,
  selectQuizQuestion,
} from './quiz';

const MAX_PLAYERS = 4;
// Client-side display hint for how long to show the roll animation (ms).
// Not derived from segment data.
const ROLL_DISPLAY_DURATION_MS = 1000;
const ROOM_CODE_LENGTH = 3;
const DEFAULT_BOARD_LENGTH = 46;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_ATTEMPTS = 400;
// 45s = 2.25x the 20s heartbeat interval. A live player misses at most 2 beats.
const PRESENCE_TIMEOUT_MS = 45 * 1000;
const EMPTY_ROOM_TTL_MS = 12 * 60 * 60 * 1000;
const HISTORY_TAKE_LIMIT = 160;
const EVENTS_DELTA_LIMIT = 120;
const ROOM_PROTOCOL_VERSION = 3;
const ROOM_EVENT_VERSION = 3;
const TURN_ACK_TIMEOUT_MS = 18 * 1000;

type RoomId = Id<'rooms'>;
type PlayerId = Id<'roomPlayers'>;
type QuizRoundId = Id<'roomQuizRounds'>;
type TurnPhase = 'lobby' | 'awaiting_roll' | 'awaiting_quiz' | 'awaiting_ack' | 'finished';
type QuizResolutionReason = 'all_answered' | 'timeout';

type RoomEventInput = {
  type: string;
  actorPlayerId?: PlayerId;
  turnId?: string;
  turnNumber?: number;
  phase?: TurnPhase;
  eventVersion?: number;
  payload?: unknown;
};

function fail(message: string): never {
  throw new ConvexError(message);
}

const sanitizeClientId = (clientId: string): string => {
  const normalized = clientId.trim();
  if (!normalized) {
    fail('Identificador de cliente invalido.');
  }
  if (normalized.length > 128) {
    fail('clientId too long.');
  }
  return normalized;
};

const sanitizeRoomCode = (roomCode: string): string => {
  const normalized = roomCode.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH);
  if (normalized.length !== ROOM_CODE_LENGTH) {
    fail('Codigo de sala invalido. Use 3 letras.');
  }
  return normalized;
};

const sanitizePlayerName = (name: string | undefined, fallback: string): string => {
  const normalized = name?.trim().slice(0, 26);
  if (!normalized) return fallback;
  return normalized;
};

const sanitizeCharacterId = (characterId: string): string => {
  const normalized = characterId.trim().slice(0, 40);
  if (!normalized) {
    fail('Personagem invalido.');
  }
  return normalized;
};

const randomInt = (minInclusive: number, maxInclusive: number): number => {
  const span = maxInclusive - minInclusive + 1;
  return minInclusive + Math.floor(Math.random() * span);
};

const clampBoardLength = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Math.min(DEFAULT_BOARD_LENGTH, MAX_BOARD_LENGTH);
  }

  return Math.max(2, Math.min(MAX_BOARD_LENGTH, Math.floor(value)));
};

const generateRoomCode = (): string => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length - 1)];
  }
  return code;
};

const generateTurnId = (): string => `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const getRoomOrThrow = async (ctx: { db: DatabaseReader }, roomId: RoomId): Promise<Doc<'rooms'>> => {
  const room = await ctx.db.get(roomId);
  if (!room) {
    fail('Sala nao encontrada.');
  }
  return room;
};

const getRoomPlayers = async (ctx: { db: DatabaseReader }, roomId: RoomId): Promise<Doc<'roomPlayers'>[]> => {
  const players = (await ctx.db
    .query('roomPlayers')
    .withIndex('by_room', (q) => q.eq('roomId', roomId))
    .collect()) as Doc<'roomPlayers'>[];

  players.sort((a, b) => {
    if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
    return a._creationTime - b._creationTime;
  });

  return players;
};

const getActivePlayers = (players: Doc<'roomPlayers'>[]): Doc<'roomPlayers'>[] =>
  players.filter((player) => player.status === 'active');

const buildQuizRankings = (players: Doc<'roomPlayers'>[], winnerPlayerId?: PlayerId) =>
  [...players]
    .sort((left, right) => {
      if (winnerPlayerId) {
        if (left._id === winnerPlayerId) return -1;
        if (right._id === winnerPlayerId) return 1;
      }
      const pointsDelta = (right.quizPoints ?? 0) - (left.quizPoints ?? 0);
      if (pointsDelta !== 0) return pointsDelta;
      if (left.joinedAt !== right.joinedAt) return left.joinedAt - right.joinedAt;
      return left._creationTime - right._creationTime;
    })
    .map((player, index) => ({
      rank: index + 1,
      playerId: player._id,
      quizPoints: player.quizPoints ?? 0,
    }));

const ensureActivePlayer = (
  player: Doc<'roomPlayers'> | null | undefined,
  clientId: string,
  roomId: RoomId
): Doc<'roomPlayers'> => {
  if (!player || player.roomId !== roomId) {
    fail('Jogador nao encontrado nesta sala.');
  }

  if (player.clientId !== clientId) {
    fail('Este jogador pertence a outro dispositivo.');
  }

  if (player.status !== 'active') {
    fail('Jogador nao esta ativo na sala.');
  }

  return player;
};

const resolveActivePlayerInRoom = (
  players: Doc<'roomPlayers'>[],
  playerId: PlayerId,
  clientId: string,
  roomId: RoomId
): Doc<'roomPlayers'> => {
  const requestedPlayer = players.find((entry) => entry._id === playerId);
  if (requestedPlayer) {
    return ensureActivePlayer(requestedPlayer, clientId, roomId);
  }

  // Recover from stale local player ids by trusting the active player already
  // associated with this client in the target room.
  const fallbackPlayer = players.find((entry) => entry.clientId === clientId && entry.status === 'active');
  if (!fallbackPlayer) {
    fail('Jogador nao encontrado nesta sala.');
  }

  return fallbackPlayer;
};

const resolveActivePlayerByClientId = (
  players: Doc<'roomPlayers'>[],
  clientId: string,
  roomId: RoomId
): Doc<'roomPlayers'> => {
  const activePlayer = players.find((entry) => entry.clientId === clientId && entry.status === 'active');
  return ensureActivePlayer(activePlayer, clientId, roomId);
};

const insertRoomEvents = async (
  ctx: { db: DatabaseWriter },
  roomId: RoomId,
  startSequence: number,
  createdAt: number,
  events: RoomEventInput[]
): Promise<number> => {
  let sequence = startSequence;

  for (const event of events) {
    await ctx.db.insert('roomEvents', {
      roomId,
      sequence,
      eventVersion: event.eventVersion ?? ROOM_EVENT_VERSION,
      type: event.type,
      actorPlayerId: event.actorPlayerId,
      turnId: event.turnId,
      turnNumber: event.turnNumber,
      phase: event.phase,
      payload: event.payload,
      createdAt,
    });
    sequence += 1;
  }

  return sequence;
};

const removeRoomData = async (ctx: { db: DatabaseWriter }, roomId: RoomId): Promise<void> => {
  const players = await ctx.db
    .query('roomPlayers')
    .withIndex('by_room', (q) => q.eq('roomId', roomId))
    .collect();

  await Promise.all(players.map((player: Doc<'roomPlayers'>) => ctx.db.delete(player._id)));

  while (true) {
    const eventBatch = await ctx.db
      .query('roomEvents')
      .withIndex('by_room_sequence', (q) => q.eq('roomId', roomId))
      .take(100);
    if (eventBatch.length === 0) break;
    await Promise.all(eventBatch.map((event: Doc<'roomEvents'>) => ctx.db.delete(event._id)));
  }

  while (true) {
    const operationBatch = await ctx.db
      .query('roomTurnOperations')
      .withIndex('by_room_status', (q) => q.eq('roomId', roomId))
      .take(100);
    if (operationBatch.length === 0) break;
    await Promise.all(operationBatch.map((op: Doc<'roomTurnOperations'>) => ctx.db.delete(op._id)));
  }

  while (true) {
    const answerBatch = await ctx.db
      .query('roomQuizAnswers')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .take(100);
    if (answerBatch.length === 0) break;
    await Promise.all(answerBatch.map((answer: Doc<'roomQuizAnswers'>) => ctx.db.delete(answer._id)));
  }

  while (true) {
    const roundBatch = await ctx.db
      .query('roomQuizRounds')
      .withIndex('by_room', (q) => q.eq('roomId', roomId))
      .take(100);
    if (roundBatch.length === 0) break;
    await Promise.all(roundBatch.map((round: Doc<'roomQuizRounds'>) => ctx.db.delete(round._id)));
  }

  await ctx.db.delete(roomId);
};

const createUniqueRoomCode = async (ctx: { db: DatabaseReader }): Promise<string> => {
  for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateRoomCode();
    const existing = await ctx.db
      .query('rooms')
      .withIndex('by_code', (q) => q.eq('code', candidate))
      .first();

    if (!existing) {
      return candidate;
    }
  }

  fail('Nao foi possivel gerar um codigo unico de sala. Tente novamente.');
};

const shuffle = <T>(items: readonly T[]): T[] => {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    const temp = array[i];
    array[i] = array[j]!;
    array[j] = temp!;
  }

  return array;
};

const pickUniqueInitialRolls = (playerCount: number): number[] => {
  const pool = shuffle([1, 2, 3, 4, 5, 6]);
  return pool.slice(0, playerCount);
};

const playerIsOnline = (player: Doc<'roomPlayers'>, now: number): boolean => {
  if (player.status !== 'active') return false;
  return now - player.lastSeenAt <= PRESENCE_TIMEOUT_MS;
};

const getPendingTurnOperationDoc = async (
  ctx: { db: DatabaseReader },
  roomId: RoomId,
  turnId?: string
): Promise<Doc<'roomTurnOperations'> | null> => {
  if (turnId) {
    const operation = (await ctx.db
      .query('roomTurnOperations')
      .withIndex('by_room_turn', (q) => q.eq('roomId', roomId).eq('turnId', turnId))
      .first()) as Doc<'roomTurnOperations'> | null;

    return operation?.status === 'pending' ? operation : null;
  }

  const pending = (await ctx.db
    .query('roomTurnOperations')
    .withIndex('by_room_status', (q) => q.eq('roomId', roomId).eq('status', 'pending'))
    .collect()) as Doc<'roomTurnOperations'>[];

  if (pending.length === 0) return null;

  pending.sort((a, b) => a.createdAt - b.createdAt);
  return pending[0] ?? null;
};

const toPendingTurnClientScript = (operation: Doc<'roomTurnOperations'>) => {
  const script = operation.script as TurnResolutionScript;

  return {
    turnId: operation.turnId,
    actorPlayerId: operation.actorPlayerId,
    turnNumber: operation.turnNumber,
    roll: {
      value: script.rollValue,
      startedAt: operation.createdAt,
      durationMs: ROLL_DISPLAY_DURATION_MS,
    },
    movement: {
      fromIndex: script.fromIndex,
      baseToIndex: script.baseToIndex,
      finalIndex: script.finalIndex,
      segments: script.segments,
    },
    landingTile: script.landingTile,
    effect: script.effect,
    nextTurn: operation.nextPlayerId
      ? {
          playerId: operation.nextPlayerId,
          turnNumber: operation.turnNumber + 1,
        }
      : null,
    result: {
      gameFinished: operation.gameFinished,
      winnerPlayerId: operation.winnerPlayerId,
      reason: operation.finishReason,
    },
    deadlineAt: operation.deadlineAt,
  };
};

const toTurnClientPayload = (
  operation: Pick<
    Doc<'roomTurnOperations'>,
    | 'turnId'
    | 'actorPlayerId'
    | 'turnNumber'
    | 'createdAt'
    | 'script'
    | 'gameFinished'
    | 'winnerPlayerId'
    | 'finishReason'
    | 'nextPlayerId'
    | 'deadlineAt'
  >
) => {
  const script = operation.script as TurnResolutionScript;

  return {
    turnId: operation.turnId,
    turnNumber: operation.turnNumber,
    actorPlayerId: operation.actorPlayerId,
    roll: {
      value: script.rollValue,
      startedAt: operation.createdAt,
      durationMs: ROLL_DISPLAY_DURATION_MS,
    },
    movement: {
      fromIndex: script.fromIndex,
      baseToIndex: script.baseToIndex,
      finalIndex: script.finalIndex,
      segments: script.segments,
    },
    landingTile: script.landingTile,
    effect: script.effect,
    nextTurn: operation.nextPlayerId
      ? {
          playerId: operation.nextPlayerId,
          turnNumber: operation.turnNumber + 1,
        }
      : null,
    result: {
      gameFinished: operation.gameFinished,
      winnerPlayerId: operation.winnerPlayerId,
      reason: operation.finishReason,
    },
    deadlineAt: operation.deadlineAt,
  };
};

const stripEffectFromScript = (script: TurnResolutionScript): TurnResolutionScript => ({
  ...script,
  finalIndex: script.baseToIndex,
  segments: script.segments.filter((segment) => segment.kind !== 'effect'),
  effect: null,
  reachedEnd: script.baseToIndex >= script.finalIndex && script.reachedEnd && script.baseToIndex === script.finalIndex,
});

const buildQuizResolvedScript = (
  script: TurnResolutionScript,
  params: {
    tileColor: string;
    quizResult: QuizResult;
    previousIndex: number;
    boardLength: number;
  }
): TurnResolutionScript => {
  const resolution = resolveQuizEffect(
    params.tileColor,
    params.quizResult,
    script.baseToIndex,
    params.previousIndex,
    getQuizRuleValue(params.tileColor),
    params.boardLength
  );
  const pathLength = Math.max(2, params.boardLength);
  let finalIndex = script.baseToIndex;
  let effect: ResolvedTurnScript['effect'] = null;

  if (resolution.effect === 'advance') {
    finalIndex = clampIndex(script.baseToIndex + resolution.value, pathLength);
  } else if (resolution.effect === 'retreat') {
    finalIndex = clampIndex(script.baseToIndex - resolution.value, pathLength);
  } else if (resolution.effect === 'return_to_previous' && resolution.previousIndex !== undefined) {
    finalIndex = clampIndex(resolution.previousIndex, pathLength);
  }

  const effectSegments: MovementSegment[] = [];
  if (finalIndex !== script.baseToIndex) {
    const effectType = finalIndex > script.baseToIndex ? 'advance' : 'retreat';
    const effectValue = Math.abs(finalIndex - script.baseToIndex);
    effectSegments.push({
      kind: 'effect',
      fromIndex: script.baseToIndex,
      toIndex: finalIndex,
      value: effectValue,
      durationMs: movementDuration(script.baseToIndex, finalIndex),
      effectType,
    });
    effect = {
      source: resolution.effect === 'return_to_previous' ? 'tile' : 'rules',
      type: effectType,
      value: effectValue,
      fromIndex: script.baseToIndex,
      toIndex: finalIndex,
    };
  }

  return {
    ...script,
    finalIndex,
    segments: [
      ...script.segments.filter((segment) => segment.kind !== 'effect'),
      ...effectSegments,
    ],
    effect,
    reachedEnd: finalIndex >= pathLength - 1,
  };
};

const resolveQuizRoundCore = async (
  ctx: MutationCtx,
  roomId: RoomId,
  roundId: QuizRoundId,
  reason: QuizResolutionReason,
  now: number
): Promise<{ resolved: boolean }> => {
  const room = (await ctx.db.get(roomId)) as Doc<'rooms'> | null;
  const round = (await ctx.db.get(roundId)) as Doc<'roomQuizRounds'> | null;

  if (!room || room.status !== 'playing' || !round || round.roomId !== roomId || round.status !== 'active') {
    return { resolved: false };
  }

  const operation = (await ctx.db
    .query('roomTurnOperations')
    .withIndex('by_room_turn', (q) => q.eq('roomId', roomId).eq('turnId', round.turnId))
    .unique()) as Doc<'roomTurnOperations'> | null;

  if (!operation || operation.status !== 'pending') {
    return { resolved: false };
  }

  const players = await getRoomPlayers(ctx, roomId);
  const activePlayers = getActivePlayers(players);
  const activeSet = new Set(activePlayers.map((entry) => entry._id));
  const normalizedTurnOrder = room.turnOrder.filter((entry) => activeSet.has(entry));

  const existingAnswers = (await ctx.db
    .query('roomQuizAnswers')
    .withIndex('by_round', (q) => q.eq('roundId', roundId))
    .take(16)) as Doc<'roomQuizAnswers'>[];
  const answeredPlayerIds = new Set(existingAnswers.map((answer) => answer.playerId));

  await Promise.all(
    activePlayers
      .filter((player) => !answeredPlayerIds.has(player._id))
      .map((player) =>
        ctx.db.insert('roomQuizAnswers', {
          roomId,
          roundId,
          playerId: player._id,
          selectedOptionId: undefined,
          result: 'timeout',
          pointsAwarded: 0,
          answeredAt: now,
          timeElapsedMs: Math.max(0, now - round.startedAt),
        })
      )
  );

  const answers = (await ctx.db
    .query('roomQuizAnswers')
    .withIndex('by_round', (q) => q.eq('roundId', roundId))
    .take(16)) as Doc<'roomQuizAnswers'>[];
  const actorAnswer = answers.find((answer) => answer.playerId === operation.actorPlayerId);
  const actorResult = (actorAnswer?.result ?? 'timeout') as QuizResult;
  const baseScript = operation.script as TurnResolutionScript;
  const resolvedScript = buildQuizResolvedScript(baseScript, {
    tileColor: round.tileColor,
    quizResult: actorResult,
    previousIndex: round.previousIndex,
    boardLength: room.boardLength,
  });

  const nextTurn = nextActiveTurn(normalizedTurnOrder, operation.actorPlayerId, activeSet);
  const hasWinner = resolvedScript.reachedEnd || normalizedTurnOrder.length <= 1 || !nextTurn;
  const winnerPlayerId = hasWinner
    ? activeSet.has(operation.actorPlayerId)
      ? operation.actorPlayerId
      : normalizedTurnOrder[0]
    : undefined;
  const finishReason = resolvedScript.reachedEnd
    ? 'reached_end'
    : normalizedTurnOrder.length <= 1 || !nextTurn
      ? 'only_one_player'
      : undefined;
  const nextPlayerId = hasWinner ? undefined : nextTurn?.playerId;
  const ackDeadlineAt = now + TURN_ACK_TIMEOUT_MS;
  const operationPayload = {
    ...operation,
    script: resolvedScript,
    gameFinished: hasWinner,
    winnerPlayerId,
    finishReason,
    nextPlayerId,
    deadlineAt: ackDeadlineAt,
  };
  const latestPlayers = await getRoomPlayers(ctx, roomId);

  const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
    {
      type: 'quiz_resolved',
      actorPlayerId: operation.actorPlayerId,
      turnId: operation.turnId,
      turnNumber: operation.turnNumber,
      phase: 'awaiting_ack',
      payload: {
        roundId,
        turnId: operation.turnId,
        turnNumber: operation.turnNumber,
        actorPlayerId: operation.actorPlayerId,
        reason,
        correctOptionId: round.correctOptionId,
        explanation: round.explanation,
        effect: resolvedScript.effect,
        script: toTurnClientPayload(operationPayload),
        answers: answers.map((answer) => ({
          playerId: answer.playerId,
          selectedOptionId: answer.selectedOptionId ?? null,
          result: answer.result,
          pointsAwarded: answer.pointsAwarded,
          answeredAt: answer.answeredAt,
          timeElapsedMs: answer.timeElapsedMs,
        })),
        allPlayersPoints: latestPlayers.map((player) => ({
          playerId: player._id,
          points: player.quizPoints ?? 0,
        })),
      },
    },
  ]);

  await Promise.all([
    ctx.db.patch(operation.actorPlayerId, {
      position: resolvedScript.finalIndex,
      updatedAt: now,
      lastSeenAt: now,
    }),
    ctx.db.patch(operation._id, {
      script: resolvedScript,
      gameFinished: hasWinner,
      winnerPlayerId,
      finishReason,
      nextPlayerId,
      deadlineAt: ackDeadlineAt,
      updatedAt: now,
    }),
    ctx.db.patch(round._id, {
      status: 'resolved',
      resolvedAt: now,
    }),
    ctx.db.patch(room._id, {
      turnOrder: normalizedTurnOrder,
      turnPhase: 'awaiting_ack',
      currentTurnId: operation.turnId,
      currentTurnPlayerId: operation.actorPlayerId,
      currentTurnIndex: Math.max(0, normalizedTurnOrder.indexOf(operation.actorPlayerId)),
      phaseStartedAt: now,
      phaseDeadlineAt: ackDeadlineAt,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    }),
  ]);

  await ctx.scheduler.runAfter(TURN_ACK_TIMEOUT_MS, internal.rooms.finalizeTurnOperation, {
    roomId,
    turnId: operation.turnId,
    reason: 'timeout',
  });

  return { resolved: true };
};

const finalizeTurnOperationCore = async (
  ctx: { db: DatabaseWriter },
  args: { roomId: RoomId; turnId: string; reason: 'ack' | 'timeout' },
  now: number
): Promise<{
  committed: boolean;
  roomStatus: Doc<'rooms'>['status'] | null;
  nextPlayerId?: PlayerId;
  winnerPlayerId?: PlayerId;
}> => {
  const room = (await ctx.db.get(args.roomId)) as Doc<'rooms'> | null;
  if (!room) {
    return {
      committed: false,
      roomStatus: null,
    };
  }

  const operation = (await ctx.db
    .query('roomTurnOperations')
    .withIndex('by_room_turn', (q) => q.eq('roomId', args.roomId).eq('turnId', args.turnId))
    .unique()) as Doc<'roomTurnOperations'> | null;

  if (!operation || operation.status !== 'pending') {
    return {
      committed: false,
      roomStatus: room.status,
    };
  }

  const players = await getRoomPlayers(ctx, args.roomId);
  const activePlayers = getActivePlayers(players);
  const activeSet = new Set(activePlayers.map((entry) => entry._id));
  const normalizedTurnOrder = room.turnOrder.filter((entry) => activeSet.has(entry));

  const events: RoomEventInput[] = [
    {
      type: 'turn_committed',
      actorPlayerId: operation.actorPlayerId,
      turnId: operation.turnId,
      turnNumber: operation.turnNumber,
      phase: 'awaiting_ack',
      payload: {
        turnId: operation.turnId,
        actorPlayerId: operation.actorPlayerId,
        reason: args.reason,
      },
    },
  ];

  const roomPatch: Partial<Doc<'rooms'>> & {
    updatedAt: number;
    lastActiveAt: number;
    phaseStartedAt: number;
    phaseDeadlineAt?: number;
  } = {
    updatedAt: now,
    lastActiveAt: now,
    phaseStartedAt: now,
    turnOrder: normalizedTurnOrder,
    currentTurnId: undefined,
    phaseDeadlineAt: undefined,
  };

  let winnerPlayerId: PlayerId | undefined;
  let nextPlayerId: PlayerId | undefined;

  if (operation.gameFinished || normalizedTurnOrder.length <= 1) {
    winnerPlayerId =
      operation.winnerPlayerId && activeSet.has(operation.winnerPlayerId)
        ? operation.winnerPlayerId
        : normalizedTurnOrder[0];

    roomPatch.status = 'finished';
    roomPatch.turnPhase = 'finished';
    roomPatch.currentTurnPlayerId = undefined;
    roomPatch.currentTurnIndex = 0;

    events.push({
      type: 'game_finished',
      actorPlayerId: winnerPlayerId,
      turnId: operation.turnId,
      turnNumber: operation.turnNumber,
      phase: 'finished',
      payload: {
        winnerPlayerId,
        reason: operation.finishReason ?? 'reached_end',
        rankings: buildQuizRankings(activePlayers, winnerPlayerId),
      },
    });
  } else {
    const nextTurn = activeSet.has(operation.actorPlayerId)
      ? nextActiveTurn(normalizedTurnOrder, operation.actorPlayerId, activeSet)
      : firstActiveTurn(normalizedTurnOrder, activeSet);

    if (!nextTurn) {
      winnerPlayerId = normalizedTurnOrder[0];
      roomPatch.status = 'finished';
      roomPatch.turnPhase = 'finished';
      roomPatch.currentTurnPlayerId = undefined;
      roomPatch.currentTurnIndex = 0;

      events.push({
        type: 'game_finished',
        actorPlayerId: winnerPlayerId,
        turnId: operation.turnId,
        turnNumber: operation.turnNumber,
        phase: 'finished',
        payload: {
          winnerPlayerId,
          reason: 'only_one_player',
          rankings: buildQuizRankings(activePlayers, winnerPlayerId),
        },
      });
    } else {
      const nextTurnNumber = operation.turnNumber + 1;
      nextPlayerId = nextTurn.playerId;

      roomPatch.status = 'playing';
      roomPatch.turnPhase = 'awaiting_roll';
      roomPatch.currentTurnPlayerId = nextTurn.playerId;
      roomPatch.currentTurnIndex = nextTurn.index;
      roomPatch.turnNumber = nextTurnNumber;

      events.push({
        type: 'turn_started',
        actorPlayerId: nextTurn.playerId,
        turnId: operation.turnId,
        turnNumber: nextTurnNumber,
        phase: 'awaiting_roll',
        payload: {
          playerId: nextTurn.playerId,
          turnNumber: nextTurnNumber,
        },
      });
    }
  }

  const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, events);

  await Promise.all([
    ctx.db.patch(operation._id, {
      status: 'resolved',
      acknowledgedAt: args.reason === 'ack' ? now : operation.acknowledgedAt,
      resolvedAt: now,
      updatedAt: now,
    }),
    ctx.db.patch(room._id, {
      ...roomPatch,
      nextEventSequence: nextSequence,
    }),
  ]);

  return {
    committed: true,
    roomStatus: roomPatch.status ?? room.status,
    nextPlayerId,
    winnerPlayerId,
  };
};

export const getRoomState = query({
  args: {
    roomId: v.id('rooms'),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return null;
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const activePlayers = getActivePlayers(players);
    const allReady =
      activePlayers.length > 0 &&
      activePlayers.every((player) => Boolean(player.characterId) && player.ready);

    const myPlayer = args.clientId
      ? players.find((player) => player.clientId === args.clientId && player.status === 'active')
      : null;

    const historyDesc = await ctx.db
      .query('roomEvents')
      .withIndex('by_room_sequence', (q) => q.eq('roomId', args.roomId))
      .order('desc')
      .take(HISTORY_TAKE_LIMIT);

    const history = [...historyDesc].reverse();
    const latestSequence = Math.max(0, room.nextEventSequence - 1);
    const currentTurnId = room.currentTurnId;
    const pendingTurn = await getPendingTurnOperationDoc(ctx, args.roomId, currentTurnId);
    const currentQuizRound = currentTurnId
      ? await ctx.db
          .query('roomQuizRounds')
          .withIndex('by_room_turn', (q) => q.eq('roomId', args.roomId).eq('turnId', currentTurnId))
          .first()
      : null;
    const quizAnswers = currentQuizRound
      ? await ctx.db
          .query('roomQuizAnswers')
          .withIndex('by_round', (q) => q.eq('roundId', currentQuizRound._id))
          .take(16)
      : [];
    const exposeQuizAnswers = currentQuizRound?.status === 'resolved';
    const myQuizAnswer =
      myPlayer && currentQuizRound
        ? quizAnswers.find((answer: Doc<'roomQuizAnswers'>) => answer.playerId === myPlayer._id)
        : null;

    return {
      room: {
        id: room._id,
        code: room.code,
        protocolVersion: room.protocolVersion,
        status: room.status,
        turnPhase: room.turnPhase,
        hostPlayerId: room.hostPlayerId,
        turnOrder: room.turnOrder,
        currentTurnPlayerId: room.currentTurnPlayerId,
        currentTurnId: room.currentTurnId,
        currentTurnIndex: room.currentTurnIndex,
        turnNumber: room.turnNumber,
        boardId: room.boardId,
        boardConfigVersion: room.boardConfigVersion,
        boardLength: room.boardLength,
        maxPlayers: room.maxPlayers,
        phaseStartedAt: room.phaseStartedAt,
        phaseDeadlineAt: room.phaseDeadlineAt,
      },
      me: myPlayer?._id,
      latestSequence,
      allReady,
      activeCount: activePlayers.length,
      slotsAvailable: Math.max(0, room.maxPlayers - activePlayers.length),
      pendingTurn: pendingTurn
        ? {
            turnId: pendingTurn.turnId,
            actorPlayerId: pendingTurn.actorPlayerId,
            turnNumber: pendingTurn.turnNumber,
            script: toPendingTurnClientScript(pendingTurn),
            deadlineAt: pendingTurn.deadlineAt,
          }
        : null,
      players: players.map((player) => ({
        id: player._id,
        roomId: player.roomId,
        name: player.name,
        characterId: player.characterId,
        ready: player.ready,
        status: player.status,
        position: player.position,
        quizPoints: player.quizPoints ?? 0,
        orderRoll: player.orderRoll,
        orderRank: player.orderRank,
        joinedAt: player.joinedAt,
        updatedAt: player.updatedAt,
        lastSeenAt: player.lastSeenAt,
        leftAt: player.leftAt,
        isHost: room.hostPlayerId === player._id,
        isCurrentTurn: room.currentTurnPlayerId === player._id,
      })),
      quizRound: currentQuizRound
        ? {
            roundId: currentQuizRound._id,
            turnId: currentQuizRound.turnId,
            turnNumber: currentQuizRound.turnNumber,
            status: currentQuizRound.status,
            questionId: currentQuizRound.questionId,
            questionText: currentQuizRound.questionText,
            options: currentQuizRound.options,
            correctOptionId: exposeQuizAnswers ? currentQuizRound.correctOptionId : undefined,
            explanation: exposeQuizAnswers ? currentQuizRound.explanation : undefined,
            tileIndex: currentQuizRound.tileIndex,
            tileColor: currentQuizRound.tileColor,
            previousIndex: currentQuizRound.previousIndex,
            startedAt: currentQuizRound.startedAt,
            deadlineAt: currentQuizRound.deadlineAt,
            myAnswer: myQuizAnswer
              ? {
                  selectedOptionId: myQuizAnswer.selectedOptionId ?? null,
                  ...(exposeQuizAnswers
                    ? {
                        result: myQuizAnswer.result,
                        pointsAwarded: myQuizAnswer.pointsAwarded,
                      }
                    : {}),
                  answeredAt: myQuizAnswer.answeredAt,
                  timeElapsedMs: myQuizAnswer.timeElapsedMs,
                }
              : null,
            answers: exposeQuizAnswers
              ? quizAnswers.map((answer: Doc<'roomQuizAnswers'>) => ({
                  playerId: answer.playerId,
                  selectedOptionId: answer.selectedOptionId ?? null,
                  result: answer.result,
                  pointsAwarded: answer.pointsAwarded,
                  answeredAt: answer.answeredAt,
                  timeElapsedMs: answer.timeElapsedMs,
                }))
              : [],
          }
        : null,
      history: history.map((event) => ({
        id: event._id,
        sequence: event.sequence,
        eventVersion: event.eventVersion,
        type: event.type,
        actorPlayerId: event.actorPlayerId,
        turnId: event.turnId,
        turnNumber: event.turnNumber,
        phase: event.phase,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const getRoomEventsSince = query({
  args: {
    roomId: v.id('rooms'),
    afterSequence: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return {
        roomMissing: true,
        latestSequence: 0,
        hasMore: false,
        requiresResync: false,
        events: [],
      };
    }

    const afterSequence = Math.max(0, Math.floor(args.afterSequence ?? 0));
    const take = Math.max(1, Math.min(EVENTS_DELTA_LIMIT, Math.floor(args.limit ?? EVENTS_DELTA_LIMIT)));

    const queried = (await ctx.db
      .query('roomEvents')
      .withIndex('by_room_sequence', (q) => q.eq('roomId', args.roomId).gt('sequence', afterSequence))
      .order('asc')
      .take(take + 1)) as Doc<'roomEvents'>[];

    const hasMore = queried.length > take;
    const events = queried.slice(0, take);
    const firstSequence = events[0]?.sequence;

    return {
      roomMissing: false,
      latestSequence: Math.max(0, room.nextEventSequence - 1),
      hasMore,
      requiresResync: typeof firstSequence === 'number' && firstSequence > afterSequence + 1,
      events: events.map((event) => ({
        id: event._id,
        sequence: event.sequence,
        eventVersion: event.eventVersion,
        type: event.type,
        actorPlayerId: event.actorPlayerId,
        turnId: event.turnId,
        turnNumber: event.turnNumber,
        phase: event.phase,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const getLatestSessionForClient = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = sanitizeClientId(args.clientId);

    const latestPlayers = await ctx.db
      .query('roomPlayers')
      .withIndex('by_client', (q) => q.eq('clientId', clientId))
      .order('desc')
      .take(24);

    const roomIds = [...new Set(latestPlayers.map((p) => p.roomId))];
    const rooms = await Promise.all(roomIds.map((id) => ctx.db.get(id)));
    const roomById = new Map(rooms.filter(Boolean).map((r) => [r!._id, r!]));

    for (const player of latestPlayers) {
      const room = roomById.get(player.roomId);
      if (!room || room.status === 'finished') continue;

      if (player.status === 'active') {
        return {
          roomId: room._id,
          roomCode: room.code,
          playerId: player._id,
          needsRejoin: false,
        };
      }

      // A player who left mid-game can attempt to rejoin.
      if (player.status === 'left' && room.status === 'playing') {
        return {
          roomId: room._id,
          roomCode: room.code,
          playerId: player._id,
          needsRejoin: true,
        };
      }
    }

    return null;
  },
});

export const createRoom = mutation({
  args: {
    clientId: v.string(),
    name: v.optional(v.string()),
    boardLength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const roomCode = await createUniqueRoomCode(ctx);
    const boardLength = clampBoardLength(args.boardLength);

    const roomId = await ctx.db.insert('rooms', {
      code: roomCode,
      protocolVersion: ROOM_PROTOCOL_VERSION,
      status: 'lobby',
      turnPhase: 'lobby',
      hostPlayerId: undefined,
      turnOrder: [],
      currentTurnPlayerId: undefined,
      currentTurnId: undefined,
      currentTurnIndex: 0,
      turnNumber: 1,
      boardId: BOARD_ID,
      boardConfigVersion: BOARD_VERSION,
      boardLength,
      maxPlayers: MAX_PLAYERS,
      phaseStartedAt: now,
      phaseDeadlineAt: undefined,
      nextEventSequence: 1,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    });

    const playerName = sanitizePlayerName(args.name, 'Jogador 1');
    const playerId = await ctx.db.insert('roomPlayers', {
      roomId,
      clientId,
      name: playerName,
      characterId: undefined,
      ready: false,
      status: 'active',
      position: 0,
      quizPoints: 0,
      orderRoll: undefined,
      orderRank: undefined,
      joinedAt: now,
      updatedAt: now,
      lastSeenAt: now,
      leftAt: undefined,
    });

    const room = await getRoomOrThrow(ctx, roomId);
    const nextSequence = await insertRoomEvents(ctx, roomId, room.nextEventSequence, now, [
      {
        type: 'room_created',
        actorPlayerId: playerId,
        payload: {
          code: roomCode,
          playerId,
        },
      },
      {
        type: 'player_joined',
        actorPlayerId: playerId,
        payload: {
          playerId,
          name: playerName,
          source: 'create',
        },
      },
    ]);

    await ctx.db.patch(roomId, {
      hostPlayerId: playerId,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      roomId,
      roomCode,
      playerId,
    };
  },
});

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    clientId: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const roomCode = sanitizeRoomCode(args.roomCode);
    const clientId = sanitizeClientId(args.clientId);

    const room = await ctx.db
      .query('rooms')
      .withIndex('by_code', (q) => q.eq('code', roomCode))
      .unique();

    if (!room) {
      fail('Sala nao encontrada para este codigo.');
    }

    if (room.status === 'finished') {
      fail('Esta partida ja foi encerrada.');
    }

    const players = await getRoomPlayers(ctx, room._id);
    const activePlayers = getActivePlayers(players);

    const existingActive = players.find((player) => player.clientId === clientId && player.status === 'active');
    if (existingActive) {
      const playerName = sanitizePlayerName(args.name, existingActive.name);

      await ctx.db.patch(existingActive._id, {
        name: playerName,
        updatedAt: now,
        lastSeenAt: now,
      });

      await ctx.db.patch(room._id, {
        updatedAt: now,
        lastActiveAt: now,
      });

      return {
        roomId: room._id,
        roomCode: room.code,
        playerId: existingActive._id,
        resumed: true,
      };
    }

    const existingInactive = players.find((player) => player.clientId === clientId);
    if (existingInactive) {
      const playerName = sanitizePlayerName(args.name, existingInactive.name);

      if (room.status !== 'lobby' && room.status !== 'playing') {
        fail('Partida em andamento. Reentrada so e permitida para jogadores ativos.');
      }

      if (room.status === 'playing') {
        // Mid-game rejoin: restore player to active and re-insert into turn order at original rank.
        const updatedTurnOrder = [...room.turnOrder];
        if (!updatedTurnOrder.includes(existingInactive._id)) {
          const originalRank = existingInactive.orderRank ?? updatedTurnOrder.length;
          const insertAt = Math.min(originalRank, updatedTurnOrder.length);
          updatedTurnOrder.splice(insertAt, 0, existingInactive._id);
        }

        await ctx.db.patch(existingInactive._id, {
          status: 'active',
          leftAt: undefined,
          updatedAt: now,
          lastSeenAt: now,
          name: playerName,
        });

        const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
          {
            type: 'player_rejoined',
            actorPlayerId: existingInactive._id,
            payload: {
              playerId: existingInactive._id,
              name: playerName,
              position: existingInactive.position,
            },
          },
        ]);

        await ctx.db.patch(room._id, {
          turnOrder: updatedTurnOrder,
          updatedAt: now,
          lastActiveAt: now,
          nextEventSequence: nextSequence,
        });

        return {
          roomId: room._id,
          roomCode: room.code,
          playerId: existingInactive._id,
          resumed: true,
        };
      }

      // Lobby rejoin
      await ctx.db.patch(existingInactive._id, {
        status: 'active',
        ready: false,
        leftAt: undefined,
        updatedAt: now,
        lastSeenAt: now,
        name: playerName,
      });

      const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
        {
          type: 'player_rejoined',
          actorPlayerId: existingInactive._id,
          payload: {
            playerId: existingInactive._id,
            name: playerName,
          },
        },
      ]);

      await ctx.db.patch(room._id, {
        updatedAt: now,
        lastActiveAt: now,
        nextEventSequence: nextSequence,
      });

      return {
        roomId: room._id,
        roomCode: room.code,
        playerId: existingInactive._id,
        resumed: true,
      };
    }

    if (room.status !== 'lobby') {
      fail('Nao e possivel entrar. A partida ja comecou.');
    }

    if (activePlayers.length >= room.maxPlayers) {
      fail('A sala ja atingiu o limite de jogadores.');
    }

    const playerName = sanitizePlayerName(args.name, `Jogador ${activePlayers.length + 1}`);

    const playerId = await ctx.db.insert('roomPlayers', {
      roomId: room._id,
      clientId,
      name: playerName,
      characterId: undefined,
      ready: false,
      status: 'active',
      position: 0,
      quizPoints: 0,
      orderRoll: undefined,
      orderRank: undefined,
      joinedAt: now,
      updatedAt: now,
      lastSeenAt: now,
      leftAt: undefined,
    });

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'player_joined',
        actorPlayerId: playerId,
        payload: {
          playerId,
          name: playerName,
          source: 'join',
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      roomId: room._id,
      roomCode: room.code,
      playerId,
      resumed: false,
    };
  },
});

export const updatePlayerProfile = mutation({
  args: {
    roomId: v.id('rooms'),
    clientId: v.string(),
    name: v.optional(v.string()),
    characterId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const characterId = sanitizeCharacterId(args.characterId);
    const room = await getRoomOrThrow(ctx, args.roomId);

    if (room.status !== 'lobby') {
      fail('A personalizacao do perfil so e permitida no lobby.');
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerByClientId(players, clientId, args.roomId);
    const playerName = sanitizePlayerName(args.name, player.name);

    const conflict = players.find(
      (entry) =>
        entry._id !== player._id &&
        entry.status === 'active' &&
        entry.characterId?.toLowerCase() === characterId.toLowerCase()
    );

    if (conflict) {
      fail('Este personagem ja foi escolhido por outro jogador.');
    }

    // TOCTOU guard: check and update the room-level character claims atomically.
    // Remove any previous claim this player held so stale entries don't block others.
    const existingClaims = (room.characterClaims ?? {}) as Record<string, string>;
    const playerIdStr = player._id.toString();
    const cleanedClaims: Record<string, string> = {};
    for (const [key, val] of Object.entries(existingClaims)) {
      if (val !== playerIdStr) {
        cleanedClaims[key] = val;
      }
    }
    const claimKey = characterId.toLowerCase();
    if (cleanedClaims[claimKey]) {
      fail('Este personagem ja foi escolhido por outro jogador.');
    }
    const updatedClaims = { ...cleanedClaims, [claimKey]: playerIdStr };

    if (player.name === playerName && player.characterId === characterId) {
      return {
        ok: true,
        name: playerName,
        characterId,
      };
    }

    await ctx.db.patch(player._id, {
      name: playerName,
      characterId,
      updatedAt: now,
      lastSeenAt: now,
    });

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'player_profile_updated',
        actorPlayerId: player._id,
        payload: {
          playerId: player._id,
          name: playerName,
          characterId,
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      characterClaims: updatedClaims,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      ok: true,
      name: playerName,
      characterId,
    };
  },
});

export const setCharacter = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
    characterId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const characterId = sanitizeCharacterId(args.characterId);
    const room = await getRoomOrThrow(ctx, args.roomId);

    if (room.status !== 'lobby') {
      fail('Selecao de personagem so e permitida antes de iniciar.');
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);

    if (player.characterId) {
      fail('Personagem ja definido para este jogador.');
    }

    const conflict = players.find(
      (entry) =>
        entry._id !== player._id &&
        entry.status === 'active' &&
        entry.characterId?.toLowerCase() === characterId.toLowerCase()
    );

    if (conflict) {
      fail('Este personagem ja foi escolhido por outro jogador.');
    }

    // Also check the room-level claims map for concurrent transactions that haven't
    // written to their player document yet (TOCTOU guard). Writing to the room document
    // here forces an OCC conflict when two mutations claim the same character simultaneously,
    // causing one to retry and see the conflict on retry.
    const existingClaims = (room.characterClaims ?? {}) as Record<string, string>;
    const claimKey = characterId.toLowerCase();
    if (existingClaims[claimKey] && existingClaims[claimKey] !== player._id.toString()) {
      fail('Este personagem ja foi escolhido por outro jogador.');
    }

    const updatedClaims = { ...existingClaims, [claimKey]: player._id.toString() };

    await ctx.db.patch(player._id, {
      characterId,
      updatedAt: now,
      lastSeenAt: now,
    });

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'character_selected',
        actorPlayerId: player._id,
        payload: {
          playerId: player._id,
          characterId,
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      characterClaims: updatedClaims,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      ok: true,
    };
  },
});

export const setReady = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
    ready: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);

    if (room.status !== 'lobby') {
      fail('O estado Pronto so pode ser alterado no lobby.');
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);

    if (args.ready && !player.characterId) {
      fail('Escolha um personagem antes de marcar pronto.');
    }

    await ctx.db.patch(player._id, {
      ready: args.ready,
      updatedAt: now,
      lastSeenAt: now,
    });

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'player_ready_changed',
        actorPlayerId: player._id,
        payload: {
          playerId: player._id,
          ready: args.ready,
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      ok: true,
    };
  },
});

export const startGame = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
    boardLength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);

    if (room.status !== 'lobby') {
      fail('A partida ja foi iniciada.');
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const host = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);

    if (room.hostPlayerId !== host._id) {
      fail('Apenas o host pode iniciar a partida.');
    }

    const activePlayers = getActivePlayers(players);
    if (activePlayers.length < 2) {
      fail('Sao necessarios pelo menos 2 jogadores para iniciar.');
    }

    if (activePlayers.length > MAX_PLAYERS) {
      fail('A partida suporta no maximo 4 jogadores.');
    }

    const missingCharacter = activePlayers.filter((player) => !player.characterId);
    if (missingCharacter.length > 0) {
      fail('Todos os jogadores devem escolher um personagem no setup.');
    }

    const notReady = activePlayers.filter((player) => !player.ready);
    if (notReady.length > 0) {
      fail('Todos os jogadores devem marcar Pronto antes de iniciar.');
    }

    const uniqueRolls = pickUniqueInitialRolls(activePlayers.length);

    const rollByPlayer = activePlayers.map((player, index) => ({
      player,
      value: uniqueRolls[index]!,
    }));

    const sortedByInitiative = [...rollByPlayer].sort((left, right) => {
      if (left.value !== right.value) {
        return right.value - left.value;
      }

      return left.player.joinedAt - right.player.joinedAt;
    });

    const turnOrder = sortedByInitiative.map((entry) => entry.player._id);
    const boardLength = clampBoardLength(args.boardLength ?? room.boardLength);

    await Promise.all(
      rollByPlayer.map((entry) =>
        ctx.db.patch(entry.player._id, {
          ready: false,
          position: 0,
          quizPoints: 0,
          orderRoll: entry.value,
          orderRank: sortedByInitiative.findIndex((value) => value.player._id === entry.player._id) + 1,
          updatedAt: now,
          lastSeenAt: now,
        })
      )
    );

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'game_started',
        actorPlayerId: host._id,
        phase: 'awaiting_roll',
        payload: {
          hostPlayerId: host._id,
          boardLength,
        },
      },
      {
        type: 'turn_order_defined',
        actorPlayerId: host._id,
        phase: 'awaiting_roll',
        payload: {
          rolls: sortedByInitiative.map((entry) => ({
            playerId: entry.player._id,
            value: entry.value,
          })),
          turnOrder,
        },
      },
      {
        type: 'turn_started',
        actorPlayerId: turnOrder[0],
        turnNumber: 1,
        phase: 'awaiting_roll',
        payload: {
          playerId: turnOrder[0],
          turnNumber: 1,
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      status: 'playing',
      turnPhase: 'awaiting_roll',
      turnOrder,
      currentTurnPlayerId: turnOrder[0],
      currentTurnId: undefined,
      currentTurnIndex: 0,
      turnNumber: 1,
      boardLength,
      phaseStartedAt: now,
      phaseDeadlineAt: undefined,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      roomId: room._id,
      turnOrder,
      initialRolls: sortedByInitiative.map((entry) => ({
        playerId: entry.player._id,
        value: entry.value,
      })),
    };
  },
});

export const rollTurn = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);

    if (room.status !== 'playing') {
      fail('A partida nao esta em andamento.');
    }
    if (room.turnPhase !== 'awaiting_roll') {
      fail('A rodada atual ainda nao esta pronta para novo dado.');
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);

    if (room.currentTurnPlayerId !== player._id) {
      fail('Nao e o turno deste jogador.');
    }

    const existingPending = await getPendingTurnOperationDoc(ctx, room._id, room.currentTurnId);
    if (existingPending) {
      fail('Ainda existe uma jogada pendente de confirmacao.');
    }

    const boardLength = clampBoardLength(room.boardLength);
    const rollValue = randomInt(1, 6);
    const script = resolveTurnScript({
      fromIndex: Math.max(0, player.position),
      rollValue,
      boardLength,
    });

    const activePlayers = getActivePlayers(players);
    const activeSet = new Set(activePlayers.map((entry) => entry._id));
    const normalizedTurnOrder = room.turnOrder.filter((entry) => activeSet.has(entry));
    const turnId = generateTurnId();
    const landingTile = getBoardTile(script.baseToIndex);

    if (isQuizEligibleTile(landingTile)) {
      const quizScript = stripEffectFromScript(script);
      const question = await selectQuizQuestion(ctx, room._id, landingTile.color);
      const quizDeadlineAt = now + QUIZ_TIMEOUT_MS;

      await ctx.db.patch(player._id, {
        position: quizScript.baseToIndex,
        updatedAt: now,
        lastSeenAt: now,
      });

      const roundId = await ctx.db.insert('roomQuizRounds', {
        roomId: room._id,
        turnId,
        turnNumber: room.turnNumber,
        questionId: question.id,
        questionText: question.questionText,
        options: question.options,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        tileIndex: quizScript.baseToIndex,
        tileColor: landingTile.color,
        previousIndex: quizScript.fromIndex,
        startedAt: now,
        deadlineAt: quizDeadlineAt,
        status: 'active',
        resolvedAt: undefined,
        createdAt: now,
      });

      const operationInput = {
        roomId: room._id,
        turnId,
        actorPlayerId: player._id,
        turnNumber: room.turnNumber,
        status: 'pending' as const,
        script: quizScript,
        gameFinished: false,
        winnerPlayerId: undefined,
        finishReason: undefined,
        nextPlayerId: undefined,
        deadlineAt: quizDeadlineAt,
        acknowledgedAt: undefined,
        resolvedAt: undefined,
        createdAt: now,
        updatedAt: now,
      };

      await ctx.db.insert('roomTurnOperations', operationInput);

      const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
        {
          type: 'dice_rolled',
          actorPlayerId: player._id,
          turnId,
          turnNumber: room.turnNumber,
          phase: 'awaiting_quiz',
          payload: {
            playerId: player._id,
            turnId,
            turnNumber: room.turnNumber,
            value: quizScript.rollValue,
            fromIndex: quizScript.fromIndex,
            toIndex: quizScript.baseToIndex,
            baseToIndex: quizScript.baseToIndex,
          },
        },
        {
          type: 'turn_resolved',
          actorPlayerId: player._id,
          turnId,
          turnNumber: room.turnNumber,
          phase: 'awaiting_quiz',
          payload: {
            ...toTurnClientPayload(operationInput),
            awaitingQuiz: true,
            quizRoundId: roundId,
          },
        },
        {
          type: 'quiz_started',
          actorPlayerId: player._id,
          turnId,
          turnNumber: room.turnNumber,
          phase: 'awaiting_quiz',
          payload: {
            roundId,
            turnId,
            turnNumber: room.turnNumber,
            actorPlayerId: player._id,
            questionId: question.id,
            questionText: question.questionText,
            options: question.options,
            difficulty: question.difficulty,
            themeId: question.themeId,
            tileIndex: quizScript.baseToIndex,
            tileColor: landingTile.color,
            startedAt: now,
            deadlineAt: quizDeadlineAt,
          },
        },
      ]);

      await ctx.db.patch(room._id, {
        turnOrder: normalizedTurnOrder,
        turnPhase: 'awaiting_quiz',
        currentTurnId: turnId,
        currentTurnPlayerId: player._id,
        currentTurnIndex: Math.max(0, normalizedTurnOrder.indexOf(player._id)),
        phaseStartedAt: now,
        phaseDeadlineAt: quizDeadlineAt,
        updatedAt: now,
        lastActiveAt: now,
        nextEventSequence: nextSequence,
      });

      await ctx.scheduler.runAfter(QUIZ_TIMEOUT_MS, internal.rooms.resolveQuizRound, {
        roomId: room._id,
        roundId,
        reason: 'timeout',
      });

      return {
        turnId,
        roll: quizScript.rollValue,
        fromIndex: quizScript.fromIndex,
        toIndex: quizScript.baseToIndex,
        awaitingQuiz: true,
        roundId,
        deadlineAt: quizDeadlineAt,
      };
    }

    await ctx.db.patch(player._id, {
      position: script.finalIndex,
      updatedAt: now,
      lastSeenAt: now,
    });

    const nextTurn = nextActiveTurn(normalizedTurnOrder, player._id, activeSet);
    const hasWinner = script.reachedEnd || normalizedTurnOrder.length <= 1 || !nextTurn;
    const winnerPlayerId = hasWinner ? player._id : undefined;
    const finishReason = script.reachedEnd
      ? 'reached_end'
      : normalizedTurnOrder.length <= 1 || !nextTurn
        ? 'only_one_player'
        : undefined;
    const nextPlayerId = hasWinner ? undefined : nextTurn?.playerId;

    const deadlineAt = now + TURN_ACK_TIMEOUT_MS;
    const operationInput = {
      roomId: room._id,
      turnId,
      actorPlayerId: player._id,
      turnNumber: room.turnNumber,
      status: 'pending' as const,
      script,
      gameFinished: hasWinner,
      winnerPlayerId,
      finishReason,
      nextPlayerId,
      deadlineAt,
      acknowledgedAt: undefined,
      resolvedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    await ctx.db.insert('roomTurnOperations', operationInput);

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'dice_rolled',
        actorPlayerId: player._id,
        turnId,
        turnNumber: room.turnNumber,
        phase: 'awaiting_ack',
        payload: {
          playerId: player._id,
          turnId,
          turnNumber: room.turnNumber,
          value: script.rollValue,
          fromIndex: script.fromIndex,
          toIndex: script.finalIndex,
          baseToIndex: script.baseToIndex,
        },
      },
      {
        type: 'turn_resolved',
        actorPlayerId: player._id,
        turnId,
        turnNumber: room.turnNumber,
        phase: 'awaiting_ack',
        payload: toTurnClientPayload(operationInput),
      },
    ]);

    await ctx.db.patch(room._id, {
      turnOrder: normalizedTurnOrder,
      turnPhase: 'awaiting_ack',
      currentTurnId: turnId,
      currentTurnPlayerId: player._id,
      currentTurnIndex: Math.max(0, normalizedTurnOrder.indexOf(player._id)),
      phaseStartedAt: now,
      phaseDeadlineAt: deadlineAt,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    // Schedule a fallback timeout. If the player acks before the deadline,
    // finalizeTurnOperationCore will find the operation already resolved and
    // return early (idempotent guard). Convex scheduled functions cannot be
    // cancelled post-hoc, so a stale timeout per turn is expected and harmless.
    await ctx.scheduler.runAfter(TURN_ACK_TIMEOUT_MS, internal.rooms.finalizeTurnOperation, {
      roomId: room._id,
      turnId,
      reason: 'timeout',
    });

    return {
      turnId,
      roll: script.rollValue,
      fromIndex: script.fromIndex,
      toIndex: script.finalIndex,
      gameFinished: hasWinner,
      winnerPlayerId,
      nextPlayerId,
      deadlineAt,
    };
  },
});

export const submitQuizAnswer = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
    roundId: v.id('roomQuizRounds'),
    selectedOptionId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);

    if (room.status !== 'playing' || room.turnPhase !== 'awaiting_quiz') {
      fail('Nao ha quiz ativo nesta sala.');
    }

    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);
    const round = (await ctx.db.get(args.roundId)) as Doc<'roomQuizRounds'> | null;

    if (!round || round.roomId !== args.roomId || round.status !== 'active' || round.turnId !== room.currentTurnId) {
      fail('Quiz nao encontrado ou ja resolvido.');
    }

    const existingAnswer = (await ctx.db
      .query('roomQuizAnswers')
      .withIndex('by_round_player', (q) => q.eq('roundId', args.roundId).eq('playerId', player._id))
      .first()) as Doc<'roomQuizAnswers'> | null;

    if (existingAnswer) {
      return {
        result: existingAnswer.result,
        points: existingAnswer.pointsAwarded,
        alreadyAnswered: true,
      };
    }

    const selectedOptionId = args.selectedOptionId;
    const result: QuizResult =
      selectedOptionId === null || now > round.deadlineAt
        ? 'timeout'
        : selectedOptionId === round.correctOptionId
          ? 'correct'
          : 'incorrect';
    const pointsAwarded = result === 'correct' ? 5 : 0;

    await ctx.db.insert('roomQuizAnswers', {
      roomId: args.roomId,
      roundId: args.roundId,
      playerId: player._id,
      selectedOptionId: selectedOptionId ?? undefined,
      result,
      pointsAwarded,
      answeredAt: now,
      timeElapsedMs: Math.max(0, now - round.startedAt),
    });

    if (pointsAwarded > 0) {
      await ctx.db.patch(player._id, {
        quizPoints: (player.quizPoints ?? 0) + pointsAwarded,
        updatedAt: now,
        lastSeenAt: now,
      });
    } else {
      await ctx.db.patch(player._id, {
        updatedAt: now,
        lastSeenAt: now,
      });
    }

    const activePlayers = getActivePlayers(players);
    const answers = await ctx.db
      .query('roomQuizAnswers')
      .withIndex('by_round', (q) => q.eq('roundId', args.roundId))
      .take(16);

    if (answers.length >= activePlayers.length) {
      await resolveQuizRoundCore(ctx, args.roomId, args.roundId, 'all_answered', now);
    }

    return {
      result,
      points: pointsAwarded,
      alreadyAnswered: false,
    };
  },
});

export const resolveQuizRound = internalMutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('roomQuizRounds'),
    reason: v.union(v.literal('all_answered'), v.literal('timeout')),
  },
  handler: async (ctx, args) => resolveQuizRoundCore(ctx, args.roomId, args.roundId, args.reason, Date.now()),
});

export const ackTurnModal = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
    turnId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);
    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);

    if (room.status !== 'playing' || room.turnPhase !== 'awaiting_ack') {
      fail('Nao ha jogada pendente para confirmar.');
    }
    if (room.currentTurnPlayerId !== player._id) {
      fail('Apenas o jogador ativo pode confirmar a jogada.');
    }
    if (room.currentTurnId !== args.turnId) {
      fail('A confirmacao recebida nao pertence ao turno atual.');
    }

    const result = await finalizeTurnOperationCore(
      ctx,
      {
        roomId: room._id,
        turnId: args.turnId,
        reason: 'ack',
      },
      now
    );

    return {
      ok: result.committed,
      roomStatus: result.roomStatus,
      nextPlayerId: result.nextPlayerId,
      winnerPlayerId: result.winnerPlayerId,
    };
  },
});

export const finalizeTurnOperation = internalMutation({
  args: {
    roomId: v.id('rooms'),
    turnId: v.string(),
    reason: v.union(v.literal('ack'), v.literal('timeout')),
  },
  handler: async (ctx, args) => {
    const result = await finalizeTurnOperationCore(
      ctx,
      {
        roomId: args.roomId,
        turnId: args.turnId,
        reason: args.reason,
      },
      Date.now()
    );

    return result;
  },
});

export const leaveRoom = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);
    const players = await getRoomPlayers(ctx, args.roomId);
    const pendingOperation = room.currentTurnId
      ? await getPendingTurnOperationDoc(ctx, room._id, room.currentTurnId)
      : null;

    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, args.roomId);

    await ctx.db.patch(player._id, {
      status: 'left',
      ready: false,
      updatedAt: now,
      leftAt: now,
    });

    const activePlayers = players.filter(
      (entry) => entry._id !== player._id && entry.status === 'active'
    );

    if (activePlayers.length === 0) {
      await removeRoomData(ctx, room._id);
      return {
        destroyed: true,
      };
    }

    const events: RoomEventInput[] = [
      {
        type: 'player_left',
        actorPlayerId: player._id,
        payload: {
          playerId: player._id,
          reason: 'manual_exit',
        },
      },
    ];

    const roomPatch: Record<string, unknown> = {
      updatedAt: now,
      lastActiveAt: now,
    };

    if (room.hostPlayerId === player._id) {
      const nextHost = activePlayers[0];
      roomPatch.hostPlayerId = nextHost?._id;

      if (nextHost) {
        events.push({
          type: 'host_changed',
          actorPlayerId: nextHost._id,
          payload: {
            hostPlayerId: nextHost._id,
          },
        });
      }
    }

    if (room.status === 'playing') {
      const activeSet = new Set(activePlayers.map((entry) => entry._id));
      const nextTurnOrder = room.turnOrder.filter((entry) => activeSet.has(entry));

      roomPatch.turnOrder = nextTurnOrder;

      let cancelledPendingTurn = false;
      if (
        pendingOperation?.status === 'pending' &&
        shouldCancelPendingTurnOnLeave({
          leavingPlayerId: player._id,
          pendingActorPlayerId: pendingOperation.actorPlayerId,
          currentTurnPlayerId: room.currentTurnPlayerId,
          remainingActivePlayerIds: nextTurnOrder,
        })
      ) {
        await ctx.db.patch(pendingOperation._id, {
          status: 'cancelled',
          resolvedAt: now,
          updatedAt: now,
        });
        const activeQuizRound = await ctx.db
          .query('roomQuizRounds')
          .withIndex('by_room_turn', (q) => q.eq('roomId', room._id).eq('turnId', pendingOperation.turnId))
          .first();
        if (activeQuizRound?.status === 'active') {
          await ctx.db.patch(activeQuizRound._id, {
            status: 'cancelled',
            resolvedAt: now,
          });
        }
        roomPatch.currentTurnId = undefined;
        roomPatch.phaseDeadlineAt = undefined;
        roomPatch.phaseStartedAt = now;
        cancelledPendingTurn = true;
      }

      if (nextTurnOrder.length <= 1) {
        roomPatch.status = 'finished';
        roomPatch.turnPhase = 'finished';
        roomPatch.currentTurnId = undefined;
        roomPatch.currentTurnPlayerId = undefined;
        roomPatch.currentTurnIndex = 0;
        roomPatch.phaseDeadlineAt = undefined;
        roomPatch.phaseStartedAt = now;

        if (nextTurnOrder[0]) {
          events.push({
            type: 'game_finished',
            actorPlayerId: nextTurnOrder[0],
            phase: 'finished',
            turnNumber: room.turnNumber,
            payload: {
              winnerPlayerId: nextTurnOrder[0],
              reason: 'only_one_player',
              rankings: buildQuizRankings(activePlayers, nextTurnOrder[0]),
            },
          });
        }
      } else if (cancelledPendingTurn || !room.currentTurnPlayerId || !activeSet.has(room.currentTurnPlayerId)) {
        // Either the pending turn was cancelled (must advance phase), or the current turn
        // player has left. In both cases, advance to awaiting_roll for the next player.
        const firstTurn = firstActiveTurn(nextTurnOrder, activeSet);
        roomPatch.currentTurnPlayerId = firstTurn?.playerId;
        roomPatch.currentTurnIndex = firstTurn?.index ?? 0;
        roomPatch.currentTurnId = undefined;
        roomPatch.turnPhase = 'awaiting_roll';
        roomPatch.phaseDeadlineAt = undefined;
        roomPatch.phaseStartedAt = now;

        if (firstTurn) {
          events.push({
            type: 'turn_started',
            actorPlayerId: firstTurn.playerId,
            turnNumber: room.turnNumber,
            phase: 'awaiting_roll',
            payload: {
              playerId: firstTurn.playerId,
              turnNumber: room.turnNumber,
            },
          });
        }
      } else {
        roomPatch.currentTurnPlayerId = room.currentTurnPlayerId;
        roomPatch.currentTurnIndex = Math.max(0, nextTurnOrder.indexOf(room.currentTurnPlayerId));
        roomPatch.turnPhase = room.turnPhase;
        roomPatch.currentTurnId = room.currentTurnId;
        roomPatch.phaseDeadlineAt = room.phaseDeadlineAt;
        roomPatch.phaseStartedAt = room.phaseStartedAt;
      }
    }

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, events);

    await ctx.db.patch(room._id, {
      ...roomPatch,
      nextEventSequence: nextSequence,
    });

    return {
      destroyed: false,
    };
  },
});

export const touchPresence = mutation({
  args: {
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clientId = sanitizeClientId(args.clientId);
    const room = await getRoomOrThrow(ctx, args.roomId);
    const players = await getRoomPlayers(ctx, args.roomId);
    const player = resolveActivePlayerInRoom(players, args.playerId, clientId, room._id);

    const roomPatches: Partial<Doc<'rooms'>> = {};
    if (now - room.lastActiveAt > 30_000) {
      roomPatches.lastActiveAt = now;
    }

    await Promise.all([
      Object.keys(roomPatches).length > 0 ? ctx.db.patch(room._id, roomPatches) : Promise.resolve(),
      ctx.db.patch(player._id, {
        updatedAt: now,
        lastSeenAt: now,
      }),
    ]);

    return {
      ok: true,
    };
  },
});

export const getPendingTurnOperation = query({
  args: {
    roomId: v.id('rooms'),
    turnId: v.optional(v.string()),
  },
  handler: async (ctx, args) => getPendingTurnOperationDoc(ctx, args.roomId, args.turnId),
});

export const cleanupInactiveRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Use the by_last_active_at index to scan only stale rooms instead of the full table.
    const cutoff = now - EMPTY_ROOM_TTL_MS;
    const rooms = (await ctx.db
      .query('rooms')
      .withIndex('by_last_active_at', (q) => q.lt('lastActiveAt', cutoff))
      .collect()) as Doc<'rooms'>[];

    let deletedCount = 0;

    for (const room of rooms) {
      const players = await getRoomPlayers(ctx, room._id);
      const onlinePlayers = players.filter((player) => playerIsOnline(player, now));

      if (onlinePlayers.length === 0) {
        await removeRoomData(ctx, room._id);
        deletedCount += 1;
      }
    }

    return {
      scannedCount: rooms.length,
      deletedCount,
    };
  },
});
