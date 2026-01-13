import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const generationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('generating'),
  v.literal('completed'),
  v.literal('error'),
)

export default defineSchema({
  initialProjectGenerations: defineTable({
    userId: v.string(),
    status: generationStatusValidator,
    error: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    guidance: v.optional(v.string()),
    projects: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        tags: v.array(v.string()),
      }),
    ),
  }).index('by_userId', ['userId']),
})
