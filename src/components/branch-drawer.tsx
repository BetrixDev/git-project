import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { useUser } from '@clerk/tanstack-react-start'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  GitBranchIcon,
  Loading03FreeIcons,
  SparklesFreeIcons,
  ArrowRight01FreeIcons,
  Tick01Icon,
} from '@hugeicons/core-free-icons'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface Project {
  id: string
  name: string
  description: string
  tags: Array<string>
}

interface BranchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  generationId: Id<'generations'> | null
}

export function BranchDrawer({
  open,
  onOpenChange,
  project,
  generationId,
}: BranchDrawerProps) {
  const { user } = useUser()
  const navigate = useNavigate()
  const generateProjects = useAction(
    api.initialGeneration.generateInitialProjectIdeas,
  )

  const [guidance, setGuidance] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Get existing branches for this project
  const branches = useQuery(
    api.projects.getGenerationBranches,
    generationId ? { parentId: generationId } : 'skip',
  )

  const projectBranches = branches?.filter(
    (b) => b.parentProjectId === project?.id,
  )

  const githubUsername = user?.externalAccounts?.find(
    (acc) => acc.provider === 'github',
  )?.username

  const handleBranch = async () => {
    if (!githubUsername || !project || !generationId || isGenerating) return

    setIsGenerating(true)
    try {
      await generateProjects({
        githubUsername,
        guidance: guidance.trim() || undefined,
        parentGenerationId: generationId,
        parentProjectId: project.id,
        parentProjectName: project.name,
        parentProjectDescription: project.description,
      })
      setGuidance('')
      onOpenChange(false)
      // Navigate to see the new generation
      navigate({ to: '/projectIdeas', search: {} })
    } catch (error) {
      console.error('Failed to generate branched projects:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!project) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-md w-full branch-drawer-content"
      >
        <SheetHeader className="border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
              <HugeiconsIcon
                icon={GitBranchIcon}
                className="size-5 text-primary"
              />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                Branch from Idea
              </SheetTitle>
              <SheetDescription className="text-xs">
                Explore variations of your selected concept
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 px-6 space-y-6">
          {/* Selected Project */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Source Project
            </label>
            <div className="source-project-card p-4 rounded-xl">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] bg-background/30 border-primary/20"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Branch Direction */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-chart-2" />
              Branch Direction
              <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <Textarea
              placeholder="e.g. 'make it simpler for beginners' or 'focus on mobile' or 'use different tech stack'..."
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              className="min-h-24 resize-none bg-input/30 border-border/50 focus:border-primary/50"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Leave empty for AI to explore various directions automatically
            </p>
          </div>

          {/* What you'll get */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-chart-3" />
              What You'll Get
            </label>
            <div className="grid gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
              {[
                'Different implementations of the same concept',
                'Simpler or more advanced versions',
                'Complementary projects that work together',
                'Alternative tech stacks or platforms',
                'Related ideas in the same problem space',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <div className="size-4 rounded-full bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      className="size-2.5 text-primary"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Branches */}
          {projectBranches && projectBranches.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-chart-4" />
                Previous Branches
                <span className="ml-auto text-primary bg-primary/10 px-1.5 py-0.5 rounded-full text-[9px]">
                  {projectBranches.length}
                </span>
              </label>
              <div className="space-y-2">
                {projectBranches.map((branch) => (
                  <button
                    key={branch._id}
                    onClick={() => {
                      onOpenChange(false)
                      navigate({
                        to: '/projectIdeas',
                        search: { generationId: branch._id },
                      })
                    }}
                    className="w-full p-3 rounded-lg border border-border/30 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <HugeiconsIcon
                          icon={GitBranchIcon}
                          className="size-3.5 text-primary shrink-0"
                        />
                        <span className="text-sm font-medium truncate">
                          {branch.guidance || `${branch.projectCount} ideas`}
                        </span>
                      </div>
                      <HugeiconsIcon
                        icon={ArrowRight01FreeIcons}
                        className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-5.5">
                      {branch.projectCount} project ideas
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-primary/10">
          <Button
            onClick={handleBranch}
            disabled={isGenerating || !githubUsername}
            className={`w-full gap-2 h-12 text-sm font-semibold ${isGenerating ? 'branch-generating' : ''}`}
            size="lg"
          >
            {isGenerating ? (
              <>
                <HugeiconsIcon
                  icon={Loading03FreeIcons}
                  className="size-4 animate-spin"
                />
                Generating Branches...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={SparklesFreeIcons} className="size-4" />
                Generate 5 New Ideas
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
