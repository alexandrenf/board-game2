import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    protocolVersion: v.number(),
    status: v.union(v.literal('lobby'), v.literal('playing'), v.literal('finished')),
    turnPhase: v.union(
      v.literal('lobby'),
      v.literal('awaiting_roll'),
      v.literal('awaiting_quiz'),
      v.literal('awaiting_ack'),
      v.literal('finished')
    ),
    hostPlayerId: v.optional(v.id('roomPlayers')),
    turnOrder: v.array(v.id('roomPlayers')),
    currentTurnPlayerId: v.optional(v.id('roomPlayers')),
    currentTurnId: v.optional(v.string()),
    currentTurnIndex: v.number(),
    turnNumber: v.number(),
    boardId: v.string(),
    boardConfigVersion: v.number(),
    boardLength: v.number(),
    maxPlayers: v.number(),
    phaseStartedAt: v.number(),
    phaseDeadlineAt: v.optional(v.number()),
    nextEventSequence: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActiveAt: v.number(),
    // Maps characterId (lowercase) -> playerId for atomic conflict detection in setCharacter.
    characterClaims: v.optional(v.any()),
  })
    .index('by_code', ['code'])
    .index('by_last_active_at', ['lastActiveAt']),

  roomPlayers: defineTable({
    roomId: v.id('rooms'),
    clientId: v.string(),
    name: v.string(),
    characterId: v.optional(v.string()),
    ready: v.boolean(),
    status: v.union(v.literal('active'), v.literal('left')),
    position: v.number(),
    quizPoints: v.optional(v.number()),
    orderRoll: v.optional(v.number()),
    orderRank: v.optional(v.number()),
    joinedAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.number(),
    leftAt: v.optional(v.number()),
  })
    .index('by_room', ['roomId'])
    .index('by_room_client', ['roomId', 'clientId'])
    .index('by_client', ['clientId']),

  roomEvents: defineTable({
    roomId: v.id('rooms'),
    sequence: v.number(),
    eventVersion: v.number(),
    type: v.string(),
    actorPlayerId: v.optional(v.id('roomPlayers')),
    turnId: v.optional(v.string()),
    turnNumber: v.optional(v.number()),
    phase: v.optional(v.string()),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_room_sequence', ['roomId', 'sequence']),

  roomTurnOperations: defineTable({
    roomId: v.id('rooms'),
    turnId: v.string(),
    actorPlayerId: v.id('roomPlayers'),
    turnNumber: v.number(),
    status: v.union(v.literal('pending'), v.literal('resolved'), v.literal('cancelled')),
    script: v.any(),
    gameFinished: v.boolean(),
    winnerPlayerId: v.optional(v.id('roomPlayers')),
    finishReason: v.optional(v.string()),
    nextPlayerId: v.optional(v.id('roomPlayers')),
    deadlineAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_room_turn', ['roomId', 'turnId'])
    .index('by_room_status', ['roomId', 'status']),

  roomQuizRounds: defineTable({
    roomId: v.id('rooms'),
    turnId: v.string(),
    turnNumber: v.number(),
    questionId: v.string(),
    questionText: v.string(),
    options: v.array(v.object({ id: v.string(), text: v.string() })),
    correctOptionId: v.string(),
    explanation: v.optional(v.string()),
    tileIndex: v.number(),
    tileColor: v.string(),
    previousIndex: v.number(),
    startedAt: v.number(),
    deadlineAt: v.number(),
    status: v.union(v.literal('active'), v.literal('resolved'), v.literal('cancelled')),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_room', ['roomId'])
    .index('by_room_turn', ['roomId', 'turnId'])
    .index('by_room_status', ['roomId', 'status']),

  // Duplicate answers for the same (roundId, playerId) should be prevented at the
  // application layer, since Convex doesn't support native multi-field unique constraints.
  roomQuizAnswers: defineTable({
    roomId: v.id('rooms'),
    roundId: v.id('roomQuizRounds'),
    playerId: v.id('roomPlayers'),
    selectedOptionId: v.optional(v.string()),
    result: v.union(v.literal('correct'), v.literal('incorrect'), v.literal('timeout')),
    pointsAwarded: v.number(),
    answeredAt: v.number(),
    timeElapsedMs: v.number(),
  })
    .index('by_room', ['roomId'])
    .index('by_round', ['roundId'])
    .index('by_round_player', ['roundId', 'playerId']),

  roomPresence: defineTable({
    roomId: v.id('rooms'),
    playerId: v.id('roomPlayers'),
    clientId: v.string(),
    lastSeenAt: v.number(),
  })
    .index('by_room', ['roomId'])
    .index('by_room_player', ['roomId', 'playerId']),
});
