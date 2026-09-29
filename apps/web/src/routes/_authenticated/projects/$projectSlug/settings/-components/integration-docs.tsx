import { Button, Icon, Text } from "@repo/ui"
import { BookOpen } from "lucide-react"
import { type IntegrationKey, integrationEntry } from "../../../../../../domains/integrations/integration-catalog.ts"

export function IntegrationDocsButton({
  integration,
  variant = "outline",
}: {
  readonly integration: IntegrationKey
  readonly variant?: "outline" | "ghost"
}) {
  const docsUrl = integrationEntry(integration).docsUrl
  if (!docsUrl) return null

  return (
    <Button asChild variant={variant} size="sm" className="shrink-0">
      <a href={docsUrl} target="_blank" rel="noreferrer">
        <Icon icon={BookOpen} size="sm" />
        Documentação
      </a>
    </Button>
  )
}

/** The footer every Connection card shares, so all six integrations link out the same way. */
export function IntegrationDocsFooter({ integration }: { readonly integration: IntegrationKey }) {
  if (!integrationEntry(integration).docsUrl) return null

  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-4">
      <Text.H6 color="foregroundMuted">Configuração e solução de problemas desta integração.</Text.H6>
      <IntegrationDocsButton integration={integration} />
    </div>
  )
}
