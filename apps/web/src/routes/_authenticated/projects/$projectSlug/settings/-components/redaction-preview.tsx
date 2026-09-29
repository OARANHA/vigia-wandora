import type { RedactionSetting } from "@domain/shared"
import type { RedactionPreviewChange, RedactionPreviewResult } from "@domain/spans"
import { Button, Icon, Text, useToast } from "@repo/ui"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { previewRedaction } from "../../../../../../domains/projects/projects.functions.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"

const PREVIEW_LOCATION_LABELS: Readonly<Record<string, string>> = {
  Attributes: "Atributos",
  "Resource attributes": "Atributos do recurso",
  Metadata: "Metadata",
  "User id": "ID do usuário",
  "User email": "Email do usuário",
  "Status message": "Mensagem de status",
  "Tool input": "Entrada da ferramenta",
  "Tool output": "Saída da ferramenta",
  "Span events": "Eventos do span",
  "Input messages": "Mensagens de entrada",
  "Output messages": "Mensagens de saída",
  "System instructions": "Instruções do sistema",
  "Tool definitions": "Definições de ferramentas",
  Tags: "Tags",
}

const formatPreviewLocation = (location: string): string => PREVIEW_LOCATION_LABELS[location] ?? location
const formatPreviewLabel = (label: string): string =>
  label === "User identifiers" ? "Identificadores de usuário" : label

/**
 * Runs the policy currently on screen against spans already stored, and shows what it would remove.
 *
 * The only honest answer to "will this eat my tool outputs" before the first enforce: redaction is
 * destructive, applies only going forward, and there is no way to get content back. On demand
 * rather than automatic, because it reads real customer content.
 */
export function RedactionPreview({
  projectId,
  setting,
  disabled = false,
}: {
  readonly projectId: string
  /** The policy as edited, not as saved, so the preview answers for what is about to be applied. */
  readonly setting: RedactionSetting
  readonly disabled?: boolean
}) {
  const { toast } = useToast()
  const [result, setResult] = useState<RedactionPreviewResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const run = async () => {
    setIsRunning(true)
    try {
      setResult(await previewRedaction({ data: { projectId, redaction: setting } }))
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg bg-muted/30 p-5">
      <div className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Text.H5M>Testar em spans recentes</Text.H5M>
          <Text.H6 color="foregroundMuted">
            Executa esta política sobre spans já armazenados para mostrar o que seria removido. Nenhum dado é alterado.
          </Text.H6>
        </div>
        <Button variant="outline" disabled={disabled || isRunning} onClick={() => void run()} isLoading={isRunning}>
          {result ? "Executar novamente" : "Executar teste"}
        </Button>
      </div>

      {result ? <PreviewResult result={result} /> : null}
    </div>
  )
}

function PreviewResult({ result }: { readonly result: RedactionPreviewResult }) {
  if (result.spansSampled === 0) {
    return (
      <Text.H6 color="foregroundMuted">Este projeto ainda não tem spans armazenados, então não há o que testar.</Text.H6>
    )
  }

  return (
    <div className="flex flex-col gap-5 border-border border-t pt-4">
      <Text.H6 color="foregroundMuted">
        {result.spansAffected} de {result.spansSampled} spans recentes seriam alterados.
      </Text.H6>

      {result.labels.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Text.H6M>O que seria removido</Text.H6M>
          {result.labels.map((entry) => (
            <div key={formatPreviewLabel(entry.label)} className="flex flex-row items-baseline gap-2">
              <Text.H6 color={entry.matches === 0 ? "foregroundMuted" : "foreground"}>
                <span className="font-mono">{entry.label}</span>
              </Text.H6>
              <div className="min-w-0 flex-1 border-border border-b border-dashed" />
              {entry.matches === 0 ? (
                <Text.H6 color="warningMutedForeground">nenhuma correspondência</Text.H6>
              ) : (
                <Text.H6>{entry.matches}</Text.H6>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {result.changes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <Text.H6M>Alterações</Text.H6M>
          {result.changes.map((change) => (
            <ChangeRow key={`${formatPreviewLocation(change.location)}:${change.key ?? ""}:${change.before}`} change={change} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * One distinct change, however many spans carried it.
 *
 * Before and after sit on separate lines rather than as struck-through text run into its
 * replacement: the two values are often long, and a reader should not have to diff them by eye.
 */
function ChangeRow({ change }: { readonly change: RedactionPreviewChange }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-3">
      <div className="flex flex-row items-baseline justify-between gap-3">
        <Text.H6 color="foregroundMuted" ellipsis noWrap>
          {change.location}
          {change.key ? <span className="font-mono"> · {change.key}</span> : null}
        </Text.H6>
        <Text.H6 color="foregroundMuted" noWrap>
          {change.spans === 1 ? "1 span" : `${change.spans} spans`}
        </Text.H6>
      </div>

      <div className="flex flex-col gap-1 @[520px]:flex-row @[520px]:items-start @[520px]:gap-2">
        <Text.H6 color="foregroundMuted">
          <span className="break-all font-mono line-through">{change.before}</span>
        </Text.H6>
        <div className="shrink-0 pt-0.5">
          <Icon icon={ArrowRight} size="xs" color="foregroundMuted" />
        </div>
        <Text.H6>
          <span className="break-all font-mono">{change.after}</span>
        </Text.H6>
      </div>
    </div>
  )
}
