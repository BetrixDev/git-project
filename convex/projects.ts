import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { generationStatusValidator, projectValidator } from './schema'

export { projectValidator }

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

/**
 * Derives a meaningful display name from the common/dominant tags across projects.
 * Analyzes tag frequency and picks the most representative theme.
 */
function deriveDisplayNameFromTags(
  projects: Array<{
    id: string
    name: string
    description: string
    tags: string[]
  }>,
): string {
  if (projects.length === 0) return 'Empty Generation'

  // Count tag occurrences across all projects
  const tagCounts = new Map<string, number>()
  for (const project of projects) {
    for (const tag of project.tags) {
      const normalized = tag.toLowerCase().trim()
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
    }
  }

  // Sort tags by frequency (descending), then alphabetically for ties
  const sortedTags = [...tagCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .map(([tag]) => tag)

  if (sortedTags.length === 0) {
    // Fallback: use first project name if no tags
    return projects[0].name.slice(0, 30)
  }

  // Format the display name from top tags
  // Title case the tags for better readability
  const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

  // Take top 2 tags if they appear in at least 2 projects, otherwise just the top one
  const threshold = Math.max(2, Math.floor(projects.length / 2))
  const dominantTags = sortedTags.filter(
    (tag) => (tagCounts.get(tag) || 0) >= threshold,
  )

  if (dominantTags.length >= 2) {
    return `${titleCase(dominantTags[0])} & ${titleCase(dominantTags[1])}`
  } else if (dominantTags.length === 1) {
    return `${titleCase(dominantTags[0])} Projects`
  } else {
    // No dominant tags, use top 2 most common
    if (sortedTags.length >= 2) {
      return `${titleCase(sortedTags[0])} & ${titleCase(sortedTags[1])}`
    }
    return `${titleCase(sortedTags[0])} Projects`
  }
}

export const storeProjectIdeas = internalMutation({
  args: {
    generationId: v.id('generations'),
    projects: v.array(projectValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()

    // Derive a meaningful display name from the project tags
    const displayName = deriveDisplayNameFromTags(args.projects)

    await ctx.db.patch(args.generationId, {
      projects: args.projects,
      status: 'completed',
      error: undefined,
      generatedAt: now,
      displayName,
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
