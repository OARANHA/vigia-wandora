import { InfiniteTable, type InfiniteTableColumn, Text, Tooltip } from "@repo/ui"
import { formatCount, formatDuration, relativeTime } from "@repo/utils"
import { Link, useNavigate } from "@tanstack/react-router"
import { WrenchIcon } from "lucide-react"
import { type RefObject, useCallback, useMemo } from "react"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"
import type { ToolSummaryRecord } from "../../../../../../domains/tools/tools.functions.ts"
import { ListingLayout as Layout } from "../../../../../../layouts/ListingLayout/index.tsx"
import { useListRowKeyboardNav } from "../../../../../../lib/hooks/useListRowKeyboardNav.ts"
import { formatPercent, TOOL_FAILING_ERROR_RATE } from "./tool-formatters.ts"
import { ToolStatusBadges } from "./tool-status-badges.tsx"
import { ToolTrendBar } from "./tool-trend-bar.tsx"

export const TOOLS_COLUMN_OPTIONS = [
  { id: "tool", label: ptBR.clientPages.tools.columns.tool, required: true },
  { id: "trend", label: ptBR.clientPages.tools.columns.trend },
  { id: "calls", label: ptBR.clientPages.tools.columns.calls },
  { id: "tracesPct", label: ptBR.clientPages.tools.columns.tracesPct },
  { id: "selectionRate", label: ptBR.clientPages.tools.columns.selectionRate },
  { id: "offered", label: ptBR.clientPages.tools.columns.offered },
  { id: "errorRate", label: ptBR.clientPages.tools.columns.errorRate },
  { id: "duration", label: ptBR.clientPages.tools.columns.duration },
  { id: "lastCalled", label: ptBR.clientPages.tools.columns.lastCalled },
] as const

export type ToolsColumnId = (typeof TOOLS_COLUMN_OPTIONS)[number]["id"]

export interface ToolsTableSorting {
  readonly column: "calls" | "tracesPct" | "selectionRate" | "offered" | "errorRate" | "duration" | "lastCalled"
  readonly direction: "asc" | "desc"
}

export const DEFAULT_TOOLS_SORTING: ToolsTableSorting = { column: "calls", direction: "desc" }

const SORT_BY_CALLS = (tool: ToolSummaryRecord): number => tool.metrics?.calls ?? -1

// A Map (not a plain object) so a sort column that somehow escaped URL-param
// validation looks up nothing instead of dispatching to an Object.prototype
// member (CodeQL js/unvalidated-dynamic-method-call).
const SORT_VALUE = new Map<ToolsTableSorting["column"], (tool: ToolSummaryRecord) => number>([
  ["calls", SORT_BY_CALLS],
  ["tracesPct", (tool) => tool.metrics?.traceUsageRate ?? -1],
  ["selectionRate", (tool) => tool.selectionRate ?? -1],
  ["offered", (tool) => tool.offeredCount],
  ["errorRate", (tool) => tool.metrics?.errorRate ?? -1],
  ["duration", (tool) => tool.metrics?.p95DurationNs ?? -1],
  ["lastCalled", (tool) => (tool.metrics ? Date.parse(tool.metrics.lastUsed) : -1)],
])

/** Client-side sort — the whole list is loaded in one query. */
export function sortTools(
  tools: readonly ToolSummaryRecord[],
  sorting: ToolsTableSorting,
): readonly ToolSummaryRecord[] {
  const getValue = SORT_VALUE.get(sorting.column) ?? SORT_BY_CALLS
  const sign = sorting.direction === "asc" ? 1 : -1
  return [...tools].sort((a, b) => {
    const diff = (getValue(a) - getValue(b)) * sign
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })
}

export function ToolsView({
  tools,
  isLoading,
  sorting,
  callsSum,
  visibleColumnIds,
  onSortChange,
  projectSlug,
  rangeFromIso,
  rangeToIso,
  trendBucketSeconds,
  focusedToolName,
  onFocusedToolChange,
  keyboardNavEnabled = true,
  scrollContainerRef,
}: {
  readonly tools: readonly ToolSummaryRecord[]
  readonly isLoading: boolean
  readonly sorting: ToolsTableSorting
  readonly callsSum: number
  readonly visibleColumnIds: readonly ToolsColumnId[]
  readonly onSortChange: (sorting: ToolsTableSorting) => void
  readonly projectSlug: string
  readonly rangeFromIso: string
  readonly rangeToIso: string
  readonly trendBucketSeconds: number
  readonly focusedToolName?: string | undefined
  readonly onFocusedToolChange?: (toolName: string | undefined) => void
  readonly keyboardNavEnabled?: boolean
  /** Shared ancestor scroll container for page-level scrolling + sticky headers. */
  readonly scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  const navigate = useNavigate()
  const toolNames = useMemo(() => tools.map((tool) => tool.name), [tools])

  const openTool = useCallback(
    (toolName: string) => {
      void navigate({ to: "/projects/$projectSlug/tools/$toolName", params: { projectSlug, toolName } })
    },
    [navigate, projectSlug],
  )

  useListRowKeyboardNav({
    rowIds: toolNames,
    focusedRowId: focusedToolName,
    onFocusedRowChange: (toolName) => onFocusedToolChange?.(toolName),
    onOpenRow: openTool,
    enabled: keyboardNavEnabled,
  })
  const allColumns: readonly InfiniteTableColumn<ToolSummaryRecord>[] = [
    {
      key: "tool",
      header: ptBR.clientPages.tools.columns.tool,
      width: 320,
      minWidth: 240,
      render: (tool) => (
        <div className="flex min-w-0 items-center gap-2">
          <WrenchIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Tooltip
            asChild
            trigger={
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]" title={tool.name}>
                {tool.name}
              </span>
            }
          >
            {tool.name}
          </Tooltip>
          <ToolStatusBadges tool={tool} />
        </div>
      ),
    },
    {
      key: "trend",
      header: ptBR.clientPages.tools.columns.trend,
      width: 176,
      minWidth: 176,
      render: (tool) => (
        // The sparkline's positioned spans paint above the row's stretched
        // link and would swallow clicks — wrap it in its own link so clicking
        // the trend also opens the tool.
        <Link
          to="/projects/$projectSlug/tools/$toolName"
          params={{ projectSlug, toolName: tool.name }}
          className="block"
          tabIndex={-1}
          aria-hidden
        >
          <ToolTrendBar
            buckets={tool.trend}
            fromIso={rangeFromIso}
            toIso={rangeToIso}
            bucketSeconds={trendBucketSeconds}
            height={36}
          />
        </Link>
      ),
    },
    {
      key: "calls",
      header: ptBR.clientPages.tools.columns.calls,
      width: 76,
      minWidth: 76,
      align: "end",
      sortKey: "calls",
      render: (tool) => (tool.metrics ? formatCount(tool.metrics.calls) : "-"),
      renderSubheader: () => (
        <div className="flex min-w-0 w-full items-center justify-end gap-0.5">
          <Text.H6 color="foregroundMuted" className="min-w-0 truncate tabular-nums">
            SUM
          </Text.H6>
          <Text.H6B color="foreground">{formatCount(callsSum)}</Text.H6B>
        </div>
      ),
    },
    {
      key: "tracesPct",
      header: ptBR.clientPages.tools.columns.tracesPct,
      width: 110,
      minWidth: 96,
      align: "end",
      sortKey: "tracesPct",
      render: (tool) =>
        tool.metrics ? (
          <Tooltip
            asChild
            trigger={
              <span className="tabular-nums">
                {formatPercent(tool.metrics.traceUsageRate)} · {formatCount(tool.metrics.tracesUsed)}
              </span>
            }
          >
            {formatCount(tool.metrics.tracesUsed)} traces neste período chamaram {tool.name} pelo menos uma vez.
          </Tooltip>
        ) : (
          "-"
        ),
    },
    {
      key: "selectionRate",
      header: ptBR.clientPages.tools.columns.selectionRate,
      width: 110,
      minWidth: 96,
      align: "end",
      sortKey: "selectionRate",
      render: (tool) =>
        tool.selectionRate !== null ? (
          <Tooltip asChild trigger={<span className="tabular-nums">{formatPercent(tool.selectionRate)}</span>}>
            Frequência com que o modelo escolhe esta ferramenta quando ela está disponível: {formatCount(tool.metrics?.calls ?? 0)} chamadas em {formatCount(tool.offeredCount)} interações de chat que a ofereceram. Pode passar de 100% quando uma única interação a chama várias vezes.
          </Tooltip>
        ) : (
          <Tooltip asChild trigger={<span>-</span>}>
            Chamadas por oferta exige definições da ferramenta nos spans de chat. Nenhuma foi encontrada para esta ferramenta.
          </Tooltip>
        ),
    },
    {
      key: "offered",
      header: ptBR.clientPages.tools.columns.offered,
      width: 100,
      minWidth: 90,
      align: "end",
      sortKey: "offered",
      render: (tool) =>
        tool.offeredCount > 0 ? (
          <Tooltip asChild trigger={<span className="tabular-nums">{formatCount(tool.offeredCount)}</span>}>
            <div className="flex flex-col gap-0.5">
              <span>
                {tool.name} foi oferecida ao modelo em {formatCount(tool.offeredCount)} interações de chat distribuídas por{" "}
                {formatCount(tool.offeredTraces)} traces.
              </span>
              {tool.lastOffered ? (
                <Text.H6 color="foregroundMuted">Última oferta {relativeTime(new Date(tool.lastOffered))}</Text.H6>
              ) : null}
            </div>
          </Tooltip>
        ) : (
          <Tooltip asChild trigger={<span>-</span>}>
            Nenhum span de chat neste período trouxe a definição desta ferramenta.
          </Tooltip>
        ),
    },
    {
      key: "errorRate",
      header: ptBR.clientPages.tools.columns.errorRate,
      width: 110,
      minWidth: 96,
      align: "end",
      sortKey: "errorRate",
      render: (tool) =>
        tool.metrics ? (
          <Tooltip
            asChild
            trigger={
              <span
                className={`tabular-nums ${tool.metrics.errorRate >= TOOL_FAILING_ERROR_RATE ? "text-rose-600 dark:text-rose-400" : ""}`}
              >
                {formatPercent(tool.metrics.errorRate)} · {formatCount(tool.metrics.errors)}
              </span>
            }
          >
            {formatCount(tool.metrics.errors)} de {formatCount(tool.metrics.calls)} chamadas de {tool.name} falharam.
          </Tooltip>
        ) : (
          "-"
        ),
    },
    {
      key: "duration",
      header: ptBR.clientPages.tools.columns.duration,
      width: 130,
      minWidth: 110,
      align: "end",
      sortKey: "duration",
      render: (tool) =>
        tool.metrics ? (
          <Tooltip
            asChild
            trigger={
              <span className="whitespace-nowrap tabular-nums">
                {formatDuration(tool.metrics.p50DurationNs)} / {formatDuration(tool.metrics.p95DurationNs)}
              </span>
            }
          >
            <div className="flex flex-col gap-0.5">
              <Text.H6 color="foregroundMuted">Duração de chamada p50 / p95</Text.H6>
              <Text.H6B>média {formatDuration(tool.metrics.avgDurationNs)}</Text.H6B>
            </div>
          </Tooltip>
        ) : (
          "-"
        ),
    },
    {
      key: "lastCalled",
      header: ptBR.clientPages.tools.columns.lastCalled,
      width: 100,
      minWidth: 90,
      sortKey: "lastCalled",
      render: (tool) =>
        tool.metrics ? (
          <Tooltip asChild trigger={<span className="truncate">{relativeTime(new Date(tool.metrics.lastUsed))}</span>}>
            <div className="flex flex-col gap-0.5">
              <Text.H6 color="foregroundMuted">Última chamada em</Text.H6>
              <Text.H6B>{new Date(tool.metrics.lastUsed).toLocaleString()}</Text.H6B>
            </div>
          </Tooltip>
        ) : (
          "-"
        ),
    },
  ]

  const columnsById = new Map(allColumns.map((column) => [column.key, column]))
  const columns = visibleColumnIds.flatMap((columnId) => {
    const column = columnsById.get(columnId)
    return column ? [column] : []
  })

  return (
    <Layout.Body className="flex-none overflow-visible">
      <Layout.List>
        <InfiniteTable
          scrollAreaLayout="external"
          scrollContainerRef={scrollContainerRef}
          data={tools}
          isLoading={isLoading}
          columns={columns}
          getRowKey={(tool) => tool.name}
          {...(focusedToolName ? { activeRowKey: focusedToolName, activeRowAutoScroll: true } : {})}
          renderRowLink={(tool, props) => (
            <Link
              to="/projects/$projectSlug/tools/$toolName"
              params={{ projectSlug, toolName: tool.name }}
              aria-label={`Abrir ${tool.name}`}
              {...props}
            />
          )}
          sorting={sorting}
          defaultSorting={DEFAULT_TOOLS_SORTING}
          onSortChange={(nextSorting) =>
            onSortChange({
              column: nextSorting.column as ToolsTableSorting["column"],
              direction: nextSorting.direction as ToolsTableSorting["direction"],
            })
          }
          blankSlate={ptBR.clientPages.tools.noMatches}
        />
      </Layout.List>
    </Layout.Body>
  )
}
