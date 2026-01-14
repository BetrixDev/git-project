import { useQuery } from 'convex/react'
import { Link, useSearch } from '@tanstack/react-router'
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/tanstack-react-start'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01FreeIcons,
  GitBranchIcon,
  Home01FreeIcons,
  Loading03FreeIcons,
  Message01FreeIcons,
  SparklesFreeIcons,
} from '@hugeicons/core-free-icons'
import { api } from '../../convex/_generated/api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useGenerateProjects } from '@/hooks/use-generate-projects'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function GenerationHistorySkeleton() {
  return (
    <SidebarMenu>
      {Array.from({ length: 3 }).map((_, index) => (
        <SidebarMenuItem key={index}>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function GenerationHistoryList() {
  const history = useQuery(api.projects.getGenerationHistory)

  // Try to get the current generation ID from search params
  let currentGenerationId: string | undefined
  try {
    const search = useSearch({ strict: false })
    currentGenerationId = search?.generationId
  } catch {
    // Not on a route with search params
  }

  if (history === undefined) {
    return <GenerationHistorySkeleton />
  }

  if (history.length === 0) {
    return (
      <div className="px-2 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          No generations yet. Generate your first project ideas!
        </p>
      </div>
    )
  }

  // Organize into tree structure: root generations and their branches
  const rootGenerations = history.filter((g) => !g.parentGenerationId)
  const branchMap = new Map<string, typeof history>()

  history.forEach((g) => {
    if (g.parentGenerationId) {
      const existing = branchMap.get(g.parentGenerationId) || []
      existing.push(g)
      branchMap.set(g.parentGenerationId, existing)
    }
  })

  // Recursive component to render branches at any depth
  function BranchSubMenu({
    branches,
    depth = 1,
  }: {
    branches: NonNullable<typeof history>
    depth?: number
  }) {
    return (
      <SidebarMenuSub>
        {branches.map((branch) => {
          const isBranchActive = currentGenerationId === branch._id
          const branchDisplayTime = branch.generatedAt || branch._creationTime
          const isBranchGenerating = branch.status === 'generating'
          const childBranches = branchMap.get(branch._id) || []
          const hasChildBranches = childBranches.length > 0

          return (
            <SidebarMenuSubItem key={branch._id}>
              <SidebarMenuSubButton
                isActive={isBranchActive}
                render={
                  <Link
                    to="/projectIdeas"
                    search={{ generationId: branch._id }}
                  />
                }
              >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                  {isBranchGenerating ? (
                    <HugeiconsIcon
                      icon={Loading03FreeIcons}
                      className="size-3 animate-spin text-primary shrink-0"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={GitBranchIcon}
                      className="size-3 text-primary shrink-0"
                    />
                  )}
                  <div className="flex flex-col gap-0 overflow-hidden flex-1">
                    <span className="truncate text-[11px]">
                      {isBranchGenerating
                        ? 'Generating...'
                        : branch.parentProjectName
                          ? branch.parentProjectName.slice(0, 20) +
                            (branch.parentProjectName.length > 20 ? '...' : '')
                          : branch.guidance
                            ? branch.guidance.slice(0, 20) +
                              (branch.guidance.length > 20 ? '...' : '')
                            : `${branch.projectCount} ideas`}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {isBranchGenerating ? (
                        <span className="text-primary animate-pulse">
                          Creating ideas
                        </span>
                      ) : (
                        formatRelativeTime(branchDisplayTime)
                      )}
                    </span>
                  </div>
                  {hasChildBranches && (
                    <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                      {childBranches.length}
                    </span>
                  )}
                </div>
              </SidebarMenuSubButton>

              {/* Recursively render child branches */}
              {hasChildBranches && (
                <BranchSubMenu branches={childBranches} depth={depth + 1} />
              )}
            </SidebarMenuSubItem>
          )
        })}
      </SidebarMenuSub>
    )
  }

  return (
    <SidebarMenu>
      {rootGenerations.map((generation) => {
        const isActive = currentGenerationId === generation._id
        const displayTime = generation.generatedAt || generation._creationTime
        const isGenerating = generation.status === 'generating'
        const branches = branchMap.get(generation._id) || []
        const hasBranches = branches.length > 0

        return (
          <SidebarMenuItem key={generation._id}>
            <SidebarMenuButton
              isActive={isActive}
              render={
                <Link
                  to="/projectIdeas"
                  search={{ generationId: generation._id }}
                />
              }
              tooltip={
                isGenerating
                  ? 'Generating project ideas...'
                  : generation.displayName ||
                    generation.guidance ||
                    `${generation.projectCount} project ideas`
              }
            >
              {isGenerating ? (
                <HugeiconsIcon
                  icon={Loading03FreeIcons}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={SparklesFreeIcons} className="size-4" />
              )}
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                <span className="truncate">
                  {isGenerating
                    ? 'Generating...'
                    : generation.displayName
                      ? generation.displayName.slice(0, 25) +
                        (generation.displayName.length > 25 ? '...' : '')
                      : generation.guidance
                        ? generation.guidance.slice(0, 25) +
                          (generation.guidance.length > 25 ? '...' : '')
                        : `${generation.projectCount} ideas`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isGenerating ? (
                    <span className="text-primary animate-pulse">
                      Creating project ideas
                    </span>
                  ) : (
                    formatRelativeTime(displayTime)
                  )}
                </span>
              </div>
              {hasBranches && (
                <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {branches.length}
                </span>
              )}
            </SidebarMenuButton>

            {/* Branch items - now recursive */}
            {hasBranches && <BranchSubMenu branches={branches} />}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function AppSidebar() {
  const user = useUser()
  const { generateProjects, isGenerating } = useGenerateProjects()

  const handleNewGeneration = () => {
    generateProjects()
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/" />}
              tooltip="Git Project"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={SparklesFreeIcons} className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Git Project</span>
                <span className="text-[10px] text-muted-foreground">
                  AI Project Ideas
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/" />} tooltip="Home">
                <HugeiconsIcon icon={Home01FreeIcons} className="size-4" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewGeneration}
                disabled={isGenerating}
                tooltip="New Generation"
              >
                {isGenerating ? (
                  <HugeiconsIcon
                    icon={Loading03FreeIcons}
                    className="size-4 animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={SparklesFreeIcons} className="size-4" />
                )}
                <span>{isGenerating ? 'Generating...' : 'New Generation'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>
            <HugeiconsIcon icon={Clock01FreeIcons} className="size-4 mr-2" />
            History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SignedIn>
              <GenerationHistoryList />
            </SignedIn>
            <SignedOut>
              <div className="px-2 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Sign in to view your history
                </p>
              </div>
            </SignedOut>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>
            <HugeiconsIcon icon={Message01FreeIcons} className="size-4 mr-2" />
            Chats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                Chat feature coming soon
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SignedIn>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'size-8',
                    },
                  }}
                />
                <span className="text-xs truncate group-data-[collapsible=icon]:hidden">
                  {user.user?.username ||
                    user.user?.emailAddresses[0].emailAddress}
                </span>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SignedIn>
      </SidebarFooter>
    </Sidebar>
  )
}
