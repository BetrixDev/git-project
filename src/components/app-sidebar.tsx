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
      <div className="px-3 py-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-transparent ring-1 ring-primary/10">
          <HugeiconsIcon
            icon={SparklesFreeIcons}
            className="size-4 text-primary/50"
          />
        </div>
        <p className="text-xs text-muted-foreground/70">No generations yet</p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">
          Generate your first project ideas!
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
                className={`sidebar-branch-item group/branch transition-all duration-200 ${isBranchActive ? 'bg-linear-to-r from-primary/10 to-transparent' : 'hover:bg-muted/40'}`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <div
                    className={`flex size-5 items-center justify-center rounded-md transition-all duration-200 ${isBranchGenerating ? 'bg-primary/20' : isBranchActive ? 'bg-primary/15 text-primary' : 'bg-muted/30 text-muted-foreground group-hover/branch:text-primary'}`}
                  >
                    {isBranchGenerating ? (
                      <HugeiconsIcon
                        icon={Loading03FreeIcons}
                        className="size-2.5 animate-spin text-primary"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={GitBranchIcon}
                        className="size-2.5"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0 overflow-hidden flex-1">
                    <span
                      className={`truncate text-[11px] ${isBranchActive ? 'font-medium text-foreground' : ''}`}
                    >
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
                    <span className="text-[9px] text-muted-foreground/60">
                      {isBranchGenerating ? (
                        <span className="text-primary/80 animate-pulse">
                          Creating ideas
                        </span>
                      ) : (
                        formatRelativeTime(branchDisplayTime)
                      )}
                    </span>
                  </div>
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
    <SidebarMenu className="gap-2">
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
              className={`sidebar-history-item group/item transition-all duration-200 ${isActive ? 'bg-linear-to-r from-primary/15 to-transparent ring-1 ring-primary/20' : 'hover:bg-linear-to-r hover:from-muted/60 hover:to-transparent'}`}
            >
              <div
                className={`flex size-7 items-center justify-center rounded-lg transition-all duration-200 ${isGenerating ? 'bg-primary/20 animate-pulse' : isActive ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground group-hover/item:bg-primary/15 group-hover/item:text-primary'}`}
              >
                {isGenerating ? (
                  <HugeiconsIcon
                    icon={Loading03FreeIcons}
                    className="size-3.5 animate-spin text-primary"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={SparklesFreeIcons}
                    className="size-3.5"
                  />
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                <span
                  className={`truncate text-[13px] ${isActive ? 'font-semibold text-foreground' : 'font-medium'}`}
                >
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
                <span className="text-[10px] text-muted-foreground/70">
                  {isGenerating ? (
                    <span className="text-primary animate-pulse">
                      Creating project ideas
                    </span>
                  ) : (
                    formatRelativeTime(displayTime)
                  )}
                </span>
              </div>
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
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/" />}
              tooltip="Git a Project"
              className="sidebar-header-btn group/header rounded-lg p-2"
            >
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                  Git a Project
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  AI Project Ideas
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewGeneration}
                disabled={isGenerating}
                tooltip="New Generation"
                className="group/gen transition-all duration-200 hover:bg-linear-to-r hover:from-primary/15 hover:to-transparent"
              >
                <div
                  className={`flex size-7 items-center justify-center rounded-lg transition-all duration-200 ${isGenerating ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary group-hover/gen:bg-primary/20 group-hover/gen:shadow-[0_0_12px_-3px] group-hover/gen:shadow-primary/40'}`}
                >
                  {isGenerating ? (
                    <HugeiconsIcon
                      icon={Loading03FreeIcons}
                      className="size-3.5 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={SparklesFreeIcons}
                      className="size-3.5 transition-transform duration-200 group-hover/gen:scale-110"
                    />
                  )}
                </div>
                <span
                  className={`font-medium ${isGenerating ? 'text-primary' : ''}`}
                >
                  {isGenerating ? 'Generating...' : 'New Generation'}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-muted/30">
              <HugeiconsIcon
                icon={Clock01FreeIcons}
                className="size-3 text-muted-foreground/70"
              />
            </div>
            History
          </SidebarGroupLabel>
          <SidebarGroupContent className="sidebar-history-container">
            <SignedIn>
              <GenerationHistoryList />
            </SignedIn>
            <SignedOut>
              <div className="px-3 py-6 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted/30">
                  <HugeiconsIcon
                    icon={Clock01FreeIcons}
                    className="size-4 text-muted-foreground/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Sign in to view your history
                </p>
              </div>
            </SignedOut>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-muted/30">
              <HugeiconsIcon
                icon={Message01FreeIcons}
                className="size-3 text-muted-foreground/70"
              />
            </div>
            Chats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-6 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/10 to-transparent ring-1 ring-primary/10">
                <HugeiconsIcon
                  icon={Message01FreeIcons}
                  className="size-4 text-primary/50"
                />
              </div>
              <p className="text-xs text-muted-foreground/70">
                Chat feature coming soon
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50">
        <SignedIn>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="sidebar-user-card flex items-center gap-3 px-2 py-2 rounded-xl bg-linear-to-r from-muted/40 to-transparent ring-1 ring-border/50 transition-all duration-200 hover:from-muted/60 hover:ring-border">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'size-9 ring-2 ring-primary/20',
                    },
                  }}
                />
                <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                  <span className="text-xs font-medium truncate">
                    {user.user?.username ||
                      user.user?.emailAddresses[0].emailAddress}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 truncate">
                    Free tier
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SignedIn>
      </SidebarFooter>
    </Sidebar>
  )
}
