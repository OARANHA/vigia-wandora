import { FlaskConical, PlusIcon } from "lucide-react"
import { BlankSlate } from "../../../../../../components/blank-slate.tsx"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"

export function ExperimentsEmptyState({ onCreate }: { readonly onCreate: () => void }) {
  return (
    <BlankSlate
      icon={FlaskConical}
      title={ptBR.clientPages.experiments.emptyTitle}
      description={ptBR.clientPages.experiments.emptyDescription}
      action={{ label: ptBR.clientPages.experiments.create, icon: PlusIcon, onClick: onCreate }}
    />
  )
}
