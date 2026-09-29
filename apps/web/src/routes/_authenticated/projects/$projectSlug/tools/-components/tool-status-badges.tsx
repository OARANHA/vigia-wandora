import { Status, Tooltip } from "@repo/ui"
import { formatCount } from "@repo/utils"
import type { ToolSummaryRecord } from "../../../../../../domains/tools/tools.functions.ts"
import { formatPercent, getToolStatuses, TOOL_CRITICAL_ERROR_RATE } from "./tool-formatters.ts"

export function ToolStatusBadges({ tool }: { readonly tool: ToolSummaryRecord }) {
  const statuses = getToolStatuses(tool)
  if (statuses.length === 0) return null

  return (
    <div className="flex shrink-0 items-center gap-1">
      {statuses.includes("unused") ? (
        <Tooltip asChild trigger={<Status variant="neutral" label="Não utilizada" />}>
          Definida e oferecida ao modelo {formatCount(tool.offeredCount)} vezes neste período, mas nunca chamada.
        </Tooltip>
      ) : null}
      {statuses.includes("failing") && tool.metrics ? (
        <Tooltip
          asChild
          trigger={
            <Status
              variant={tool.metrics.errorRate >= TOOL_CRITICAL_ERROR_RATE ? "destructive" : "warning"}
              label="Com falha"
            />
          }
        >
          {formatPercent(tool.metrics.errorRate)} das chamadas falharam neste período ({formatCount(tool.metrics.errors)} de{" "}
          {formatCount(tool.metrics.calls)}).
        </Tooltip>
      ) : null}
      {statuses.includes("noDefinition") ? (
        <Tooltip asChild trigger={<Status variant="neutral" label="Sem definição" />}>
          A ferramenta foi chamada, mas nenhum span de chat neste período trouxe sua definição.
        </Tooltip>
      ) : null}
    </div>
  )
}
