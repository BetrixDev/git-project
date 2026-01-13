import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  useAuth,
  useUser,
} from '@clerk/tanstack-react-start'
import { useAction, useQuery } from 'convex/react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  SparklesFreeIcons,
  RefreshFreeIcons,
  Message01FreeIcons,
  Loading03FreeIcons,
  Alert02FreeIcons,
  Calendar03FreeIcons,
  BubbleChatIcon,
} from '@hugeicons/core-free-icons'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/projectIdeas')({
  component: ProjectIdeasPage,
})

function ProjectIdeasPage() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative p-4 rounded-full bg-primary/10 border border-primary/20">
            <HugeiconsIcon
              icon={Loading03FreeIcons}
              className="size-8 text-primary animate-spin"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <ProjectIdeasContent />
      </SignedIn>
    </>
  )
}

function ProjectIdeasContent() {
  const { user } = useUser()
  const projectData = useQuery(api.projects.getUserProjects)
  const generateProjects = useAction(
    api.initialGeneration.generateInitialProjectIdeas,
  )

  const [guidance, setGuidance] = useState('')
  const [hasTriggeredInitial, setHasTriggeredInitial] = useState(false)

  const githubUsername = user?.externalAccounts?.find(
    (acc) => acc.provider === 'github',
  )?.username

  const isLoading = projectData === undefined
  const isGenerating = projectData?.status === 'generating'
  const hasError = projectData?.status === 'error'
  const isCompleted = projectData?.status === 'completed'

  useEffect(() => {
    if (projectData === null && !hasTriggeredInitial && githubUsername) {
      setHasTriggeredInitial(true)
      handleGenerate()
    }
  }, [projectData, hasTriggeredInitial, githubUsername])

  const handleGenerate = async () => {
    if (!githubUsername || isGenerating) return

    try {
      await generateProjects({
        githubUsername,
        guidance: guidance.trim() || undefined,
      })
      setGuidance('')
    } catch (error) {
      console.error('Failed to generate projects:', error)
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="ideas-grid absolute inset-0" />
        <div className="ideas-glow ideas-glow-1" />
        <div className="ideas-glow ideas-glow-2" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <HugeiconsIcon
                    icon={SparklesFreeIcons}
                    className="size-5 text-primary"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Project Ideas
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    AI-generated ideas based on your GitHub profile
                  </p>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-3 w-full sm:w-auto sm:justify-end">
                <div className="flex-1 sm:flex-none sm:w-64">
                  <Input
                    placeholder="Guide new generations..."
                    value={guidance}
                    onChange={(e) => setGuidance(e.target.value)}
                    className="h-9 bg-input/30"
                  />
                </div>
                <Button
                  size="xl"
                  onClick={handleGenerate}
                  disabled={isGenerating || !githubUsername}
                  className="shrink-0"
                >
                  {isGenerating ? (
                    <HugeiconsIcon
                      icon={Loading03FreeIcons}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon icon={RefreshFreeIcons} className="size-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isGenerating ? 'Generating...' : 'Regenerate'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative p-4 rounded-full bg-primary/10 border border-primary/20">
                  <HugeiconsIcon
                    icon={Loading03FreeIcons}
                    className="size-8 text-primary animate-spin"
                  />
                </div>
              </div>
              <p className="text-muted-foreground">Loading your projects...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <div className="relative">
                <div className="relative p-4 rounded-full bg-destructive/10 border border-destructive/20">
                  <HugeiconsIcon
                    icon={Alert02FreeIcons}
                    className="size-8 text-destructive"
                  />
                </div>
              </div>
              <div className="text-center max-w-md">
                <p className="text-lg font-medium text-foreground mb-2">
                  Generation Failed
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {projectData?.error ||
                    'An unexpected error occurred while generating project ideas.'}
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !githubUsername}
                >
                  <HugeiconsIcon icon={RefreshFreeIcons} className="size-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative p-4 rounded-full bg-primary/10 border border-primary/20">
                  <HugeiconsIcon
                    icon={SparklesFreeIcons}
                    className="size-8 text-primary animate-pulse"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-1">
                  Analyzing your GitHub profile
                </p>
                <p className="text-sm text-muted-foreground">
                  Generating personalized project ideas just for you...
                </p>
              </div>
            </div>
          ) : isCompleted && projectData?.projects?.length ? (
            <div className="space-y-6">
              <GenerationInfo
                generatedAt={projectData.generatedAt}
                guidance={projectData.guidance}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectData.projects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <p className="text-muted-foreground">
                No projects generated yet. Click regenerate to get started.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !githubUsername}
              >
                <HugeiconsIcon icon={SparklesFreeIcons} className="size-4" />
                Generate Projects
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function GenerationInfo({
  generatedAt,
  guidance,
}: {
  generatedAt?: number
  guidance?: string
}) {
  if (!generatedAt && !guidance) return null

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-2">
      {generatedAt && (
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Calendar03FreeIcons} className="size-4" />
          <span>Generated {formatDate(generatedAt)}</span>
        </div>
      )}
      {guidance && (
        <div className="flex items-center gap-2 max-w-md">
          <HugeiconsIcon icon={BubbleChatIcon} className="size-4 shrink-0" />
          <span className="truncate" title={guidance}>
            "{guidance}"
          </span>
        </div>
      )}
    </div>
  )
}

interface Project {
  id: string
  name: string
  description: string
  tags: string[]
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <Card
      className="project-card group hover:border-primary/30 transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader>
        <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
          {project.name}
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {project.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[0.6rem]">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="ghost" size="sm" className="w-full gap-2">
          <HugeiconsIcon icon={Message01FreeIcons} className="size-3.5" />
          Chat with this idea
        </Button>
      </CardFooter>
    </Card>
  )
}
