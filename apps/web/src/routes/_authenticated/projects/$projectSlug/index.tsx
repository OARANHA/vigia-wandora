import { createFileRoute } from "@tanstack/react-router"
import { ptBR } from "../../../../lib/i18n/pt-BR.ts"
import { BreadcrumbText } from "../../-components/breadcrumb-ui.tsx"
import { ProjectExplorer } from "./-components/project-explorer.tsx"

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/")({
  staticData: {
    breadcrumb: () => <BreadcrumbText variant="current">{ptBR.clientShell.sections.sessions}</BreadcrumbText>,
  },
  component: SessionsPage,
})

function SessionsPage() {
  const { projectSlug } = Route.useParams()
  return <ProjectExplorer projectSlug={projectSlug} />
}
