import { InfiniteTable, type InfiniteTableColumn, Status, type StatusProps } from "@repo/ui"
import { relativeTime } from "@repo/utils"
import { useDestinationSyncRuns } from "../../../../../../domains/destinations/destinations.collection.ts"
import type { DestinationSyncRunRecord } from "../../../../../../domains/destinations/destinations.functions.ts"

const RUN_STATUS_BADGE: Record<DestinationSyncRunRecord["status"], { label: string; variant: StatusProps["variant"] }> =
  {
    succeeded: { label: "Sucesso", variant: "success" },
    failed: { label: "Falhou", variant: "destructive" },
  }

const RUN_TRIGGER_BADGE: Record<
  DestinationSyncRunRecord["trigger"],
  { label: string; variant: StatusProps["variant"] }
> = {
  live: { label: "Em tempo real", variant: "neutral" },
  backfill: { label: "Histórico", variant: "warning" },
}

const numberFormatter = new Intl.NumberFormat("en-US")

const columns: InfiniteTableColumn<DestinationSyncRunRecord>[] = [
  {
    key: "ran",
    header: "Execução",
    width: 130,
    minWidth: 110,
    render: (run) => (
      <span title={new Date(run.startedAt).toLocaleString()}>{relativeTime(new Date(run.startedAt))}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: 110,
    minWidth: 90,
    render: (run) => (
      <Status variant={RUN_STATUS_BADGE[run.status].variant} label={RUN_STATUS_BADGE[run.status].label} />
    ),
  },
  {
    key: "source",
    header: "Origem",
    width: 100,
    minWidth: 80,
    render: (run) => <span className="capitalize">{run.source}</span>,
  },
  {
    key: "trigger",
    header: "Tipo",
    width: 100,
    minWidth: 80,
    render: (run) => (
      <Status variant={RUN_TRIGGER_BADGE[run.trigger].variant} label={RUN_TRIGGER_BADGE[run.trigger].label} />
    ),
  },
  {
    key: "recordsRead",
    header: "Registros lidos",
    width: 120,
    minWidth: 100,
    align: "end",
    render: (run) => <span className="tabular-nums">{numberFormatter.format(run.recordsRead)}</span>,
  },
  {
    key: "eventsSent",
    header: "Eventos enviados",
    width: 110,
    minWidth: 90,
    align: "end",
    render: (run) => <span className="tabular-nums">{numberFormatter.format(run.eventsSent)}</span>,
  },
  {
    key: "eventsDropped",
    header: "Descartados",
    width: 90,
    minWidth: 80,
    align: "end",
    render: (run) => (
      <span
        className={
          run.eventsDropped > 0 ? "tabular-nums text-rose-600 dark:text-rose-400" : "tabular-nums text-muted-foreground"
        }
      >
        {numberFormatter.format(run.eventsDropped)}
      </span>
    ),
  },
  {
    key: "error",
    header: "Erro",
    width: 280,
    minWidth: 160,
    render: (run) => (
      <span className="block min-w-0 truncate text-xs text-muted-foreground" title={run.error ?? undefined}>
        {run.error ?? "—"}
      </span>
    ),
  },
]

/**
 * Inline sync-run history for one destination — last 25 runs, newest first,
 * with keyset infinite scroll for older runs. Mounted lazily when a
 * destination's runs panel is opened.
 */
export function DestinationRunsTable({ destinationId }: { readonly destinationId: string }) {
  const { runs, isLoading, infiniteScroll } = useDestinationSyncRuns({
    destinationId,
  })

  return (
    <InfiniteTable
      data={runs}
      isLoading={isLoading}
      columns={columns}
      getRowKey={(run) => run.id}
      infiniteScroll={infiniteScroll}
      scrollAreaLayout="fill"
      blankSlate="Nenhuma sincronização ainda."
    />
  )
}
