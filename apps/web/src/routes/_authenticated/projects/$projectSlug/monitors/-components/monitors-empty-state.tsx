import { BellPlusIcon, RadarIcon } from "lucide-react"
import { BlankSlate } from "../../../../../../components/blank-slate.tsx"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"

export function MonitorsEmptyState({ onCreate }: { readonly onCreate: () => void }) {
  return (
    <BlankSlate
      icon={RadarIcon}
      title={ptBR.clientPages.monitors.emptyTitle}
      description={ptBR.clientPages.monitors.emptyDescription}
      action={{ label: ptBR.clientPages.monitors.create, icon: BellPlusIcon, onClick: onCreate }}
    />
  )
}
