import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    status: v.union(v.literal('lobby'), v.literal('playing'), v.literal('finished')),
    hostPlayerId: v.optional(v.id('roomPlayers')),
    turnOrder: v.array(v.id('roomPlayers')),
    currentTurnPlayerId: v.optional(v.id('roomPlayers')),
    currentTurnIndex: v.number(),
    turnNumber: v.number(),
    boardLength: v.number(),
    maxPlayers: v.number(),
    nextEventSequence: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActiveAt: v.number(),
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
    type: v.string(),
    actorPlayerId: v.optional(v.id('roomPlayers')),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_room_sequence', ['roomId', 'sequence']),
});
