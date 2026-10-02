import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { ONBOARDING_STEPS, OnboardingFlow } from "./-components/onboarding-flow.tsx"
import { VIGIA_AGENT_STACK_IDS } from "./-components/vigia-connection.ts"
import { useRouteProject } from "./-route-data.ts"

const searchSchema = z.object({
  step: z.enum(ONBOARDING_STEPS).optional(),
  source: z.enum(VIGIA_AGENT_STACK_IDS).optional(),
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
        onOpenProjectTraces={async (targetProjectId) => {
          if (targetProjectId !== project.id) return
          await navigate({ to: "/projects/$projectSlug", params: { projectSlug } })
        }}
      />
    </div>
  )
}
