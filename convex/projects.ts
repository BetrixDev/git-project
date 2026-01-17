import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { generationStepValidator, projectValidator } from "./schema";
import { api, internal } from "./_generated/api";
import { workflow } from "./index";

export { projectValidator };

export const createGeneration = mutation({
  args: {
    githubUsername: v.string(),
    guidance: v.optional(v.string()),
    parentGenerationId: v.optional(v.id("generations")),
    parentProjectId: v.optional(v.string()),
    parentProjectName: v.optional(v.string()),
    parentProjectDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to create a generation");
    }

    const generationId = await ctx.db.insert("generations", {
      userId: identity.subject,
      status: "generating",
      projects: [],
      guidance: args.guidance || undefined,
      parentGenerationId: args.parentGenerationId,
      parentProjectId: args.parentProjectId,
      parentProjectName: args.parentProjectName,
    });

    await workflow.start(
      ctx,
      internal.workflows.generateProjectIdeasWorkflow,
      {
        generationId,
        githubUsername: args.githubUsername,
        guidance: args.guidance,
        parentProjectName: args.parentProjectName,
        parentProjectDescription: args.parentProjectDescription,
      },
      {
        onComplete: internal.workflows.handleWorkflowComplete,
        context: { generationId },
      },
    );

    return generationId;
  },
});

export const retryGeneration = mutation({
  args: {
    generationId: v.id("generations"),
    githubUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to retry a generation");
    }

    const generation = await ctx.db.get(args.generationId);
    if (!generation || generation.userId !== identity.subject) {
      throw new Error("Generation not found");
    }

    if (generation.status !== "error") {
      throw new Error("Can only retry failed generations");
    }

    await ctx.db.patch(args.generationId, {
      status: "generating",
      error: undefined,
    });

    await workflow.start(
      ctx,
      internal.workflows.generateProjectIdeasWorkflow,
      {
        generationId: args.generationId,
        githubUsername: args.githubUsername,
        guidance: generation.guidance,
        parentProjectName: generation.parentProjectName,
        parentProjectDescription: undefined,
      },
      {
        onComplete: internal.workflows.handleWorkflowComplete,
        context: { generationId: args.generationId },
      },
    );

    return null;
  },
});

export const storeProjectIdeas = internalMutation({
  args: {
    generationId: v.id("generations"),
    projects: v.array(projectValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.generationId, {
      projects: args.projects,
      status: "completed",
      error: undefined,
      generatedAt: now,
    });

    return null;
  },
});

export const storeDisplayName = internalMutation({
  args: {
    generationId: v.id("generations"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      displayName: args.displayName,
      currentStep: undefined,
    });

    return null;
  },
});

export const updateGenerationStep = internalMutation({
  args: {
    generationId: v.id("generations"),
    step: generationStepValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      currentStep: args.step,
    });

    return null;
  },
});

export const getGenerationByIdInternal = internalQuery({
  args: { id: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const setGenerationError = internalMutation({
  args: {
    generationId: v.id("generations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: "error",
      error: args.error,
    });

    return null;
  },
});

// Get the latest generation for the current user
export const getLatestGeneration = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const generation = await ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .first();

    return generation;
  },
});

// Get generation history for sidebar
export const getGenerationHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(50);

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
    }));
  },
});

// Get a specific generation by ID
export const getGenerationById = query({
  args: { id: v.id("generations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const generation = await ctx.db.get(args.id);
    if (!generation || generation.userId !== identity.subject) {
      return null;
    }

    return generation;
  },
});

// Get branches (children) for a specific generation
export const getGenerationBranches = query({
  args: { parentId: v.id("generations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const branches = await ctx.db
      .query("generations")
      .withIndex("by_parentGenerationId", (q) =>
        q.eq("parentGenerationId", args.parentId),
      )
      .order("desc")
      .collect();

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
      }));
  },
});

export const updateGenerationDisplayName = mutation({
  args: {
    generationId: v.id("generations"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not found");
    }

    const generation = await ctx.db.get(args.generationId);

    if (!generation || generation.userId !== user.subject) {
      throw new Error("Generation not found");
    }

    await ctx.db.patch(args.generationId, { displayName: args.displayName });
    return null;
  },
});

export const deleteGeneration = mutation({
  args: {
    generationId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not found");
    }

    const generation = await ctx.db.get(args.generationId);

    if (!generation || generation.userId !== user.subject) {
      throw new Error("Generation not found");
    }

    const branches = await ctx.db
      .query("generations")
      .withIndex("by_parentGenerationId", (q) =>
        q.eq("parentGenerationId", args.generationId),
      )
      .collect();

    for (const branch of branches) {
      await ctx.runMutation(api.projects.deleteGeneration, {
        generationId: branch._id,
      });
    }

    await ctx.db.delete(args.generationId);
    return null;
  },
});
