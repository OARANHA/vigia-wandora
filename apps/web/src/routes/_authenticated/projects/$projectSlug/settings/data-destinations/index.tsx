import { createFileRoute } from "@tanstack/react-router"
import { useRouteProject } from "../../-route-data.ts"
import { DestinationsSection } from "../-components/destinations-section.tsx"
import { SettingsPage } from "../-components/settings-page.tsx"

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/settings/data-destinations/")({
  component: DataDestinationsSettingsPage,
})

const PAGE_TITLE = "Destinos de dados"
const PAGE_DESCRIPTION =
  "Sincronize continuamente os dados deste projeto com seus próprios sistemas, como um data warehouse ou uma plataforma de analytics."

function DataDestinationsSettingsPage() {
  const project = useRouteProject()

  return (
    <SettingsPage title={PAGE_TITLE} description={PAGE_DESCRIPTION} fillHeight>
      <DestinationsSection projectId={project.id} projectSlug={project.slug} />
    </SettingsPage>
  )
}
