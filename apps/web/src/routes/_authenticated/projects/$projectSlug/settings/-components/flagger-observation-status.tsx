import type { FlaggerCoverageRow } from "@domain/flaggers"
import { Button, Icon, Text, Tooltip } from "@repo/ui"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const SUB_DAY_WINDOW_MS = 36 * HOUR_MS

const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value)
const formatShare = (value: number) => `${Math.round(value * 100)}%`
const formatDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })

export interface FlaggerCoverageWindow {
  readonly fromIso: string
  readonly toIso: string
  readonly recordingSinceIso: string | null
  readonly sessionsBeforeRecording: number
}

const formatWindow = ({ fromIso, toIso }: FlaggerCoverageWindow): string => {
  const span = Math.max(0, Date.parse(toIso) - Date.parse(fromIso))
  if (span < SUB_DAY_WINDOW_MS) {
    const hours = Math.max(1, Math.round(span / HOUR_MS))
    return `${hours} ${hours === 1 ? "hora" : "horas"}`
  }
  const days = Math.round(span / DAY_MS)
  return `${days} ${days === 1 ? "dia" : "dias"}`
}

function CoverageMetric({
  label,
  value,
  context,
}: {
  readonly label: string
  readonly value: string
  readonly context?: string
}) {
  return (
    <div className="flex min-w-28 flex-col gap-0.5">
      <Text.H7 color="foregroundMuted">{label}</Text.H7>
      <Text.H6 className="tabular-nums">{value}</Text.H6>
      {context ? <Text.H7 color="foregroundMuted">{context}</Text.H7> : null}
    </div>
  )
}

const selectionSummary = (row: FlaggerCoverageRow): string => {
  const selections = [
    { label: "Determinística", count: row.selectionPaths.deterministic },
    { label: "Com indício", count: row.selectionPaths.hinted },
    { label: "Amostra uniforme", count: row.selectionPaths.uniformSample },
    { label: "Amostra aleatória", count: row.selectionPaths.ordinarySample },
  ]
    .filter(({ count }) => count > 0)
    .map(({ label, count }) => `${label} ${formatCount(count)}`)

  return selections.length > 0 ? selections.join(" · ") : "Nenhuma seleção registrada"
}

const limitationSummary = (row: FlaggerCoverageRow): string | null => {
  const limitations = [
    { label: "Ignoradas", count: row.selectionPaths.skipped },
    { label: "Limitadas por taxa", count: row.selectionPaths.rateLimited },
    { label: "Ainda não avaliadas", count: row.unscreenedSessions },
    { label: "Dados de amostragem incompletos", count: row.unknownSelectionProbability },
  ]
    .filter(({ count }) => count > 0)
    .map(({ label, count }) => `${label} ${formatCount(count)}`)

  return limitations.length > 0 ? limitations.join(" · ") : null
}

const recordingNote = (coverageWindow: FlaggerCoverageWindow): string | null => {
  if (coverageWindow.sessionsBeforeRecording === 0 || coverageWindow.recordingSinceIso === null) return null
  return `Os registros de avaliação começam em ${formatDay(coverageWindow.recordingSinceIso)}; ${formatCount(coverageWindow.sessionsBeforeRecording)} sessões mais antigas na janela solicitada não foram contabilizadas`
}

export function FlaggerObservationStatus({
  flaggerSlug,
  coverage,
  coverageWindow,
}: {
  readonly flaggerSlug: string
  readonly coverage: FlaggerCoverageRow
  readonly coverageWindow: FlaggerCoverageWindow
}) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = `${flaggerSlug}-observation-details`
  const rateLimited = coverage.selectionPaths.rateLimited > 0
  const limitations = limitationSummary(coverage)
  const note = recordingNote(coverageWindow)
  const observationSummary =
    coverage.eligibleSessions === 0
      ? "Aguardando sessões de produção"
      : `Observadas ${formatCount(coverage.examinedSessions)} de ${formatCount(coverage.eligibleSessions)} sessões · ${formatWindow(coverageWindow)}`

  return (
    <div className="flex flex-col gap-2">
      <Tooltip
        asChild
        side="top"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="w-fit px-1.5 font-normal"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((current) => !current)}
          >
            <span className="tabular-nums">{observationSummary}</span>
            {rateLimited ? <span className="text-warning-muted-foreground">· Limitado por taxa</span> : null}
            <Icon icon={expanded ? ChevronDownIcon : ChevronRightIcon} size="xs" color="foregroundMuted" />
          </Button>
        }
      >
        Mostra quanto tráfego elegível este avaliador inspecionou; abra para ver os detalhes.
      </Tooltip>

      {expanded ? (
        <div id={detailsId} className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-row flex-wrap gap-x-8 gap-y-3">
            <CoverageMetric label="Sessões elegíveis" value={formatCount(coverage.eligibleSessions)} />
            <CoverageMetric label="Avaliadas" value={formatCount(coverage.examinedSessions)} />
            <CoverageMetric
              label="Evidência utilizável"
              value={`${formatCount(coverage.readableSessions)} (${formatShare(coverage.readableShare)})`}
              context="Resultado completo e dados de amostragem"
            />
            <CoverageMetric
              label="Achados"
              value={formatCount(coverage.positiveFindings)}
              {...(coverage.positiveFindings > 0
                ? {
                    context: `${formatCount(coverage.calibrationReadyFindings)} com dados completos de amostragem`,
                  }
                : {})}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <Text.H7 color="foregroundMuted">Caminhos de avaliação</Text.H7>
            <Text.H6 color="foregroundMuted" className="tabular-nums">
              {selectionSummary(coverage)}
            </Text.H6>
          </div>
          {limitations ? (
            <div className="flex flex-col gap-0.5">
              <Text.H7 color="foregroundMuted">Observações indisponíveis</Text.H7>
              <Text.H6 color={rateLimited ? "warningMutedForeground" : "foregroundMuted"} className="tabular-nums">
                {limitations}
              </Text.H6>
            </div>
          ) : null}
          {note ? (
            <Text.H7 color="foregroundMuted" className="tabular-nums">
              {note}
            </Text.H7>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
