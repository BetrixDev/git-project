import {
  SignInButton,
  SignedIn,
  SignedOut,
  useAuth,
} from '@clerk/tanstack-react-start'
import {
  CodeFreeIcons,
  GitBranchFreeIcons,
  GithubFreeIcons,
  Loading03FreeIcons,
  Rocket01FreeIcons,
  SparklesFreeIcons,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ExpandableGenerateButton } from '@/components/expandable-generate-button'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { isLoaded } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Mobile sidebar trigger */}
      <div className="absolute top-4 left-4 z-20 md:hidden">
        <SidebarTrigger />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="landing-grid absolute inset-0" />
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-icon floating-icon-1">
          <HugeiconsIcon
            icon={GitBranchFreeIcons}
            className="size-8 text-primary/20"
          />
        </div>
        <div className="floating-icon floating-icon-2">
          <HugeiconsIcon
            icon={CodeFreeIcons}
            className="size-10 text-primary/15"
          />
        </div>
        <div className="floating-icon floating-icon-3">
          <HugeiconsIcon
            icon={Rocket01FreeIcons}
            className="size-6 text-primary/25"
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-8 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm">
            <HugeiconsIcon
              icon={SparklesFreeIcons}
              className="size-5 text-primary animate-pulse"
            />
            <span className="text-sm font-medium text-primary">
              AI-Powered Project Ideas
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6">
            <span className="text-foreground">Git a</span>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-chart-2 to-chart-1">
              {' '}
              Project
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-lg mx-auto leading-relaxed">
            Discover your next personalized project idea based on your GitHub
            profile, skills, and interests.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isLoaded ? (
              <button
                className="landing-btn-github group opacity-70 cursor-wait"
                disabled
              >
                <span className="landing-btn-glow" />
                <span className="relative flex items-center gap-3">
                  <HugeiconsIcon
                    icon={Loading03FreeIcons}
                    className="size-5 animate-spin"
                  />
                  <span>Loading...</span>
                </span>
              </button>
            ) : (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="landing-btn-github group">
                      <span className="landing-btn-glow" />
                      <span className="relative flex items-center gap-3">
                        <HugeiconsIcon
                          icon={GithubFreeIcons}
                          className="size-5"
                        />
                        <span>Continue with GitHub</span>
                      </span>
                    </button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <ExpandableGenerateButton />
                </SignedIn>
              </>
            )}
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-muted-foreground/60 text-sm">
            <div className="flex items-center gap-2">
              <span>Free for initial generation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
