import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const generationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('generating'),
  v.literal('completed'),
  v.literal('error'),
)

export const projectValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
})

export default defineSchema({
  generations: defineTable({
    userId: v.string(),
    status: generationStatusValidator,
    error: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    guidance: v.optional(v.string()),
    projects: v.array(projectValidator),
    // Auto-generated display name based on common tags across projects
    displayName: v.optional(v.string()),
    // Branching support - link to parent generation and specific project that inspired this
    parentGenerationId: v.optional(v.id('generations')),
    parentProjectId: v.optional(v.string()), // The project.id from parent generation
    parentProjectName: v.optional(v.string()), // Cached for display
  })
    .index('by_userId', ['userId'])
    .index('by_parentGenerationId', ['parentGenerationId']),

  chats: defineTable({
    userId: v.string(),
    generationId: v.optional(v.id('generations')),
    projectId: v.optional(v.string()),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_generationId', ['generationId']),
})
