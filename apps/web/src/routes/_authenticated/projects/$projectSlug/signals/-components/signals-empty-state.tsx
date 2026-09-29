import { Button, Icon, Text } from "@repo/ui"
import { PlusIcon, SearchAlert } from "lucide-react"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"

export function SignalsEmptyState({
  isLoading = false,
  onCreate,
}: {
  readonly isLoading?: boolean
  readonly onCreate?: () => void
}) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="max-w-lg flex flex-col items-center gap-6 text-center">
        <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
          <Icon icon={SearchAlert} size="lg" color="foregroundMuted" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Text.H3 centered>{isLoading ? ptBR.clientPages.signals.loadingTitle : ptBR.clientPages.signals.emptyTitle}</Text.H3>
          <Text.H5 color="foregroundMuted" centered>
            {isLoading
              ? ptBR.clientPages.signals.loadingDescription
              : ptBR.clientPages.signals.emptyDescription}
          </Text.H5>
        </div>
        {!isLoading ? (
          <div className="flex items-center gap-2">
            {onCreate ? (
              <Button onClick={onCreate}>
                <Icon size="sm" icon={PlusIcon} />
                {ptBR.clientPages.signals.create}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
