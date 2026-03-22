import { ConvexError, v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';

const MAX_PLAYERS = 4;
const ROOM_CODE_LENGTH = 3;
const DEFAULT_BOARD_LENGTH = 46;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_ATTEMPTS = 400;
const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;
const EMPTY_ROOM_TTL_MS = 12 * 60 * 60 * 1000;
const HISTORY_TAKE_LIMIT = 160;

type RoomId = Id<'rooms'>;
type PlayerId = Id<'roomPlayers'>;

type RoomEventInput = {
  type: string;
  actorPlayerId?: PlayerId;
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
    return DEFAULT_BOARD_LENGTH;
  }

  return Math.max(2, Math.min(120, Math.floor(value)));
};

const generateRoomCode = (): string => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length - 1)];
  }
  return code;
};

const getRoomOrThrow = async (ctx: { db: any }, roomId: RoomId): Promise<Doc<'rooms'>> => {
  const room = await ctx.db.get(roomId);
  if (!room) {
    fail('Sala nao encontrada.');
  }
  return room;
};

const getRoomPlayers = async (ctx: { db: any }, roomId: RoomId): Promise<Doc<'roomPlayers'>[]> => {
  const players = (await ctx.db
    .query('roomPlayers')
    .withIndex('by_room', (q: any) => q.eq('roomId', roomId))
    .collect()) as Doc<'roomPlayers'>[];

  players.sort((a, b) => {
    if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
    return a._creationTime - b._creationTime;
  });

  return players;
};

const getActivePlayers = (players: Doc<'roomPlayers'>[]): Doc<'roomPlayers'>[] =>
  players.filter((player) => player.status === 'active');

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

const insertRoomEvents = async (
  ctx: { db: any },
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
      type: event.type,
      actorPlayerId: event.actorPlayerId,
      payload: event.payload,
      createdAt,
    });
    sequence += 1;
  }

  return sequence;
};

const removeRoomData = async (ctx: { db: any }, roomId: RoomId): Promise<void> => {
  const [players, events] = await Promise.all([
    ctx.db
      .query('roomPlayers')
      .withIndex('by_room', (q: any) => q.eq('roomId', roomId))
      .collect(),
    ctx.db
      .query('roomEvents')
      .withIndex('by_room_sequence', (q: any) => q.eq('roomId', roomId))
      .collect(),
  ]);

  await Promise.all(events.map((event: Doc<'roomEvents'>) => ctx.db.delete(event._id)));
  await Promise.all(players.map((player: Doc<'roomPlayers'>) => ctx.db.delete(player._id)));
  await ctx.db.delete(roomId);
};

const createUniqueRoomCode = async (ctx: { db: any }): Promise<string> => {
  for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateRoomCode();
    const existing = await ctx.db
      .query('rooms')
      .withIndex('by_code', (q: any) => q.eq('code', candidate))
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

const firstActiveTurn = (
  turnOrder: PlayerId[],
  activeSet: Set<PlayerId>
): { playerId: PlayerId; index: number } | null => {
  for (let i = 0; i < turnOrder.length; i += 1) {
    const playerId = turnOrder[i]!;
    if (activeSet.has(playerId)) {
      return { playerId, index: i };
    }
  }

  return null;
};

const nextActiveTurn = (
  turnOrder: PlayerId[],
  currentPlayerId: PlayerId,
  activeSet: Set<PlayerId>
): { playerId: PlayerId; index: number } | null => {
  if (turnOrder.length === 0) {
    return null;
  }

  const currentIndex = Math.max(0, turnOrder.indexOf(currentPlayerId));

  for (let step = 1; step <= turnOrder.length; step += 1) {
    const candidateIndex = (currentIndex + step) % turnOrder.length;
    const candidate = turnOrder[candidateIndex]!;

    if (activeSet.has(candidate)) {
      return {
        playerId: candidate,
        index: candidateIndex,
      };
    }
  }

  return null;
};

const playerIsOnline = (player: Doc<'roomPlayers'>, now: number): boolean => {
  if (player.status !== 'active') return false;
  return now - player.lastSeenAt <= PRESENCE_TIMEOUT_MS;
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

    const now = Date.now();
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

    return {
      room: {
        id: room._id,
        code: room.code,
        status: room.status,
        hostPlayerId: room.hostPlayerId,
        turnOrder: room.turnOrder,
        currentTurnPlayerId: room.currentTurnPlayerId,
        currentTurnIndex: room.currentTurnIndex,
        turnNumber: room.turnNumber,
        boardLength: room.boardLength,
        maxPlayers: room.maxPlayers,
      },
      me: myPlayer?._id,
      allReady,
      activeCount: activePlayers.length,
      slotsAvailable: Math.max(0, room.maxPlayers - activePlayers.length),
      players: players.map((player) => ({
        id: player._id,
        roomId: player.roomId,
        clientId: player.clientId,
        name: player.name,
        characterId: player.characterId,
        ready: player.ready,
        status: player.status,
        position: player.position,
        orderRoll: player.orderRoll,
        orderRank: player.orderRank,
        joinedAt: player.joinedAt,
        updatedAt: player.updatedAt,
        lastSeenAt: player.lastSeenAt,
        leftAt: player.leftAt,
        isHost: room.hostPlayerId === player._id,
        isCurrentTurn: room.currentTurnPlayerId === player._id,
        online: playerIsOnline(player, now),
      })),
      history: history.map((event) => ({
        id: event._id,
        sequence: event.sequence,
        type: event.type,
        actorPlayerId: event.actorPlayerId,
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

    for (const player of latestPlayers) {
      if (player.status !== 'active') continue;

      const room = await ctx.db.get(player.roomId);
      if (!room || room.status === 'finished') continue;

      return {
        roomId: room._id,
        roomCode: room.code,
        playerId: player._id,
      };
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
      status: 'lobby',
      hostPlayerId: undefined,
      turnOrder: [],
      currentTurnPlayerId: undefined,
      currentTurnIndex: 0,
      turnNumber: 1,
      boardLength,
      maxPlayers: MAX_PLAYERS,
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

    const existing = players.find((player) => player.clientId === clientId);
    if (existing) {
      if (existing.status === 'active') {
        await ctx.db.patch(existing._id, {
          name: sanitizePlayerName(args.name, existing.name),
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
          playerId: existing._id,
          resumed: true,
        };
      }

      if (room.status !== 'lobby') {
        fail('Partida em andamento. Reentrada so e permitida para jogadores ativos.');
      }

      await ctx.db.patch(existing._id, {
        status: 'active',
        ready: false,
        leftAt: undefined,
        updatedAt: now,
        lastSeenAt: now,
        name: sanitizePlayerName(args.name, existing.name),
      });

      const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
        {
          type: 'player_rejoined',
          actorPlayerId: existing._id,
          payload: {
            playerId: existing._id,
            name: existing.name,
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
        playerId: existing._id,
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
    const player = ensureActivePlayer(players.find((entry) => entry._id === args.playerId), clientId, args.roomId);

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
    const player = ensureActivePlayer(players.find((entry) => entry._id === args.playerId), clientId, args.roomId);

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
    const host = ensureActivePlayer(players.find((entry) => entry._id === args.playerId), clientId, args.roomId);

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
        payload: {
          hostPlayerId: host._id,
          boardLength,
        },
      },
      {
        type: 'turn_order_defined',
        actorPlayerId: host._id,
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
        payload: {
          playerId: turnOrder[0],
          turnNumber: 1,
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      status: 'playing',
      turnOrder,
      currentTurnPlayerId: turnOrder[0],
      currentTurnIndex: 0,
      turnNumber: 1,
      boardLength,
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

    const players = await getRoomPlayers(ctx, args.roomId);
    const player = ensureActivePlayer(players.find((entry) => entry._id === args.playerId), clientId, args.roomId);

    if (room.currentTurnPlayerId !== player._id) {
      fail('Nao e o turno deste jogador.');
    }

    const boardLength = clampBoardLength(room.boardLength);
    const roll = randomInt(1, 6);
    const fromIndex = Math.max(0, player.position);
    const toIndex = Math.min(boardLength - 1, fromIndex + roll);

    await ctx.db.patch(player._id, {
      position: toIndex,
      updatedAt: now,
      lastSeenAt: now,
    });

    const activePlayers = getActivePlayers(players);
    const activeSet = new Set(activePlayers.map((entry) => entry._id));
    const normalizedTurnOrder = room.turnOrder.filter((entry) => activeSet.has(entry));

    if (toIndex >= boardLength - 1 || normalizedTurnOrder.length <= 1) {
      const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
        {
          type: 'dice_rolled',
          actorPlayerId: player._id,
          payload: {
            playerId: player._id,
            turnNumber: room.turnNumber,
            value: roll,
            fromIndex,
            toIndex,
          },
        },
        {
          type: 'game_finished',
          actorPlayerId: player._id,
          payload: {
            winnerPlayerId: player._id,
            reason: toIndex >= boardLength - 1 ? 'reached_end' : 'only_one_player',
          },
        },
      ]);

      await ctx.db.patch(room._id, {
        status: 'finished',
        turnOrder: normalizedTurnOrder,
        currentTurnPlayerId: undefined,
        currentTurnIndex: 0,
        updatedAt: now,
        lastActiveAt: now,
        nextEventSequence: nextSequence,
      });

      return {
        roll,
        fromIndex,
        toIndex,
        gameFinished: true,
        winnerPlayerId: player._id,
      };
    }

    const nextTurn = nextActiveTurn(normalizedTurnOrder, player._id, activeSet);
    if (!nextTurn) {
      const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
        {
          type: 'dice_rolled',
          actorPlayerId: player._id,
          payload: {
            playerId: player._id,
            turnNumber: room.turnNumber,
            value: roll,
            fromIndex,
            toIndex,
          },
        },
      ]);

      await ctx.db.patch(room._id, {
        updatedAt: now,
        lastActiveAt: now,
        nextEventSequence: nextSequence,
      });

      return {
        roll,
        fromIndex,
        toIndex,
        gameFinished: false,
      };
    }

    const nextTurnNumber = room.turnNumber + 1;

    const nextSequence = await insertRoomEvents(ctx, room._id, room.nextEventSequence, now, [
      {
        type: 'dice_rolled',
        actorPlayerId: player._id,
        payload: {
          playerId: player._id,
          turnNumber: room.turnNumber,
          value: roll,
          fromIndex,
          toIndex,
        },
      },
      {
        type: 'turn_started',
        actorPlayerId: nextTurn.playerId,
        payload: {
          playerId: nextTurn.playerId,
          turnNumber: nextTurnNumber,
        },
      },
    ]);

    await ctx.db.patch(room._id, {
      turnOrder: normalizedTurnOrder,
      currentTurnPlayerId: nextTurn.playerId,
      currentTurnIndex: nextTurn.index,
      turnNumber: nextTurnNumber,
      updatedAt: now,
      lastActiveAt: now,
      nextEventSequence: nextSequence,
    });

    return {
      roll,
      fromIndex,
      toIndex,
      gameFinished: false,
      nextPlayerId: nextTurn.playerId,
    };
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

    const player = ensureActivePlayer(players.find((entry) => entry._id === args.playerId), clientId, args.roomId);

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

      if (nextTurnOrder.length <= 1) {
        roomPatch.status = 'finished';
        roomPatch.currentTurnPlayerId = undefined;
        roomPatch.currentTurnIndex = 0;

        if (nextTurnOrder[0]) {
          events.push({
            type: 'game_finished',
            actorPlayerId: nextTurnOrder[0],
            payload: {
              winnerPlayerId: nextTurnOrder[0],
              reason: 'only_one_player',
            },
          });
        }
      } else if (!room.currentTurnPlayerId || !activeSet.has(room.currentTurnPlayerId)) {
        const firstTurn = firstActiveTurn(nextTurnOrder, activeSet);
        roomPatch.currentTurnPlayerId = firstTurn?.playerId;
        roomPatch.currentTurnIndex = firstTurn?.index ?? 0;

        if (firstTurn) {
          events.push({
            type: 'turn_started',
            actorPlayerId: firstTurn.playerId,
            payload: {
              playerId: firstTurn.playerId,
              turnNumber: room.turnNumber,
            },
          });
        }
      } else {
        roomPatch.currentTurnPlayerId = room.currentTurnPlayerId;
        roomPatch.currentTurnIndex = Math.max(0, nextTurnOrder.indexOf(room.currentTurnPlayerId));
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
    const player = await ctx.db.get(args.playerId);

    ensureActivePlayer(player, clientId, room._id);

    await Promise.all([
      ctx.db.patch(room._id, {
        updatedAt: now,
        lastActiveAt: now,
      }),
      ctx.db.patch(args.playerId, {
        updatedAt: now,
        lastSeenAt: now,
      }),
    ]);

    return {
      ok: true,
    };
  },
});

export const cleanupInactiveRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rooms = (await ctx.db.query('rooms').collect()) as Doc<'rooms'>[];

    let deletedCount = 0;

    for (const room of rooms) {
      const players = await getRoomPlayers(ctx, room._id);
      const onlinePlayers = players.filter((player) => playerIsOnline(player, now));

      const hasBeenIdleForLongEnough = now - room.lastActiveAt >= EMPTY_ROOM_TTL_MS;
      if (onlinePlayers.length === 0 && hasBeenIdleForLongEnough) {
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
