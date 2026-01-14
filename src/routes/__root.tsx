import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { shadcn } from '@clerk/themes'
import { Toaster } from 'sonner'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexReactClient } from 'convex/react'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Git Project',
      },
      {
        name: 'description',
        content: 'Git your next personalized project idea',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const context = useRouteContext({ from: Route.id })

  return (
    <ClerkProvider
      appearance={{
        theme: shadcn,
      }}
    >
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <html lang="en">
          <head>
            <HeadContent />
          </head>
          <body className="dark">
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>{children}</SidebarInset>
            </SidebarProvider>
            <Toaster theme="dark" position="bottom-right" richColors />
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
