import type { ToolCallHistogramBucket } from "@domain/spans"
import { Button, Chart, type ChartSeries, HistogramSkeleton, Icon, Skeleton, Text } from "@repo/ui"
import { formatCount } from "@repo/utils"
import { BarChart2, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"
import type { ToolsAnalyticsRecord } from "../../../../../../domains/tools/tools.functions.ts"
import { ChartHeader } from "../../-components/chart-header.tsx"
import { formatBucketLabel, formatPercent, getToolStatuses } from "./tool-formatters.ts"

const OK_CALLS_COLOR = "hsl(217 91% 60%)"
const FAILED_CALLS_COLOR = "hsl(0 70% 55%)"
const ERROR_RATE_COLOR = "hsl(35 90% 55%)"

function AggregationItem({
  label,
  value,
  isLoading,
  skeletonWidthClassName = "w-16",
}: {
  readonly label: string
  readonly value: string
  readonly isLoading?: boolean
  readonly skeletonWidthClassName?: string
}) {
  return (
    <div className="flex basis-[176px] min-w-[176px] shrink-0 flex-col gap-2">
      <Text.H6 color="foregroundMuted">{label}</Text.H6>
      {isLoading ? (
        <Skeleton className={`h-5 ${skeletonWidthClassName}`} />
      ) : (
        <Text.H5 color="foreground" className="tabular-nums">
          {value}
        </Text.H5>
      )}
    </div>
  )
}

function countWithShare(count: number, total: number): string {
  if (total === 0) return formatCount(count)
  return `${formatCount(count)} · ${formatPercent(count / total)}`
}

export function ToolsAnalyticsPanel({
  analytics,
  histogram,
  bucketSeconds,
  rangeFromIso,
  rangeToIso,
  isAllTime,
  isLoading,
}: {
  readonly analytics: ToolsAnalyticsRecord | undefined
  readonly histogram: readonly ToolCallHistogramBucket[]
  readonly bucketSeconds: number
  readonly rangeFromIso: string
  readonly rangeToIso: string
  readonly isAllTime: boolean
  readonly isLoading: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)

  const tiles = useMemo(() => {
    const totals = analytics?.totals ?? { traces: 0, sessions: 0, tracesWithToolCalls: 0, sessionsWithToolCalls: 0 }
    const tools = analytics?.tools ?? []
    const totalCalls = tools.reduce((sum, tool) => sum + (tool.metrics?.calls ?? 0), 0)
    const totalErrors = tools.reduce((sum, tool) => sum + (tool.metrics?.errors ?? 0), 0)
    const unusedCount = tools.filter((tool) => getToolStatuses(tool).includes("unused")).length
    return [
      { key: "tools", label: ptBR.clientPages.tools.toolCount, value: formatCount(tools.length) },
      { key: "calls", label: ptBR.clientPages.tools.toolCalls, value: formatCount(totalCalls) },
      { key: "errorRate", label: ptBR.clientPages.tools.columns.errorRate, value: totalCalls > 0 ? formatPercent(totalErrors / totalCalls) : "-" },
      {
        key: "traces",
        label: ptBR.clientPages.tools.tracesUsingTools,
        value: countWithShare(totals.tracesWithToolCalls, totals.traces),
      },
      {
        key: "sessions",
        label: ptBR.clientPages.tools.sessionsUsingTools,
        value: countWithShare(totals.sessionsWithToolCalls, totals.sessions),
      },
      { key: "unused", label: ptBR.clientPages.tools.unusedTools, value: formatCount(unusedCount) },
    ]
  }, [analytics])

  const categories = useMemo(
    () => histogram.map((bucket) => formatBucketLabel(bucket.bucketStart, bucketSeconds)),
    [histogram, bucketSeconds],
  )

  const series = useMemo<readonly ChartSeries[]>(
    () => [
      // Failed calls first: the first series of a stack renders at the
      // bottom, where a shared baseline makes error volumes comparable.
      {
        kind: "bar",
        name: ptBR.clientPages.tools.failedCalls,
        values: histogram.map((bucket) => bucket.errors),
        color: FAILED_CALLS_COLOR,
        axis: "left",
        stack: "calls",
      },
      {
        kind: "bar",
        name: ptBR.clientPages.tools.successfulCalls,
        values: histogram.map((bucket) => bucket.calls - bucket.errors),
        color: OK_CALLS_COLOR,
        axis: "left",
        stack: "calls",
      },
      {
        kind: "line",
        name: "Taxa de erro %",
        values: histogram.map((bucket) =>
          bucket.calls > 0 ? Math.round((bucket.errors / bucket.calls) * 1000) / 10 : 0,
        ),
        color: ERROR_RATE_COLOR,
        axis: "right",
        smooth: true,
      },
    ],
    [histogram],
  )

  if (collapsed) {
    return (
      <div className="flex flex-col rounded-lg bg-secondary">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Icon icon={BarChart2} size="sm" color="foregroundMuted" />
            <Text.H6 color="foregroundMuted">{ptBR.clientPages.tools.statistics}</Text.H6>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} aria-label="Expandir estatísticas">
            <Icon icon={ChevronDown} size="sm" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg bg-secondary">
      <div className="p-2">
        <div className="flex items-start gap-1 pr-2">
          <div className="relative min-w-0 flex-1">
            <div
              className="flex flex-row gap-3 overflow-x-auto p-4"
              onScroll={(e) => setShowLeftFade(e.currentTarget.scrollLeft > 0)}
            >
              {tiles.map((tile) => (
                <AggregationItem
                  key={tile.key}
                  label={tile.label}
                  value={tile.value}
                  isLoading={isLoading}
                  skeletonWidthClassName={tile.key === "traces" || tile.key === "sessions" ? "w-20" : "w-16"}
                />
              ))}
            </div>
            {showLeftFade && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-secondary to-transparent" />
            )}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-secondary to-transparent" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            aria-label="Recolher estatísticas"
            className="shrink-0"
          >
            <Icon icon={ChevronUp} size="sm" />
          </Button>
        </div>

        {isLoading ? (
          <div className="px-4 py-3">
            <HistogramSkeleton height={160} />
          </div>
        ) : histogram.length === 0 || histogram.every((bucket) => bucket.calls === 0) ? (
          <div className="flex w-full min-h-[80px] items-center justify-center px-4 py-3">
            <Text.H6 color="foregroundMuted">{ptBR.clientPages.tools.noCalls}</Text.H6>
          </div>
        ) : (
          <>
            <ChartHeader title={ptBR.clientPages.tools.callsOverTime} fromIso={rangeFromIso} toIso={rangeToIso} isAllTime={isAllTime} />
            <div className="px-4 py-3">
              <Chart
                categories={categories}
                series={series}
                height={160}
                xAxisLabelFontSize={10}
                ariaLabel={ptBR.clientPages.tools.callsOverTime}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
