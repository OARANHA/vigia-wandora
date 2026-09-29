import { cn, InfiniteTable, type InfiniteTableColumn, type InfiniteTableInfiniteScroll, Tooltip } from "@repo/ui"
import { formatCount, relativeTime } from "@repo/utils"
import { Link } from "@tanstack/react-router"
import { DatabaseIcon } from "lucide-react"
import type { ReactNode } from "react"
import { ptBR } from "../../../../../../lib/i18n/pt-BR.ts"
import type { MemoryStoreMetricsRecord } from "../../../../../../domains/memories/memories.functions.ts"
import {
  ListingLayout as Layout,
  listingLayoutIntrinsicScroll,
} from "../../../../../../layouts/ListingLayout/index.tsx"
import type { TableColumnOption } from "../../-components/columns-selector.tsx"
import {
  formatPercent,
  formatRatio,
  formatSignedCount,
  MEMORY_TREND_BUCKET_SECONDS,
  resolveMemoryTrendWindow,
} from "./memory-formatters.ts"
import { MemoryTrendBar } from "./memory-trend-bar.tsx"
import { encodeStoreSegment, storeDisplayLabel } from "./store-encoding.ts"

export const MEMORY_COLUMN_OPTIONS = [
  { id: "store", label: ptBR.clientPages.memory.columns.store, required: true },
  { id: "trend", label: ptBR.clientPages.memory.columns.trend },
  { id: "records", label: ptBR.clientPages.memory.columns.records },
  { id: "writes", label: ptBR.clientPages.memory.columns.writes },
  { id: "reads", label: ptBR.clientPages.memory.columns.reads },
  { id: "ratio", label: ptBR.clientPages.memory.columns.ratio },
  { id: "dead", label: ptBR.clientPages.memory.columns.dead },
  { id: "zeroHit", label: ptBR.clientPages.memory.columns.zeroHit },
  { id: "lastActivity", label: ptBR.clientPages.memory.columns.lastActivity },
  { id: "churn", label: ptBR.clientPages.memory.columns.churn, defaultHidden: true },
  { id: "netGrowth", label: ptBR.clientPages.memory.columns.netGrowth, defaultHidden: true },
  { id: "tokens", label: ptBR.clientPages.memory.columns.tokens, defaultHidden: true },
  { id: "sessions", label: ptBR.clientPages.memory.columns.sessions, defaultHidden: true },
  { id: "users", label: ptBR.clientPages.memory.columns.users, defaultHidden: true },
] as const satisfies readonly TableColumnOption[]

export type MemoryColumnId = (typeof MEMORY_COLUMN_OPTIONS)[number]["id"]

export interface MemoryStoresSorting {
  readonly column:
    | "records"
    | "tokens"
    | "sessions"
    | "users"
    | "writes"
    | "reads"
    | "ratio"
    | "dead"
    | "zeroHit"
    | "churn"
    | "lastActivity"
  readonly direction: "asc" | "desc"
}

export const DEFAULT_MEMORY_SORTING: MemoryStoresSorting = { column: "lastActivity", direction: "desc" }

const endValue = (child: ReactNode) => <span className="tabular-nums">{child}</span>

export function MemoryStoresView({
  stores,
  isLoading,
  sorting,
  visibleColumnIds,
  onSortChange,
  infiniteScroll,
  projectSlug,
  rangeFromIso,
  rangeToIso,
}: {
  readonly stores: readonly MemoryStoreMetricsRecord[]
  readonly isLoading: boolean
  readonly sorting: MemoryStoresSorting
  readonly visibleColumnIds: readonly MemoryColumnId[]
  readonly onSortChange: (sorting: MemoryStoresSorting) => void
  readonly infiniteScroll: InfiniteTableInfiniteScroll
  readonly projectSlug: string
  readonly rangeFromIso: string
  readonly rangeToIso: string
}) {
  // Same window the repository buckets the trend over, derived from the same range.
  const trendWindow = resolveMemoryTrendWindow(Date.parse(rangeFromIso), Date.parse(rangeToIso))
  const trendFromIso = new Date(trendWindow.fromMs).toISOString()
  const trendToIso = new Date(trendWindow.toMs).toISOString()

  const allColumns: readonly InfiniteTableColumn<MemoryStoreMetricsRecord>[] = [
    {
      key: "store",
      header: ptBR.clientPages.memory.columns.store,
      width: 300,
      minWidth: 220,
      render: (store) => (
        <div className="flex min-w-0 items-center gap-2">
          <DatabaseIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-[13px]",
              store.storeId === "" && "italic text-muted-foreground",
            )}
            title={storeDisplayLabel(store.storeId)}
          >
            {storeDisplayLabel(store.storeId)}
          </span>
        </div>
      ),
    },
    {
      key: "trend",
      header: ptBR.clientPages.memory.columns.trend,
      width: 176,
      minWidth: 140,
      render: (store) => (
        // The sparkline's positioned spans paint above the row's stretched link
        // and would swallow clicks — wrap it in its own link so clicking the
        // trend also opens the store.
        <Link
          to="/projects/$projectSlug/memory/$store"
          params={{ projectSlug, store: encodeStoreSegment(store.storeId) }}
          className="block"
          tabIndex={-1}
          aria-hidden
        >
          <MemoryTrendBar
            buckets={store.trend}
            fromIso={trendFromIso}
            toIso={trendToIso}
            bucketSeconds={MEMORY_TREND_BUCKET_SECONDS}
            height={36}
          />
        </Link>
      ),
    },
    {
      key: "records",
      header: ptBR.clientPages.memory.columns.records,
      width: 92,
      minWidth: 80,
      align: "end",
      sortKey: "records",
      render: (store) => endValue(formatCount(store.liveRecords)),
    },
    {
      key: "writes",
      header: ptBR.clientPages.memory.columns.writes,
      width: 90,
      minWidth: 80,
      align: "end",
      sortKey: "writes",
      render: (store) => endValue(formatCount(store.writes)),
    },
    {
      key: "reads",
      header: ptBR.clientPages.memory.columns.reads,
      width: 90,
      minWidth: 80,
      align: "end",
      sortKey: "reads",
      render: (store) => (
        <Tooltip asChild trigger={endValue(formatCount(store.reads))}>
          {formatCount(store.reads)} records retrieved across {formatCount(store.searches)} searches in this window.
        </Tooltip>
      ),
    },
    {
      key: "ratio",
      header: ptBR.clientPages.memory.columns.ratio,
      headerTooltip: "Registros lidos para cada registro gravado neste período.",
      width: 100,
      minWidth: 90,
      align: "end",
      sortKey: "ratio",
      render: (store) => (
        <Tooltip asChild trigger={endValue(formatRatio(store.reads, store.writes))}>
          {formatCount(store.reads)} reads per {formatCount(store.writes)} writes. Shows how often the store is read
          versus updated.
        </Tooltip>
      ),
    },
    {
      key: "dead",
      header: ptBR.clientPages.memory.columns.dead,
      headerTooltip: "Percentual de registros não lidos nos últimos ~120 dias.",
      width: 92,
      minWidth: 80,
      align: "end",
      sortKey: "dead",
      render: (store) =>
        store.liveRecords > 0 ? (
          <Tooltip asChild trigger={endValue(formatPercent(store.deadRecords / store.liveRecords))}>
            {formatCount(store.deadRecords)} of {formatCount(store.liveRecords)} live records have never been read.
          </Tooltip>
        ) : (
          endValue("-")
        ),
    },
    {
      key: "zeroHit",
      header: ptBR.clientPages.memory.columns.zeroHit,
      headerTooltip: "Percentual de buscas que não retornaram registros neste período.",
      width: 96,
      minWidth: 84,
      align: "end",
      sortKey: "zeroHit",
      render: (store) =>
        store.searches > 0 ? (
          <Tooltip asChild trigger={endValue(formatPercent(store.zeroHitSearches / store.searches))}>
            {formatCount(store.zeroHitSearches)} of {formatCount(store.searches)} searches returned nothing.
          </Tooltip>
        ) : (
          endValue("-")
        ),
    },
    {
      key: "lastActivity",
      header: ptBR.clientPages.memory.columns.lastActivity,
      width: 120,
      minWidth: 100,
      sortKey: "lastActivity",
      render: (store) => (store.lastActivityAt ? relativeTime(new Date(store.lastActivityAt)) : "-"),
    },
    {
      key: "churn",
      header: ptBR.clientPages.memory.columns.churn,
      headerTooltip: "Média de atualizações por registro neste período.",
      width: 90,
      minWidth: 80,
      align: "end",
      sortKey: "churn",
      render: (store) =>
        store.recordsTouched > 0 ? (
          <Tooltip
            asChild
            trigger={endValue(`${(store.updateEvents / store.recordsTouched).toFixed(1).replace(/\.0$/, "")}×`)}
          >
            {formatCount(store.updateEvents)} updates across {formatCount(store.recordsTouched)} records. Shows how
            often records get rewritten.
          </Tooltip>
        ) : (
          endValue("-")
        ),
    },
    {
      key: "netGrowth",
      header: ptBR.clientPages.memory.columns.netGrowth,
      headerTooltip: "Tokens adicionados ou removidos neste período.",
      width: 100,
      minWidth: 90,
      align: "end",
      render: (store) => (
        <Tooltip
          asChild
          trigger={
            <span
              className={cn(
                "tabular-nums",
                store.netGrowthTokens > 0 && "text-emerald-600 dark:text-emerald-400",
                store.netGrowthTokens < 0 && "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatSignedCount(store.netGrowthTokens)}
            </span>
          }
        >
          Live tokens gained or lost over this window.
        </Tooltip>
      ),
    },
    {
      key: "tokens",
      header: ptBR.clientPages.memory.columns.tokens,
      width: 100,
      minWidth: 90,
      align: "end",
      sortKey: "tokens",
      render: (store) => endValue(formatCount(store.liveTokens)),
    },
    {
      key: "sessions",
      header: ptBR.clientPages.memory.columns.sessions,
      width: 92,
      minWidth: 80,
      align: "end",
      sortKey: "sessions",
      render: (store) => endValue(formatCount(store.sessionCount)),
    },
    {
      key: "users",
      header: ptBR.clientPages.memory.columns.users,
      width: 84,
      minWidth: 72,
      align: "end",
      sortKey: "users",
      render: (store) => endValue(formatCount(store.userCount)),
    },
  ]

  const columnsById = new Map(allColumns.map((column) => [column.key, column]))
  const columns = visibleColumnIds.flatMap((columnId) => {
    const column = columnsById.get(columnId)
    return column ? [column] : []
  })

  return (
    <Layout.Body>
      <Layout.List>
        <InfiniteTable
          {...listingLayoutIntrinsicScroll.infiniteTable}
          data={stores}
          isLoading={isLoading}
          columns={columns}
          getRowKey={(store) => store.storeId}
          sorting={sorting}
          defaultSorting={DEFAULT_MEMORY_SORTING}
          onSortChange={(next) =>
            onSortChange({
              column: next.column as MemoryStoresSorting["column"],
              direction: next.direction as MemoryStoresSorting["direction"],
            })
          }
          infiniteScroll={infiniteScroll}
          renderRowLink={(store, props) => (
            <Link
              to="/projects/$projectSlug/memory/$store"
              params={{ projectSlug, store: encodeStoreSegment(store.storeId) }}
              aria-label={`Abrir armazenamento ${storeDisplayLabel(store.storeId)}`}
              {...props}
            />
          )}
          blankSlate={ptBR.clientPages.memory.noMatches}
        />
      </Layout.List>
    </Layout.Body>
  )
}
