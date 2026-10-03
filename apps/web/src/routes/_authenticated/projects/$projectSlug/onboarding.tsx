import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { ONBOARDING_STEPS, OnboardingFlow } from "./-components/onboarding-flow.tsx"
import { VIGIA_AGENT_STACK_IDS } from "./-components/vigia-connection.ts"
import { useRouteProject } from "./-route-data.ts"

const searchSchema = z.object({
  step: z.enum(ONBOARDING_STEPS).optional(),
  source: z.enum(VIGIA_AGENT_STACK_IDS).optional(),
  elus_state: z.string().min(1).max(4096).optional(),
  elus_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/).optional(),
  elus_connected: z.literal("1").optional(),
})

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/onboarding")({
  validateSearch: searchSchema,
  component: ProjectOnboardingPage,
})

function ProjectOnboardingPage() {
  const { projectSlug } = Route.useParams()
  const project = useRouteProject()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const suggestedProjectName = project.name === "My project" ? "Meu agente" : project.name

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OnboardingFlow
        projectId={project.id}
        projectSlug={project.slug}
        projectName={suggestedProjectName}
        persistedProjectName={project.name}
        initialStep={search.step}
        initialBusinessProfile={project.settings.businessProfile}
        elusState={search.elus_state}
        elusCodeChallenge={search.elus_challenge}
        elusConnected={search.elus_connected === "1"}
        onOpenProjectTraces={async (targetProjectId) => {
          if (targetProjectId !== project.id) return
          await navigate({ to: "/projects/$projectSlug", params: { projectSlug } })
        }}
      />
    </div>
  )
}
