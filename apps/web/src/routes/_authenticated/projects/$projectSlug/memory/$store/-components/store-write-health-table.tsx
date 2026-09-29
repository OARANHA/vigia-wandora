import { InfiniteTable, type InfiniteTableColumn, type InfiniteTableSorting, Status, Text } from "@repo/ui"
import { formatCount } from "@repo/utils"
import { useMemo, useState } from "react"
import type { StoreInsightsRecord } from "../../../../../../../domains/memories/memories.functions.ts"
import { formatElapsed } from "../../-components/memory-formatters.ts"
import { recordDisplayLabel } from "../../-components/store-encoding.ts"

type StoreWriteHealthRecord = StoreInsightsRecord["writeHealth"][number]

const DEFAULT_SORTING: InfiniteTableSorting = { column: "writes", direction: "desc" }

const sortValue = (row: StoreWriteHealthRecord, column: string): number => {
  switch (column) {
    case "lastWrite":
      return Date.parse(row.lastWriteAt)
    case "noOps":
      return row.noOps
    case "reverted":
      return row.reverted ? 1 : 0
    default:
      return row.writes
  }
}

const end = (value: string) => <span className="tabular-nums">{value}</span>

export function StoreWriteHealthTable({
  records,
  isLoading,
  onSelectRecord,
}: {
  readonly records: readonly StoreWriteHealthRecord[]
  readonly isLoading: boolean
  readonly onSelectRecord: (recordId: string) => void
}) {
  const [sorting, setSorting] = useState<InfiniteTableSorting>(DEFAULT_SORTING)
  const nowMs = Date.now()
  const sorted = useMemo(() => {
    const direction = sorting.direction === "asc" ? 1 : -1
    return [...records].sort((a, b) => {
      const cmp = (sortValue(a, sorting.column) - sortValue(b, sorting.column)) * direction
      return cmp !== 0 ? cmp : a.recordId < b.recordId ? -1 : 1
    })
  }, [records, sorting])

  const columns: InfiniteTableColumn<StoreWriteHealthRecord>[] = [
    {
      key: "record",
      header: "Registro",
      minWidth: 200,
      render: (row) => (
        <span className="min-w-0 truncate font-mono text-[13px]" title={recordDisplayLabel(row.recordId)}>
          {recordDisplayLabel(row.recordId)}
        </span>
      ),
    },
    {
      key: "writes",
      header: "Gravações",
      align: "end",
      width: 88,
      sortKey: "writes",
      headerTooltip: "Total de eventos de criação, atualização e remoção deste registro no período.",
      render: (row) => end(formatCount(row.writes)),
    },
    {
      key: "lastWrite",
      header: "Última atualização",
      align: "end",
      width: 128,
      sortKey: "lastWrite",
      headerTooltip: "Há quanto tempo este registro foi gravado pela última vez (criação, atualização ou remoção).",
      render: (row) => end(`${formatElapsed(nowMs - Date.parse(row.lastWriteAt))} ago`),
    },
    {
      key: "noOps",
      header: "Sem alteração",
      align: "end",
      width: 92,
      sortKey: "noOps",
      headerTooltip: "Regravações que salvaram conteúdo idêntico, sem mudança efetiva.",
      render: (row) => end(formatCount(row.noOps)),
    },
    {
      key: "reverted",
      header: "Revertido",
      align: "end",
      width: 108,
      sortKey: "reverted",
      headerTooltip: "O conteúdo do registro voltou a um valor anterior (A→B→A).",
      render: (row) =>
        row.reverted ? (
          <Status variant="warning" label="Revertido" indicator={false} />
        ) : (
          <Text.H6 color="foregroundMuted">—</Text.H6>
        ),
    },
  ]

  return (
    <InfiniteTable
      data={sorted}
      isLoading={isLoading}
      columns={columns}
      getRowKey={(row) => row.recordId}
      sorting={sorting}
      defaultSorting={DEFAULT_SORTING}
      onSortChange={setSorting}
      scrollAreaLayout="intrinsic"
      className="max-h-96"
      onRowClick={(row) => onSelectRecord(row.recordId)}
      getRowAriaLabel={(row) => `Abrir ${recordDisplayLabel(row.recordId)}`}
      rowInteractionRole="button"
      blankSlate="Nenhuma gravação neste período"
    />
  )
}
