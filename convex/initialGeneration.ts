"use node";

import { v } from "convex/values";
import { Output, generateText } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import dedent from "dedent";
import { internalAction } from "./_generated/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

type GitHubRepo = {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: Array<string>;
  stars: number;
  fork: boolean;
  is_template: boolean;
  archived: boolean;
};

type RepoData = {
  name: string;
  description: string | null;
  language: string | null;
  topics: Array<string>;
};

async function fetchGitHubRepos(githubUsername: string) {
  const response = await fetch(
    `https://api.github.com/users/${githubUsername}/repos?per_page=5&sort=updated`,
    {
      headers: {
        Accept: "application/json; charset=utf-8",
        "User-Agent":
          "git-a-project <https://github.com/betrixdev/git-a-project>",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch repos for user ${githubUsername}: ${response.statusText}`,
    );
  }

  const repos: Array<GitHubRepo> = await response.json();
  const filteredRepos = repos.filter(
    (r) => !r.fork && !r.is_template && !r.archived,
  );

  return {
    repos: filteredRepos.map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      topics: repo.topics,
    })),
  };
}

async function fetchGithubStarredProjects(githubUsername: string) {
  const response = await fetch(
    `https://api.github.com/users/${githubUsername}/starred?per_page=25`,
    {
      headers: {
        Accept: "application/json; charset=utf-8",
        "User-Agent":
          "git-a-project <https://github.com/betrixdev/git-a-project>",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch starred projects for user ${githubUsername}: ${response.statusText}`,
    );
  }

  const starredProjects: Array<GitHubRepo> = await response.json();
  const filteredStarredProjects = starredProjects.filter(
    (r) => !r.fork && !r.is_template && !r.archived,
  );

  return {
    starredProjects: filteredStarredProjects.map((project) => ({
      name: project.name,
      description: project.description,
      language: project.language,
      topics: project.topics,
    })),
  };
}

const projectIdeasSchema = z.object({
  projects: z.array(
    z.object({
      id: z
        .string()
        .describe("A unique kebab-case identifier for this project"),
      name: z.string().describe("A catchy, memorable project name"),
      description: z
        .string()
        .describe(
          "A 2-3 sentence description explaining what the project does and why it is interesting",
        ),
      tags: z
        .array(z.string())
        .describe("3-5 relevant technology or domain tags"),
    }),
  ),
});

type ProjectIdea = {
  id: string;
  name: string;
  description: string;
  tags: Array<string>;
};

export const fetchGitHubUserRepos = internalAction({
  args: { githubUsername: v.string() },
  handler: async (_, args) => {
    return await fetchGitHubRepos(args.githubUsername);
  },
});

export const fetchGithubUserStarredProjects = internalAction({
  args: { githubUsername: v.string() },
  handler: async (_, args) => {
    return await fetchGithubStarredProjects(args.githubUsername);
  },
});

export const generateProjectIdeasFromData = internalAction({
  args: {
    githubUsername: v.string(),
    repos: v.array(
      v.object({
        name: v.string(),
        description: v.union(v.string(), v.null()),
        language: v.union(v.string(), v.null()),
        topics: v.array(v.string()),
      }),
    ),
    starredProjects: v.array(
      v.object({
        name: v.string(),
        description: v.union(v.string(), v.null()),
        language: v.union(v.string(), v.null()),
        topics: v.array(v.string()),
      }),
    ),
    guidance: v.optional(v.string()),
    parentProjectName: v.optional(v.string()),
    parentProjectDescription: v.optional(v.string()),
  },
  handler: async (_, args): Promise<Array<ProjectIdea>> => {
    const {
      githubUsername,
      repos,
      starredProjects,
      guidance,
      parentProjectName,
      parentProjectDescription,
    } = args;

    const isBranch = parentProjectName && parentProjectDescription;
    const branchContext = isBranch
      ? dedent`

IMPORTANT: This is a BRANCHED generation. The user has selected a specific project idea they're interested in:
- Project Name: "${parentProjectName}"
- Project Description: "${parentProjectDescription}"

Generate 6 NEW project ideas that are variations, extensions, or related concepts based on this specific project. Ideas should:
- Explore different angles or implementations of the same core concept
- Suggest complementary projects that work well with the original idea
- Propose simpler or more complex versions
- Consider different tech stacks or platforms for similar functionality
- Think creatively about related problem spaces`
      : "";

    const guidanceContext = guidance
      ? `\n\nAdditional guidance from the user: ${guidance}`
      : "";

    const repoSummary = repos
      .map(
        (r: RepoData) =>
          `${r.name}${r.language ? ` (${r.language})` : ""}${r.description ? `: ${r.description}` : ""}`,
      )
      .join("\n");

    const starsSummary = starredProjects
      .map(
        (r: RepoData) =>
          `${r.name}${r.language ? ` (${r.language})` : ""}${r.description ? `: ${r.description}` : ""}`,
      )
      .join("\n");

    const result = await generateText({
      model: openrouter("x-ai/grok-4.1-fast"),
      output: Output.object({ schema: projectIdeasSchema }),
      system: dedent`
        You are a project idea generator.
        You will be given a list of a user's repositories and stars.
        Your task is to generate a list of 6 project ideas based on the given information.
        Analyze the user's repositories and stars to understand their interests and expertise.
        The projects should be unique, innovative, and have a clear purpose.
        ${branchContext}${guidanceContext}
      `,
      prompt: dedent`
        GitHub username: ${githubUsername}

        User's Repositories:
        ${repoSummary || "No repositories found"}

        User's Starred Projects:
        ${starsSummary || "No starred projects found"}
      `,
    });

    if (!result.output?.projects) {
      throw new Error("AI did not generate project ideas");
    }

    return result.output.projects;
  },
});

export const generateDisplayName = internalAction({
  args: {
    projects: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        tags: v.array(v.string()),
      }),
    ),
  },
  handler: async (_, args): Promise<string> => {
    const projectSummary = args.projects
      .map((p) => `${p.name} - ${p.description}`)
      .join("\n");

    const result = await generateText({
      model: openrouter("x-ai/grok-4.1-fast"),
      prompt: `Come up with a short display name that sums up the following project ideas:\n${projectSummary}\n\nThe display name should be no more than 5 words. Only output the display name and nothing else.`,
    });

    return result.text.trim();
  },
});
