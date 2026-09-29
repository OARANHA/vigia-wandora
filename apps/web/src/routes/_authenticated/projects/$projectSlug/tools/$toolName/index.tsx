import { Button, Icon, Label, Skeleton, Status, Switch, Text, Tooltip } from "@repo/ui"
import { formatCount, formatDuration, relativeTime } from "@repo/utils"
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router"
import { ArrowLeftIcon, TextAlignStartIcon, WrenchIcon } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { toolMonitorTarget } from "../../../../../../domains/monitors/monitor-target.ts"
import { defaultProjectTimeWindowSeconds } from "../../../../../../domains/projects/default-time-window.ts"
import { useToolDetail } from "../../../../../../domains/tools/tools.collection.ts"
import { ListingLayout as Layout } from "../../../../../../layouts/ListingLayout/index.tsx"
import { useParamState } from "../../../../../../lib/hooks/useParamState.ts"
import { BreadcrumbLink, BreadcrumbSeparator, BreadcrumbText } from "../../../../-components/breadcrumb-ui.tsx"
import { useRouteProject } from "../../-route-data.ts"
import { TargetMonitorsMenu } from "../../monitors/-components/target-monitors-menu.tsx"
import { formatPercent, pickToolTrendBucketSeconds, TOOL_DETAIL_ROW_GRID } from "../-components/tool-formatters.ts"
import { ToolActivityRow } from "./-components/tool-activity-row.tsx"
import { ToolContextPanel } from "./-components/tool-context-panel.tsx"
import { ToolDefiningTraces } from "./-components/tool-defining-traces.tsx"
import { ToolDescription } from "./-components/tool-description.tsx"
import { ToolNeighborNav } from "./-components/tool-neighbor-nav.tsx"
import { ToolParametersExplorer } from "./-components/tool-parameters-explorer.tsx"
import { ToolRecentCalls } from "./-components/tool-recent-calls.tsx"

const toolDetailRoute = getRouteApi("/_authenticated/projects/$projectSlug/tools/$toolName/")

function ToolDetailBreadcrumb() {
  const { projectSlug, toolName } = toolDetailRoute.useParams()
  return (
    <>
      <BreadcrumbLink to="/projects/$projectSlug/tools" params={{ projectSlug }}>
        Tools
      </BreadcrumbLink>
      <BreadcrumbSeparator />
      <BreadcrumbText variant="current">{toolName}</BreadcrumbText>
    </>
  )
}

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/tools/$toolName/")({
  staticData: {
    breadcrumb: ToolDetailBreadcrumb,
  },
  component: ToolDetailPageContent,
})

function Tile({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <Text.H6 color="foregroundMuted">{label}</Text.H6>
      {children}
    </div>
  )
}

function MetricTile({
  label,
  value,
  tooltip,
  isLoading,
}: {
  readonly label: string
  readonly value: string
  readonly tooltip?: ReactNode
  readonly isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Tile label={label}>
        <Skeleton className="h-5 w-16" />
      </Tile>
    )
  }
  return (
    <Tile label={label}>
      {tooltip ? (
        <Tooltip asChild trigger={<Text.H5 color="foreground">{value}</Text.H5>}>
          {tooltip}
        </Tooltip>
      ) : (
        <Text.H5 color="foreground">{value}</Text.H5>
      )}
    </Tile>
  )
}

function ToolDetailPageContent() {
  const { projectSlug, toolName } = Route.useParams()
  const project = useRouteProject()
  const [timeFrom] = useParamState("toolsTimeFrom", "")
  const [timeTo] = useParamState("toolsTimeTo", "")
  const [errorsParam, setErrorsParam] = useParamState("toolErrors", "")
  const errorsOnly = errorsParam === "1"
  const [overlayActive, setOverlayActive] = useState(false)

  const range = useMemo(() => {
    const toMs = timeTo ? Date.parse(timeTo) : Date.now()
    const fromMs = timeFrom ? Date.parse(timeFrom) : toMs - defaultProjectTimeWindowSeconds(project) * 1000
    return { fromIso: new Date(fromMs).toISOString(), toIso: new Date(toMs).toISOString() }
  }, [timeFrom, timeTo, project])
  const trendBucketSeconds = useMemo(
    () => pickToolTrendBucketSeconds(Date.parse(range.toIso) - Date.parse(range.fromIso)),
    [range],
  )

  const { data: detail, isLoading } = useToolDetail({ projectId: project.id, toolName, range, errorsOnly })
  const usage = detail?.usage ?? null
  const errorsUsage = detail?.errorsUsage ?? null
  const definition = detail?.definition ?? null
  const notFound = !isLoading && detail !== undefined && usage === null && definition === null
  const definedButNeverCalled = !isLoading && detail !== undefined && usage === null && definition !== null

  return (
    <Layout>
      <Layout.Content>
        <Layout.Header
          title={
            <div className="flex min-w-0 flex-col gap-3">
              <Tooltip
                asChild
                side="bottom"
                trigger={
                  <Button asChild variant="ghost" size="sm" className="w-fit" aria-label="Voltar para ferramentas">
                    <Link to="/projects/$projectSlug/tools" params={{ projectSlug }}>
                      <Icon icon={ArrowLeftIcon} size="sm" />
                      Voltar
                    </Link>
                  </Button>
                }
              >
                Voltar para ferramentas
              </Tooltip>
              <div className="flex min-w-0 items-center gap-3">
                <WrenchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Text.H4M className="min-w-0 truncate font-mono">{notFound ? "Ferramenta não encontrada" : toolName}</Text.H4M>
              </div>
            </div>
          }
          actions={
            <>
              <ToolNeighborNav
                projectId={project.id}
                projectSlug={projectSlug}
                toolName={toolName}
                range={range}
                trendBucketSeconds={trendBucketSeconds}
                overlayActive={overlayActive}
              />
              <div className="mx-1 h-5 w-px bg-border" />
              <Label htmlFor="tool-errors-only" className="cursor-pointer">
                <Text.H6 color="foregroundMuted" noWrap>
                  Ver erros
                </Text.H6>
              </Label>
              <Switch
                id="tool-errors-only"
                checked={errorsOnly}
                onCheckedChange={(checked) => setErrorsParam(checked ? "1" : "")}
              />
              <div className="mx-1 h-5 w-px bg-border" />
              {/* w-auto: asChild lands the face's w-full on the Link, stretching it. */}
              <Button asChild variant="outline" size="sm" className="w-auto">
                <Link
                  to="/projects/$projectSlug"
                  params={{ projectSlug }}
                  search={{
                    tab: "sessions",
                    filters: JSON.stringify({
                      ...(definedButNeverCalled
                        ? { definedTools: [{ op: "in", value: [toolName] }] }
                        : { tools: [{ op: "in", value: [toolName] }] }),
                      startTime: [
                        { op: "gte", value: range.fromIso },
                        { op: "lte", value: range.toIso },
                      ],
                    }),
                    filtersOpen: true,
                  }}
                >
                  <Icon icon={TextAlignStartIcon} size="sm" />
                  Ver sessões
                </Link>
              </Button>
              {notFound ? null : (
                <>
                  <div className="mx-1 h-5 w-px bg-border" />
                  <TargetMonitorsMenu
                    projectId={project.id}
                    projectSlug={projectSlug}
                    stream="spans"
                    filterSetContains={{ toolName: [{ op: "eq", value: toolName }] }}
                    createTarget={toolMonitorTarget(toolName)}
                  />
                </>
              )}
            </>
          }
          description={
            isLoading ? undefined : definition?.definition?.description ? (
              <ToolDescription key={toolName} toolName={toolName} description={definition.definition.description} />
            ) : (
              <Text.H5 color="foregroundMuted" italic>
                {notFound
                  ? "Nenhuma definição ou chamada foi encontrada para esta ferramenta no período selecionado."
                  : "Definição não encontrada. A ferramenta foi chamada, mas nenhum span de chat neste período trouxe sua definição."}
              </Text.H5>
            )
          }
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 pt-2">
          {/* Usage — headline call metrics, scoped to failures when the
              errors-only switch is on (error rate stays global). */}
          <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-secondary p-4">
            <div className="flex items-center gap-2">
              <Text.H6 color="foregroundMuted">Uso</Text.H6>
              {errorsOnly ? <Status variant="destructive" label="somente chamadas com falha" /> : null}
            </div>
            {!isLoading && usage === null ? (
              <Text.H5 color="foregroundMuted">
                Nenhuma chamada neste período.
                {definition
                  ? ` Ela foi oferecida ao modelo ${formatCount(definition.offeredCount)} vezes, mas nunca selecionada.`
                  : ""}
              </Text.H5>
            ) : !isLoading && errorsOnly && errorsUsage === null ? (
              <Text.H5 color="foregroundMuted">
                Nenhuma chamada falhou neste período. Todas as {usage ? formatCount(usage.calls) : ""} chamadas foram bem-sucedidas.
              </Text.H5>
            ) : errorsOnly ? (
              <div className="flex flex-row flex-wrap gap-x-8 gap-y-4">
                <MetricTile
                  label="Chamadas com falha"
                  value={errorsUsage ? formatCount(errorsUsage.calls) : "-"}
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Traces afetados"
                  value={
                    errorsUsage
                      ? `${formatCount(errorsUsage.tracesUsed)} · ${formatPercent(errorsUsage.traceUsageRate)}`
                      : "-"
                  }
                  tooltip="Traces distintos com pelo menos uma chamada com falha desta ferramenta e sua participação no total do período."
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Sessões afetadas"
                  value={
                    errorsUsage
                      ? `${formatCount(errorsUsage.sessionsUsed)} · ${formatPercent(errorsUsage.sessionUsageRate)}`
                      : "-"
                  }
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Taxa de erro"
                  value={usage ? formatPercent(usage.errorRate) : "-"}
                  tooltip={
                    usage
                      ? `Considerando todas as chamadas neste período: ${formatCount(usage.errors)} de ${formatCount(usage.calls)} falharam.`
                      : null
                  }
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Duração"
                  value={
                    errorsUsage
                      ? `${formatDuration(errorsUsage.p50DurationNs)} / ${formatDuration(errorsUsage.p95DurationNs)}`
                      : "-"
                  }
                  tooltip={
                    errorsUsage ? `p50 / p95 das chamadas com falha (média ${formatDuration(errorsUsage.avgDurationNs)})` : null
                  }
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Última falha"
                  value={errorsUsage ? relativeTime(new Date(errorsUsage.lastUsed)) : "-"}
                  tooltip={errorsUsage ? new Date(errorsUsage.lastUsed).toLocaleString() : null}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="flex flex-row flex-wrap gap-x-8 gap-y-4">
                <MetricTile label="Chamadas" value={usage ? formatCount(usage.calls) : "-"} isLoading={isLoading} />
                <MetricTile
                  label="Traces que usam a ferramenta"
                  value={usage ? `${formatCount(usage.tracesUsed)} · ${formatPercent(usage.traceUsageRate)}` : "-"}
                  tooltip="Traces distintos com pelo menos uma chamada desta ferramenta e sua participação no total do período."
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Sessões que usam a ferramenta"
                  value={usage ? `${formatCount(usage.sessionsUsed)} · ${formatPercent(usage.sessionUsageRate)}` : "-"}
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Chamadas por oferta"
                  value={
                    definition && usage
                      ? formatPercent(definition.offeredCount > 0 ? usage.calls / definition.offeredCount : 0)
                      : "-"
                  }
                  tooltip={
                    definition
                      ? `Frequência com que o modelo escolhe esta ferramenta quando ela está disponível, em ${formatCount(definition.offeredCount)} ofertas. Pode passar de 100% quando uma mesma interação chama a ferramenta várias vezes.`
                      : "Chamadas por oferta exige definições de ferramenta nos spans de chat."
                  }
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Taxa de erro"
                  value={usage ? formatPercent(usage.errorRate) : "-"}
                  tooltip={usage ? `${formatCount(usage.errors)} de ${formatCount(usage.calls)} chamadas falharam.` : null}
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Duração"
                  value={
                    usage ? `${formatDuration(usage.p50DurationNs)} / ${formatDuration(usage.p95DurationNs)}` : "-"
                  }
                  tooltip={usage ? `p50 / p95 (média ${formatDuration(usage.avgDurationNs)})` : null}
                  isLoading={isLoading}
                />
                <MetricTile
                  label="Última chamada"
                  value={usage ? relativeTime(new Date(usage.lastUsed)) : "-"}
                  tooltip={usage ? new Date(usage.lastUsed).toLocaleString() : null}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>

          {/* Charts only make sense once the tool has calls. */}
          {usage !== null || isLoading ? (
            <ToolActivityRow
              projectId={project.id}
              toolName={toolName}
              range={range}
              bucketSeconds={trendBucketSeconds}
              errorsOnly={errorsOnly}
              failedCalls={errorsUsage?.calls ?? 0}
            />
          ) : null}
          <div className={TOOL_DETAIL_ROW_GRID}>
            {/* Parameters render even for never-called tools — the definition
                alone still lists what the tool accepts. */}
            <ToolParametersExplorer
              projectId={project.id}
              toolName={toolName}
              range={range}
              errorsOnly={errorsOnly}
              definitionJson={definition?.definitionJson ?? ""}
            />
            {usage !== null || isLoading ? (
              <ToolContextPanel
                projectId={project.id}
                projectSlug={projectSlug}
                toolName={toolName}
                range={range}
                toolTracesUsed={(errorsOnly ? errorsUsage?.tracesUsed : usage?.tracesUsed) ?? 0}
                errorsOnly={errorsOnly}
              />
            ) : null}
          </div>
          {usage !== null || isLoading ? (
            <ToolRecentCalls
              projectId={project.id}
              toolName={toolName}
              range={range}
              errorsOnly={errorsOnly}
              onOverlayActiveChange={setOverlayActive}
              headerAction={
                <Button asChild variant="outline" size="sm" className="w-auto">
                  <Link
                    to="/projects/$projectSlug"
                    params={{ projectSlug }}
                    search={{
                      tab: "sessions",
                      filters: JSON.stringify({
                        tools: [{ op: "in", value: [toolName] }],
                        startTime: [
                          { op: "gte", value: range.fromIso },
                          { op: "lte", value: range.toIso },
                        ],
                        ...(errorsOnly ? { status: [{ op: "in", value: ["error"] }] } : {}),
                      }),
                      filtersOpen: true,
                    }}
                  >
                    <Icon icon={TextAlignStartIcon} size="sm" />
                    Ver sessões
                  </Link>
                </Button>
              }
            />
          ) : definedButNeverCalled ? (
            <ToolDefiningTraces
              projectId={project.id}
              toolName={toolName}
              range={range}
              onOverlayActiveChange={setOverlayActive}
            />
          ) : null}
        </div>
      </Layout.Content>
    </Layout>
  )
}
