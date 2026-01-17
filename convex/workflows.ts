import { v } from "convex/values";
import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { workflow } from "./index";

export const generateProjectIdeasWorkflow = workflow.define({
  args: {
    generationId: v.id("generations"),
    githubUsername: v.string(),
    guidance: v.optional(v.string()),
    parentProjectName: v.optional(v.string()),
    parentProjectDescription: v.optional(v.string()),
  },
  handler: async (step, args): Promise<void> => {
    const {
      generationId,
      githubUsername,
      guidance,
      parentProjectName,
      parentProjectDescription,
    } = args;

    const generationData = await step.runQuery(
      internal.projects.getGenerationByIdInternal,
      { id: generationId },
    );

    if (!generationData) {
      throw new Error("Generation not found");
    }

    // Step 1: Fetch GitHub data
    await step.runMutation(internal.projects.updateGenerationStep, {
      generationId,
      step: "fetching_github",
    });

    const [userRepos, userStars] = await Promise.all([
      step.runAction(
        internal.initialGeneration.fetchGitHubUserRepos,
        { githubUsername },
        { retry: true },
      ),
      step.runAction(
        internal.initialGeneration.fetchGithubUserStarredProjects,
        { githubUsername },
        { retry: true },
      ),
    ]);

    // Step 2: Generate project ideas
    await step.runMutation(internal.projects.updateGenerationStep, {
      generationId,
      step: "generating_ideas",
    });

    const projects = await step.runAction(
      internal.initialGeneration.generateProjectIdeasFromData,
      {
        githubUsername,
        repos: userRepos.repos,
        starredProjects: userStars.starredProjects,
        guidance,
        parentProjectName,
        parentProjectDescription,
      },
      { retry: true },
    );

    // Store projects immediately so user sees results faster
    await step.runMutation(internal.projects.storeProjectIdeas, {
      generationId,
      projects,
    });

    // Step 3: Generate display name async - user already sees the projects
    await step.runMutation(internal.projects.updateGenerationStep, {
      generationId,
      step: "generating_display_name",
    });

    const displayName = await step.runAction(
      internal.initialGeneration.generateDisplayName,
      { projects },
      { retry: true },
    );

    await step.runMutation(internal.projects.storeDisplayName, {
      generationId,
      displayName,
    });
  },
});

export const handleWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({
      generationId: v.id("generations"),
    }),
  },
  handler: async (ctx, args) => {
    if (args.result.kind === "failed") {
      await ctx.db.patch(args.context.generationId, {
        status: "error",
        error: args.result.error,
      });
    } else if (args.result.kind === "canceled") {
      await ctx.db.patch(args.context.generationId, {
        status: "error",
        error: "Generation was canceled",
      });
    }
  },
});
