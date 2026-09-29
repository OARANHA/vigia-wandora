import { Icon, Text } from "@repo/ui"
import { WrenchIcon } from "lucide-react"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"

export function ToolsEmptyState({ isLoading = false }: { readonly isLoading?: boolean }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="max-w-lg flex flex-col items-center gap-6 text-center">
        <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
          <Icon icon={WrenchIcon} size="lg" color="foregroundMuted" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Text.H3 centered>{isLoading ? ptBR.clientPages.tools.loadingTitle : ptBR.clientPages.tools.emptyTitle}</Text.H3>
          <Text.H5 color="foregroundMuted" centered>
            {isLoading
              ? ptBR.clientPages.tools.loadingDescription
              : ptBR.clientPages.tools.emptyDescription}
          </Text.H5>
        </div>
      </div>
    </div>
  )
}
