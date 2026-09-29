import { Alert, Button, useLocalStorage } from "@repo/ui"
import { XIcon } from "lucide-react"

export function ToolsDiscoveryBanner({ projectId }: { readonly projectId: string }) {
  const { value: dismissed, setValue: setDismissed } = useLocalStorage<boolean>({
    key: `projects.tools.discovery-banner-dismissed.v1.${projectId}`,
    defaultValue: false,
  })
  if (dismissed) return null
  return (
    <Alert
      description="Detectamos estas ferramentas pelas definições nos spans de LLM. Nenhuma foi chamada neste período. Abra uma ferramenta para ver onde ela foi oferecida."
      cta={
        <Button variant="ghost" size="icon-xs" onClick={() => setDismissed(true)} aria-label="Fechar aviso">
          <XIcon className="h-4 w-4" />
        </Button>
      }
    />
  )
}
