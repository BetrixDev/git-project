'use node'

import { v } from 'convex/values'
import { Output, ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'
import { action } from './_generated/server'
import { internal } from './_generated/api'

interface GitHubRepo {
  name: string
  description: string | null
  language: string | null
  topics: Array<string>
  stargazers_count: number
  fork: boolean
}

interface RepoSummary {
  name: string
  description: string | null
  language: string | null
  topics: Array<string>
  stars: number
  isFork: boolean
}

interface FetchReposResult {
  error: string | null
  repos: Array<RepoSummary>
  pagination: {
    currentPage: number
    perPage: number
    hasNextPage: boolean
  }
}

async function fetchGitHubRepos(
  githubUsername: string,
  page: number,
  perPage: number,
  includeForks: boolean,
): Promise<FetchReposResult> {
  const response = await fetch(
    `https://api.github.com/users/${githubUsername}/repos?per_page=${perPage}&page=${page}&sort=updated`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'git-project-app',
      },
    },
  )

  if (!response.ok) {
    return {
      error: `Failed to fetch repos: ${response.statusText}`,
      repos: [],
      pagination: { currentPage: page, perPage, hasNextPage: false },
    }
  }

  const repos: Array<GitHubRepo> = await response.json()
  const filteredRepos = includeForks ? repos : repos.filter((r) => !r.fork)

  const linkHeader = response.headers.get('Link')
  const hasNextPage = linkHeader?.includes('rel="next"') ?? false

  return {
    error: null,
    repos: filteredRepos.map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      topics: repo.topics,
      stars: repo.stargazers_count,
      isFork: repo.fork,
    })),
    pagination: {
      currentPage: page,
      perPage,
      hasNextPage,
    },
  }
}

const projectIdeasSchema = z.object({
  projects: z.array(
    z.object({
      id: z
        .string()
        .describe('A unique kebab-case identifier for this project'),
      name: z.string().describe('A catchy, memorable project name'),
      description: z
        .string()
        .describe(
          'A 2-3 sentence description explaining what the project does and why it is interesting',
        ),
      tags: z
        .array(z.string())
        .describe('3-5 relevant technology or domain tags'),
    }),
  ),
})

export const generateInitialProjectIdeas = action({
  args: {
    generationId: v.id('generations'),
    githubUsername: v.string(),
    guidance: v.optional(v.string()),
    // Branching support
    parentProjectName: v.optional(v.string()),
    parentProjectDescription: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('You must be signed in to generate project ideas')
    }

    const {
      generationId,
      githubUsername,
      guidance,
      parentProjectName,
      parentProjectDescription,
    } = args

    try {
      // Build context-aware instructions based on whether this is a branch
      const isBranch = parentProjectName && parentProjectDescription
      const branchContext = isBranch
        ? `

IMPORTANT: This is a BRANCHED generation. The user has selected a specific project idea they're interested in:
- Project Name: "${parentProjectName}"
- Project Description: "${parentProjectDescription}"

Generate 5 NEW project ideas that are variations, extensions, or related concepts based on this specific project. Ideas should:
- Explore different angles or implementations of the same core concept
- Suggest complementary projects that work well with the original idea
- Propose simpler or more complex versions
- Consider different tech stacks or platforms for similar functionality
- Think creatively about related problem spaces`
        : ''

      const agent = new ToolLoopAgent({
        model: 'google/gemini-2.5-flash',
        instructions: `You are a creative project idea generator. Your task is to analyze a developer's GitHub repositories and suggest new project ideas tailored to their skills and interests.

First, use the getGitHubRepos tool to explore the user's repositories. You can paginate through them to get a comprehensive view of their work. Look for patterns in:
- Programming languages they use
- Types of projects they build (web apps, CLI tools, libraries, etc.)
- Domains they're interested in (AI, gaming, productivity, etc.)
- Their skill level based on project complexity

After gathering enough information, generate 6 diverse project ideas that:
- Build on their existing skills while introducing new challenges
- Are unique and creative, not generic tutorial projects
- Have practical value or would be genuinely fun to build
- Match their apparent interests and expertise level${branchContext}`,
        tools: {
          getGitHubRepos: tool({
            description:
              'Fetches public GitHub repositories for a user. Use pagination to explore more repos if needed. Returns repos sorted by most recently updated.',
            inputSchema: z.object({
              page: z
                .number()
                .min(1)
                .default(1)
                .describe('Page number for pagination (starts at 1)'),
              perPage: z
                .number()
                .min(1)
                .max(30)
                .default(10)
                .describe('Number of repos per page (max 30)'),
              includeForks: z
                .boolean()
                .default(false)
                .describe('Whether to include forked repositories'),
            }),
            execute: async (params) => {
              return fetchGitHubRepos(
                githubUsername,
                params.page,
                params.perPage,
                params.includeForks,
              )
            },
          }),
        },
        output: Output.object({ schema: projectIdeasSchema }),
      })

      let prompt: string
      if (isBranch) {
        prompt = `Generate 5 NEW project ideas that branch from and are inspired by this specific project: "${parentProjectName}" - ${parentProjectDescription}`
        if (guidance) {
          prompt += `\n\nAdditional guidance from the user: ${guidance}`
        }
        prompt += `\n\nFirst, briefly check the user's GitHub repos (${githubUsername}) to understand their skill level, then generate the branched ideas.`
      } else {
        prompt = `Analyze the GitHub repositories for user "${githubUsername}" and generate 5 personalized project ideas based on their work. Start by fetching their repos to understand their skills and interests.`
        if (guidance) {
          prompt += `\n\nAdditional guidance from the user: ${guidance}`
        }
      }

      const result = await agent.generate({ prompt })

      if (!result.output) {
        await ctx.runMutation(internal.projects.setGenerationError, {
          generationId,
          error: 'AI did not generate project ideas. Please try again.',
        })
        return null
      }

      await ctx.runMutation(internal.projects.storeProjectIdeas, {
        generationId,
        projects: result.output.projects,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      await ctx.runMutation(internal.projects.setGenerationError, {
        generationId,
        error: errorMessage,
      })
    }

    return null
  },
})
