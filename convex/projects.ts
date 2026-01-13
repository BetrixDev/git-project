import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { generationStatusValidator } from './schema'

export const projectIdeaValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
})

export const startGeneration = internalMutation({
  args: {
    userId: v.string(),
    guidance: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('initialProjectGenerations')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'generating',
        error: undefined,
        guidance: args.guidance || undefined,
      })
    } else {
      await ctx.db.insert('initialProjectGenerations', {
        userId: args.userId,
        status: 'generating',
        projects: [],
        guidance: args.guidance || undefined,
      })
    }
    return null
  },
})

export const storeProjectIdeas = internalMutation({
  args: {
    userId: v.string(),
    projects: v.array(projectIdeaValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('initialProjectGenerations')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        projects: args.projects,
        status: 'completed',
        error: undefined,
        generatedAt: now,
      })
    } else {
      await ctx.db.insert('initialProjectGenerations', {
        userId: args.userId,
        projects: args.projects,
        status: 'completed',
        generatedAt: now,
      })
    }
    return null
  },
})

export const setGenerationError = internalMutation({
  args: {
    userId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('initialProjectGenerations')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'error',
        error: args.error,
      })
    } else {
      await ctx.db.insert('initialProjectGenerations', {
        userId: args.userId,
        status: 'error',
        error: args.error,
        projects: [],
      })
    }
    return null
  },
})

export const getUserProjects = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('initialProjectGenerations'),
      _creationTime: v.number(),
      userId: v.string(),
      status: generationStatusValidator,
      error: v.optional(v.string()),
      generatedAt: v.optional(v.number()),
      guidance: v.optional(v.string()),
      projects: v.array(projectIdeaValidator),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const generation = await ctx.db
      .query('initialProjectGenerations')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .unique()

    return generation
  },
})
