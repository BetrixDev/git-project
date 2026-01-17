import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { generationStatusValidator, projectValidator } from './schema'

export { projectValidator }

export const createGeneration = mutation({
  args: {
    guidance: v.optional(v.string()),
    parentGenerationId: v.optional(v.id('generations')),
    parentProjectId: v.optional(v.string()),
    parentProjectName: v.optional(v.string()),
  },
  returns: v.id('generations'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('You must be signed in to create a generation')
    }

    const generationId = await ctx.db.insert('generations', {
      userId: identity.subject,
      status: 'generating',
      projects: [],
      guidance: args.guidance || undefined,
      parentGenerationId: args.parentGenerationId,
      parentProjectId: args.parentProjectId,
      parentProjectName: args.parentProjectName,
    })

    return generationId
  },
})

export const startGeneration = internalMutation({
  args: {
    userId: v.string(),
    guidance: v.optional(v.string()),
    parentGenerationId: v.optional(v.id('generations')),
    parentProjectId: v.optional(v.string()),
    parentProjectName: v.optional(v.string()),
  },
  returns: v.id('generations'),
  handler: async (ctx, args) => {
    const generationId = await ctx.db.insert('generations', {
      userId: args.userId,
      status: 'generating',
      projects: [],
      guidance: args.guidance || undefined,
      parentGenerationId: args.parentGenerationId,
      parentProjectId: args.parentProjectId,
      parentProjectName: args.parentProjectName,
    })

    return generationId
  },
})

export const storeProjectIdeas = internalMutation({
  args: {
    generationId: v.id('generations'),
    displayName: v.string(),
    projects: v.array(projectValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.patch(args.generationId, {
      projects: args.projects,
      status: 'completed',
      error: undefined,
      generatedAt: now,
      displayName: args.displayName,
    })

    return null
  },
})

export const setGenerationError = internalMutation({
  args: {
    generationId: v.id('generations'),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: 'error',
      error: args.error,
    })

    return null
  },
})

// Get the latest generation for the current user
export const getLatestGeneration = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('generations'),
      _creationTime: v.number(),
      userId: v.string(),
      status: generationStatusValidator,
      error: v.optional(v.string()),
      generatedAt: v.optional(v.number()),
      guidance: v.optional(v.string()),
      displayName: v.optional(v.string()),
      projects: v.array(projectValidator),
      parentGenerationId: v.optional(v.id('generations')),
      parentProjectId: v.optional(v.string()),
      parentProjectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const generation = await ctx.db
      .query('generations')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .first()

    return generation
  },
})

// Get generation history for sidebar
export const getGenerationHistory = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('generations'),
      _creationTime: v.number(),
      status: generationStatusValidator,
      generatedAt: v.optional(v.number()),
      guidance: v.optional(v.string()),
      displayName: v.optional(v.string()),
      projectCount: v.number(),
      parentGenerationId: v.optional(v.id('generations')),
      parentProjectId: v.optional(v.string()),
      parentProjectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const generations = await ctx.db
      .query('generations')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .take(50)

    return generations.map((gen) => ({
      _id: gen._id,
      _creationTime: gen._creationTime,
      status: gen.status,
      generatedAt: gen.generatedAt,
      guidance: gen.guidance,
      displayName: gen.displayName,
      projectCount: gen.projects.length,
      parentGenerationId: gen.parentGenerationId,
      parentProjectId: gen.parentProjectId,
      parentProjectName: gen.parentProjectName,
    }))
  },
})

// Get a specific generation by ID
export const getGenerationById = query({
  args: { id: v.id('generations') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('generations'),
      _creationTime: v.number(),
      userId: v.string(),
      status: generationStatusValidator,
      error: v.optional(v.string()),
      generatedAt: v.optional(v.number()),
      guidance: v.optional(v.string()),
      displayName: v.optional(v.string()),
      projects: v.array(projectValidator),
      parentGenerationId: v.optional(v.id('generations')),
      parentProjectId: v.optional(v.string()),
      parentProjectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const generation = await ctx.db.get(args.id)
    if (!generation || generation.userId !== identity.subject) {
      return null
    }

    return generation
  },
})

// Get branches (children) for a specific generation
export const getGenerationBranches = query({
  args: { parentId: v.id('generations') },
  returns: v.array(
    v.object({
      _id: v.id('generations'),
      _creationTime: v.number(),
      status: generationStatusValidator,
      generatedAt: v.optional(v.number()),
      guidance: v.optional(v.string()),
      projectCount: v.number(),
      parentProjectId: v.optional(v.string()),
      parentProjectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const branches = await ctx.db
      .query('generations')
      .withIndex('by_parentGenerationId', (q) =>
        q.eq('parentGenerationId', args.parentId),
      )
      .order('desc')
      .collect()

    // Filter to only user's own branches
    return branches
      .filter((gen) => gen.userId === identity.subject)
      .map((gen) => ({
        _id: gen._id,
        _creationTime: gen._creationTime,
        status: gen.status,
        generatedAt: gen.generatedAt,
        guidance: gen.guidance,
        projectCount: gen.projects.length,
        parentProjectId: gen.parentProjectId,
        parentProjectName: gen.parentProjectName,
      }))
  },
})

export const updateGenerationDisplayName = mutation({
  args: {
    generationId: v.id('generations'),
    displayName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()

    if (!user) {
      throw new Error('User not found')
    }

    const generation = await ctx.db.get(args.generationId)

    if (!generation || generation.userId !== user.subject) {
      throw new Error('Generation not found')
    }

    await ctx.db.patch(args.generationId, { displayName: args.displayName })
    return null
  },
})

export const deleteGeneration = mutation({
  args: {
    generationId: v.id('generations'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()

    if (!user) {
      throw new Error('User not found')
    }

    const generation = await ctx.db.get(args.generationId)

    if (!generation || generation.userId !== user.subject) {
      throw new Error('Generation not found')
    }

    await ctx.db.delete(args.generationId)
    return null
  },
})