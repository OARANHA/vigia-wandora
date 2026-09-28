import { Toaster } from "@repo/ui"
import "@repo/ui/styles/globals.css"
import { HotkeysProvider } from "@tanstack/react-hotkeys"
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { lazy, Suspense } from "react"
import { ReadOnlyProjectModal } from "../components/read-only-project-modal.tsx"
import { getThemePreference } from "../domains/theme/theme.functions.ts"
import { ErrorFallback } from "../lib/client-error-reporting.tsx"
import { AppQueryProvider } from "../lib/data/query-client.tsx"
import { PostHogProvider } from "../lib/posthog/posthog-provider.tsx"
import { VIGIA_PRODUCT } from "../lib/product.ts"
import { useThemePreference } from "../lib/theme.ts"
import { useRootThemePreference } from "./-root-route-data.ts"

const AgentationToolbar = import.meta.env.DEV
  ? lazy(() => import("agentation").then((module) => ({ default: module.Agentation })))
  : null

export const Route = createRootRoute({
  errorComponent: ({ error, info, reset }) => (
    <ErrorFallback error={error} componentStack={info?.componentStack ?? null} reset={reset} variant="fullscreen" />
  ),
  loader: async () => {
    const theme = await getThemePreference()

    return { theme }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: VIGIA_PRODUCT.title },
      { name: "description", content: VIGIA_PRODUCT.description },
      { name: "color-scheme", content: "light dark" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: VIGIA_PRODUCT.appUrl },
      { property: "og:title", content: VIGIA_PRODUCT.title },
      { property: "og:description", content: VIGIA_PRODUCT.description },
      { property: "og:site_name", content: VIGIA_PRODUCT.name },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:url", content: VIGIA_PRODUCT.appUrl },
      { name: "twitter:title", content: VIGIA_PRODUCT.title },
      { name: "twitter:description", content: VIGIA_PRODUCT.description },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const initialTheme = useRootThemePreference()
  const { theme } = useThemePreference(initialTheme)

  return (
    <html
      lang="pt-BR"
      className={theme === "dark" ? "dark" : undefined}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider />
        <AppQueryProvider>
          <HotkeysProvider>{children}</HotkeysProvider>
          <ReadOnlyProjectModal />
          <Toaster />
          {AgentationToolbar !== null ? (
            <Suspense fallback={null}>
              <AgentationToolbar endpoint="http://localhost:4747" />
            </Suspense>
          ) : null}
        </AppQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
