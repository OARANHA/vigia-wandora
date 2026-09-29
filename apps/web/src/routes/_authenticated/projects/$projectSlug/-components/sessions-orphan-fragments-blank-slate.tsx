import { Button, Icon, Text } from "@repo/ui"
import { MessagesSquareIcon } from "lucide-react"

export function SessionsOrphanFragmentsBlankSlate({ onShowAllSessions }: { readonly onShowAllSessions: () => void }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="max-w-lg flex flex-col items-center gap-6 text-center">
        <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
          <Icon icon={MessagesSquareIcon} size="lg" color="foregroundMuted" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Text.H3 centered>As sessões não têm atividade de LLM</Text.H3>
          <Text.H5 color="foregroundMuted" centered>
            O Vigia recebeu telemetria deste projeto, mas nenhuma sessão neste período contém chamada de LLM (sem tokens ou modelo registrados). Revise a instrumentação para garantir que os spans de LLM sejam capturados corretamente.
          </Text.H5>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={onShowAllSessions}>
            Mostrar todas as sessões
          </Button>
        </div>
      </div>
    </div>
  )
}
