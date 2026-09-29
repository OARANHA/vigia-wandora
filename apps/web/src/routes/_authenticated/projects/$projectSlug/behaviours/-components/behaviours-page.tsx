import { customBehaviorFilterSetHasConditions, TAXONOMY_GARDENING_SAMPLE_LOOKBACK_DAYS } from "@domain/taxonomy"
import { Alert, Button, cn, Icon, Modal, Text, Tooltip, useToast } from "@repo/ui"
import { useNavigate } from "@tanstack/react-router"
import { ClockIcon, HourglassIcon, InfoIcon, Loader2Icon } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { TimeFilterDropdown } from "../../../../../../components/time-filter-dropdown.tsx"
import { useAnalyticsTimeWindow } from "../../../../../../domains/projects/use-analytics-time-window.ts"
import { useCustomBehaviorPreview } from "../../../../../../domains/taxonomy/custom-behaviors.collection.ts"
import type { CustomBehaviorRecord } from "../../../../../../domains/taxonomy/custom-behaviors.functions.ts"
import {
  useFacetAnswers,
  useFacetExtractionProgress,
  useFacetsList,
  useInvalidateBehaviorQueries,
  useStopBehavior,
} from "../../../../../../domains/taxonomy/facets.collection.ts"
import {
  type BehaviourSegment,
  useBehaviourCoverage,
  useProjectBehaviours,
} from "../../../../../../domains/taxonomy/taxonomy.collection.ts"
import type {
  BehaviourCoverageRecord,
  BehaviourMomentRangeRecord,
} from "../../../../../../domains/taxonomy/taxonomy.functions.ts"
import { ListingLayout as Layout } from "../../../../../../layouts/ListingLayout/index.tsx"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { useParamState } from "../../../../../../lib/hooks/useParamState.ts"
import { SessionDetailDrawer } from "../../-components/session-detail-drawer.tsx"
import type { useRouteProject } from "../../-route-data.ts"
import { type BehaviourScope, scopeTreeBehaviour } from "./behaviour-scope.ts"
import { findNodeById, findNodeByPath, isBehaviourTrajectoryMetric } from "./behaviour-tree-nav.ts"
import { GlobalEmptyState, isDemoProject } from "./behaviours-empty-state.tsx"
import { type BehaviourFormIntent, BehavioursScopeHeader } from "./behaviours-scope-header.tsx"
import { BehaviourDetailDrawer, BehavioursView } from "./behaviours-view.tsx"
import { RefineBehaviorModal } from "./refine-behavior-modal.tsx"

type RouteProject = ReturnType<typeof useRouteProject>

/**
 * Shown when a scoped view has no tree yet. Under the auto-garden model this is a
 * normal steady state (not enough sessions in the gardening window), not a
 * pre-Generate one, so it reads as "waiting for data", driven by the live
 * preview count, never a status badge or a red "failed". Copy adapts to the view:
 * a facet behavior is "analyzed", a topic behavior is "built"; a whole-project
 * behavior (no filter) counts recent sessions rather than "matching" ones.
 */
function ScopedTreeWaiting({ behaviour }: { readonly behaviour: CustomBehaviorRecord }) {
  const preview = useCustomBehaviorPreview(behaviour.projectId, behaviour.filterSet)
  const count = preview.data?.observationCount
  const threshold = preview.data?.minObservations
  const isFacetBehavior = behaviour.facetId !== null
  const hasFilter = customBehaviorFilterSetHasConditions(behaviour.filterSet)
  // A whole-project behavior has no filter, so the count is recent sessions in the
  // gardening window, not "matching" ones.
  const sessionsLabel = hasFilter
    ? "sessões correspondentes"
    : `sessões nos últimos ${TAXONOMY_GARDENING_SAMPLE_LOOKBACK_DAYS} dias`
  const scheduleLine = "Os grupos são criados automaticamente assim que houver sessões suficientes."

  // Not enough data yet: a normal steady state, driven by the preview.
  if (preview.data && !preview.data.isReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Icon icon={HourglassIcon} size="lg" color="foregroundMuted" />
        <Text.H4>{hasFilter ? "Aguardando sessões correspondentes" : "Aguardando sessões recentes"}</Text.H4>
        <Text.H5 color="foregroundMuted" centered className="max-w-md">
          {`Found ${(count ?? 0).toLocaleString()} of ${threshold} ${sessionsLabel} so far. `}
          {scheduleLine}
        </Text.H5>
      </div>
    )
  }

  // A gardening run is actually in flight right now — the only case a spinner is honest.
  if (behaviour.status === "generating") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Icon icon={Loader2Icon} size="md" color="foregroundMuted" className="animate-spin" />
        <Text.H4>{isFacetBehavior ? "Analisando sessões com este comportamento" : "Construindo este comportamento"}</Text.H4>
        <Text.H5 color="foregroundMuted" centered className="max-w-md">
          {isFacetBehavior
            ? "Estamos analisando suas sessões com este comportamento. Os grupos aparecem aqui assim que estiverem prontos."
            : "Estamos analisando as sessões correspondentes. Os grupos aparecem aqui assim que estiverem prontos."}
        </Text.H5>
      </div>
    )
  }

  // Enough data, but no run in flight: it's picked up by the next scheduled
  // sweep, which can be hours away, so it shows no spinner and sets that expectation.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon icon={ClockIcon} size="lg" color="foregroundMuted" />
      <Text.H4>Aguardando a próxima execução</Text.H4>
      <Text.H5 color="foregroundMuted" centered className="max-w-md">
        {count !== undefined ? `${count.toLocaleString()} ${sessionsLabel} found. ` : ""}
        Os grupos são criados em ciclos agendados e aparecem após a próxima execução, o que pode levar algumas horas.
      </Text.H5>
    </div>
  )
}

function HealthStat({
  label,
  value,
  sub,
  color,
}: {
  readonly label: string
  readonly value: string
  readonly sub?: string
  readonly color: "success" | "primary" | "warningMutedForeground"
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 text-center">
      <Text.H6 color="foregroundMuted" uppercase>
        {label}
      </Text.H6>
      <Text.H2 color={color} weight="bold">
        {value}
      </Text.H2>
      {sub ? <Text.H6 color="foregroundMuted">{sub}</Text.H6> : null}
    </div>
  )
}

/**
 * A read on behavior quality while it gardens: the share of sessions that produced a
 * usable answer, how varied those answers are, and the unclear rate. A high
 * unclear rate or a collapsed (near-single) answer set means the instructions
 * aren't discriminating. Surface that as a hint so the user can refine early
 * instead of waiting for a useless tree.
 */
function BehaviorHealthOverview({
  extracted,
  clear,
  unclear,
  distinctAnswers,
}: {
  readonly extracted: number
  readonly clear: number
  readonly unclear: number
  readonly distinctAnswers: number
}) {
  const clearPct = extracted > 0 ? Math.round((clear / extracted) * 100) : 0
  const unclearPct = extracted > 0 ? Math.round((unclear / extracted) * 100) : 0
  const hint =
    extracted >= 10 && unclear / extracted > 0.4
      ? "Muitas sessões ficaram sem resposta clara. As instruções podem estar específicas demais ou essas conversas não contêm a resposta."
      : clear >= 10 && distinctAnswers <= 2
        ? "Quase todas as sessões resultam na mesma resposta. Este comportamento pode estar amplo demais para separar as sessões."
        : null
  return (
    <div className="flex w-full max-w-xl flex-col gap-4 rounded-lg border border-border p-5">
      <div className="flex flex-row items-center justify-center gap-1.5">
        <Text.H4M>Como este comportamento está se saindo</Text.H4M>
        <Tooltip asChild trigger={<Icon icon={InfoIcon} size="sm" color="foregroundMuted" />}>
          <div className="flex max-w-xs flex-col gap-1.5">
            <span>Respostas claras: percentual das sessões analisadas em que o comportamento encontrou uma resposta utilizável.</span>
            <span>
              Respostas únicas: quantas respostas diferentes foram encontradas. Um número baixo indica pouca separação entre sessões.
            </span>
            <span>Sem clareza: percentual em que o comportamento não encontrou resposta na conversa.</span>
          </div>
        </Tooltip>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        <HealthStat
          label="Respostas claras"
          value={`${clearPct}%`}
          sub={`${clear.toLocaleString()} of ${extracted.toLocaleString()}`}
          color="success"
        />
        <HealthStat label="Respostas únicas" value={distinctAnswers.toLocaleString()} color="primary" />
        <HealthStat
          label="Sem clareza"
          value={`${unclearPct}%`}
          sub={unclear.toLocaleString()}
          color="warningMutedForeground"
        />
      </div>
      {hint ? <Alert variant="warning" description={hint} /> : null}
    </div>
  )
}

/**
 * Cold-start view for a behavior whose tree is still gardening: instead of a bare
 * spinner, show the extraction streaming in: a health read on the answers plus
 * the answers themselves, so the ~one-time-per-behavior wait is legible and the user
 * can judge (and refine) the behavior before the tree lands. Falls back to the plain
 * waiting state when there's no run in flight and nothing extracted yet.
 */
function BehaviorColdStartProgress({
  project,
  behaviour,
  onOpenSession,
  selectedSessionId,
}: {
  readonly project: RouteProject
  readonly behaviour: CustomBehaviorRecord
  readonly onOpenSession: (sessionId: string) => void
  readonly selectedSessionId: string
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const generating = behaviour.status === "generating"
  const preview = useCustomBehaviorPreview(behaviour.projectId, behaviour.filterSet)
  const progress = useFacetExtractionProgress(behaviour.projectId, behaviour.facetId, { enabled: generating })
  const answersQuery = useFacetAnswers(behaviour.projectId, behaviour.facetId, { enabled: generating })
  const { data: facets } = useFacetsList(behaviour.projectId)
  const stopBehavior = useStopBehavior()
  const invalidateBehaviorQueries = useInvalidateBehaviorQueries(behaviour.projectId)
  const [action, setAction] = useState<"stop" | "refine" | null>(null)
  const target = preview.data?.sessionCount
  const extracted = progress.data?.extractedCount ?? 0
  const clear = progress.data?.clearCount ?? 0
  const distinctAnswers = progress.data?.distinctAnswers ?? 0
  const unclear = Math.max(0, extracted - clear)
  const facet = facets.find((entry) => entry.id === behaviour.facetId)
  // Live inserts shift offset-based page edges, so a session can land on two
  // pages across refetches, so dedupe by id, keeping newest-first order.
  const answers = useMemo(() => {
    const seen = new Set<string>()
    const out: { sessionId: string; text: string }[] = []
    for (const page of answersQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.sessionId)) continue
        seen.add(item.sessionId)
        out.push(item)
      }
    }
    return out
  }, [answersQuery.data])

  if (!generating && extracted === 0) return <ScopedTreeWaiting behaviour={behaviour} />

  const confirmStop = async () => {
    try {
      await stopBehavior.mutateAsync({ customBehaviorId: behaviour.id })
      setAction(null)
      toast({ description: "Comportamento interrompido e removido." })
      // Leave the now-deleted view's route BEFORE invalidating, so it never
      // resolves to "not found".
      await navigate({ to: "/projects/$projectSlug/behaviours", params: { projectSlug: project.slug } })
      invalidateBehaviorQueries()
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  const pct = target && target > 0 ? Math.min(100, Math.round((extracted / target) * 100)) : null
  // A behavior re-created on a facet that was already extracted (its answers are
  // cached and reused) jumps straight to clustering. Nothing is being read, so
  // don't claim it is.
  const cached = target !== undefined && target > 0 && extracted >= target
  return (
    <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-8">
      <div className="flex w-full max-w-xl flex-col gap-3">
        <div className="flex flex-row items-center gap-2">
          <Icon icon={Loader2Icon} color="foregroundMuted" className="animate-spin" />
          <Text.H4>{cached ? "Agrupando suas sessões" : "Analisando suas sessões com este comportamento"}</Text.H4>
        </div>
        <Text.H5 color="foregroundMuted">
          {cached
            ? `Todas as ${extracted.toLocaleString()} sessões já foram analisadas para este comportamento. Estamos construindo os grupos agora e eles aparecerão assim que estiverem prontos.`
            : `Analisadas ${extracted.toLocaleString()}${target ? ` de ~${target.toLocaleString()}` : ""} sessões. Um novo comportamento é analisado uma vez; depois, os grupos aparecem assim que estiverem prontos.`}
        </Text.H5>
        {pct !== null && !cached ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        <div className="flex flex-row items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAction("refine")} disabled={!facet}>
            Refinar instruções
          </Button>
          <Button size="sm" variant="destructive-soft" onClick={() => setAction("stop")}>
            Interromper comportamento
          </Button>
        </div>
      </div>
      {extracted > 0 ? (
        <BehaviorHealthOverview
          extracted={extracted}
          clear={clear}
          unclear={unclear}
          distinctAnswers={distinctAnswers}
        />
      ) : null}
      {answers.length > 0 ? (
        <div className="flex w-full max-w-xl flex-col gap-1.5">
          <Text.H6 color="foregroundMuted">Respostas extraídas (clique para abrir a sessão)</Text.H6>
          <div className="flex flex-col gap-1">
            {answers.map((answer) => (
              <button
                type="button"
                key={answer.sessionId}
                onClick={() => onOpenSession(answer.sessionId)}
                className={cn(
                  "flex flex-row items-center rounded-md px-3 py-1.5 text-left transition-colors",
                  answer.sessionId === selectedSessionId
                    ? "bg-primary-muted ring-1 ring-primary/40"
                    : "bg-muted hover:bg-muted-foreground/15",
                )}
              >
                <Text.H6>{answer.text}</Text.H6>
              </button>
            ))}
          </div>
          {answersQuery.hasNextPage ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={() => void answersQuery.fetchNextPage()}
              disabled={answersQuery.isFetchingNextPage}
            >
              {answersQuery.isFetchingNextPage ? <Icon icon={Loader2Icon} size="sm" className="animate-spin" /> : null}
              Mostrar mais
            </Button>
          ) : null}
        </div>
      ) : null}
      {action === "stop" ? (
        <Modal
          open
          dismissible
          size="regular"
          onOpenChange={(next) => (next || stopBehavior.isPending ? undefined : setAction(null))}
          title="Interromper este comportamento?"
          description="Isso interrompe a análise e remove o comportamento. As respostas extraídas até agora serão descartadas. Você poderá criá-lo novamente depois."
          footer={
            <div className="flex w-full flex-row justify-between gap-2">
              <Button variant="outline" onClick={() => setAction(null)} disabled={stopBehavior.isPending}>
                Continuar analisando
              </Button>
              <Button variant="destructive" onClick={() => void confirmStop()} disabled={stopBehavior.isPending}>
                {stopBehavior.isPending ? <Icon icon={Loader2Icon} size="sm" className="animate-spin" /> : null}
                Interromper e remover
              </Button>
            </div>
          }
        >
          <Alert
            variant="destructive"
            description="A interrupção descarta permanentemente o trabalho feito até aqui. As respostas extraídas não poderão ser recuperadas."
          />
        </Modal>
      ) : null}
      {action === "refine" && facet ? (
        <RefineBehaviorModal
          project={project}
          customBehaviorId={behaviour.id}
          initialDraft={{ name: facet.name, description: facet.description, instructions: facet.instructions }}
          onClose={() => setAction(null)}
        />
      ) : null}
    </div>
  )
}

const coverageDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })

/**
 * Says out loud why the picker stops where it does. A facet lens groups sessions
 * only inside the windows it has been gardened over, and the alternative to
 * naming that band is a range control that silently answers a narrower question
 * than the one it was asked.
 */
function CoverageNote({ coverage }: { readonly coverage: BehaviourCoverageRecord }) {
  return (
    <Tooltip
      asChild
      side="bottom"
      trigger={
        <span className="flex cursor-default flex-row items-center gap-1 text-muted-foreground">
          <Icon icon={ClockIcon} size="sm" color="foregroundMuted" />
          <Text.H6 color="foregroundMuted">{`Coverage: ${coverageDay(coverage.fromIso)} – ${coverageDay(coverage.toIso)}`}</Text.H6>
        </span>
      }
    >
      <span className="block max-w-xs">
        This behavior only groups the sessions it has been analyzed over, so counts and trends outside this range would
        be incomplete. The range grows as it keeps running.
      </span>
    </Tooltip>
  )
}

/**
 * The single behaviours-tree page body, shared by the legacy global screen, the
 * topic behavior, every facet behavior, and every view. They differ only by
 * `customBehaviour` — it scopes the read to that slice and picks the empty state —
 * and by the `header` above the tree. This is the ONLY place the tree, the
 * segment/time chrome, and the detail drawer are wired.
 */
export function BehavioursTreeBody({
  project,
  customBehaviour,
  header,
}: {
  readonly project: RouteProject
  /** null = the whole-project topic tree (the online-routed one). */
  readonly customBehaviour: CustomBehaviorRecord | null
  readonly header?: ReactNode
}) {
  const [segment, setSegment] = useParamState("behaviourSegment", "all", {
    validate: (value): value is BehaviourSegment =>
      value === "all" || value === "new_this_week" || value === "spiking" || value === "high_escalation",
  })
  const [behaviourPathParam, setBehaviourPathParam] = useParamState("behaviourPath", "", { history: "push" })
  const [coldStartSessionId, setColdStartSessionId] = useState("")
  // A facet lens only has membership for the windows gardening wrote, so its
  // picker, chart and counts are all bounded by that band rather than offering a
  // range the slice cannot answer.
  const coverageQuery = useBehaviourCoverage({
    projectId: project.id,
    ...(customBehaviour?.facetId ? { customBehaviorId: customBehaviour.id, facetId: customBehaviour.facetId } : {}),
  })
  const coverage = coverageQuery.data
  const tw = useAnalyticsTimeWindow({
    project,
    fromKey: "behaviourTimeFrom",
    toKey: "behaviourTimeTo",
    ...(coverage ? { coverageFromIso: coverage.fromIso, coverageToIso: coverage.toIso } : {}),
  })
  const [momentMetric, setMomentMetric] = useParamState("behaviourMomentMetric", "")
  const [momentTurnFrom, setMomentTurnFrom] = useParamState("behaviourMomentTurnFrom", "")
  const [momentTurnTo, setMomentTurnTo] = useParamState("behaviourMomentTurnTo", "")
  const [momentTurnMax, setMomentTurnMax] = useParamState("behaviourMomentTurnMax", "")

  // All time on a covered lens is not unbounded — it is the covered band, and
  // sending it explicitly is what keeps the trend chart off the coverage ramp.
  const timeRange = useMemo(
    () =>
      tw.isAllTime && !coverage
        ? undefined
        : {
            ...(tw.listRange.fromIso ? { fromIso: tw.listRange.fromIso } : {}),
            toIso: tw.listRange.toIso,
          },
    [tw.isAllTime, tw.listRange, coverage],
  )

  const demoProject = isDemoProject(project)
  const { data, isLoading: treeLoading } = useProjectBehaviours({
    enabled: !coverageQuery.isLoading,
    projectId: project.id,
    dimension: "topic",
    segment,
    sortBy: "category",
    ...(timeRange ? { timeRange } : {}),
    ...(customBehaviour
      ? {
          customBehaviorId: customBehaviour.id,
          ...(customBehaviour.facetId ? { facetId: customBehaviour.facetId } : {}),
          poll: customBehaviour.status === "generating",
        }
      : { pollUntilTopics: demoProject && segment === "all" && !timeRange }),
  })
  const topics = data?.topics ?? []
  // Coverage bounds the range the tree is read over, so a tree read before it
  // resolves is a read of the wrong range — that wait is loading, not emptiness.
  const isLoading = treeLoading || coverageQuery.isLoading

  const momentRange = useMemo((): BehaviourMomentRangeRecord | undefined => {
    if (!isBehaviourTrajectoryMetric(momentMetric)) return undefined
    const fromTurn = Number(momentTurnFrom)
    const toTurn = Number(momentTurnTo)
    if (!Number.isInteger(fromTurn) || !Number.isInteger(toTurn) || fromTurn < 0 || toTurn < fromTurn) return undefined
    return { metric: momentMetric, fromTurn, toTurn }
  }, [momentMetric, momentTurnFrom, momentTurnTo])
  const setMomentRangeWithMax = (range: BehaviourMomentRangeRecord | undefined, maxTurn?: number) => {
    setMomentMetric(range?.metric ?? "")
    setMomentTurnFrom(range ? String(range.fromTurn) : "")
    setMomentTurnTo(range ? String(range.toTurn) : "")
    setMomentTurnMax(range && maxTurn !== undefined ? String(Math.max(maxTurn, range.toTurn)) : "")
  }
  const parsedMomentTurnMax = Number(momentTurnMax)
  const momentRangeMaxTurn =
    momentRange && Number.isInteger(parsedMomentTurnMax) && parsedMomentTurnMax >= momentRange.toTurn
      ? parsedMomentTurnMax
      : (momentRange?.toTurn ?? 0)

  const behaviourPath = useMemo(
    () => (behaviourPathParam ? behaviourPathParam.split(".").filter(Boolean) : []),
    [behaviourPathParam],
  )
  const setBehaviourPath = (path: readonly string[]) => setBehaviourPathParam(path.join("."))
  const activeBehaviourId = behaviourPath.at(-1)
  const activeNode = useMemo(() => {
    if (!activeBehaviourId) return null
    return findNodeByPath(topics, behaviourPath) ?? findNodeById(topics, activeBehaviourId)
  }, [activeBehaviourId, behaviourPath, topics])

  // Full empty state only when unfiltered; a filtered-empty tree still renders
  // BehavioursView (its table shows "No behaviors match the current filters").
  const showFullEmpty = !isLoading && topics.length === 0 && segment === "all" && !timeRange

  return (
    <Layout>
      <Layout.Content>
        {header}
        {showFullEmpty ? (
          customBehaviour ? (
            customBehaviour.facetId && !customBehaviorFilterSetHasConditions(customBehaviour.filterSet) ? (
              <BehaviorColdStartProgress
                project={project}
                behaviour={customBehaviour}
                onOpenSession={setColdStartSessionId}
                selectedSessionId={coldStartSessionId}
              />
            ) : (
              <ScopedTreeWaiting behaviour={customBehaviour} />
            )
          ) : (
            <GlobalEmptyState isDemoProject={demoProject} />
          )
        ) : (
          <BehavioursView
            topics={topics}
            projectId={project.id}
            isLoading={isLoading}
            segment={segment}
            behaviourPath={behaviourPath}
            timeFilter={
              <>
                <TimeFilterDropdown
                  {...(tw.pickerStartFrom ? { startTimeFrom: tw.pickerStartFrom } : {})}
                  {...(tw.pickerStartTo ? { startTimeTo: tw.pickerStartTo } : {})}
                  {...(coverage ? { minTime: coverage.fromIso, maxTime: coverage.toIso } : {})}
                  placeholder={coverage ? "Covered range" : "All time"}
                  onChange={tw.onTimeChange}
                />
                {coverage ? <CoverageNote coverage={coverage} /> : null}
              </>
            }
            timeRange={timeRange}
            momentRange={momentRange}
            {...(customBehaviour ? { customBehaviorId: customBehaviour.id } : {})}
            {...(customBehaviour?.facetId ? { facetId: customBehaviour.facetId } : {})}
            onSegmentChange={setSegment}
            onBehaviourPathChange={setBehaviourPath}
            onMomentRangeChange={setMomentRangeWithMax}
          />
        )}
      </Layout.Content>
      {activeNode ? (
        <Layout.Aside>
          <BehaviourDetailDrawer
            node={activeNode.node}
            parentName={activeNode.parent?.cluster.name ?? null}
            projectId={project.id}
            timeRange={timeRange}
            momentRange={momentRange}
            momentRangeMaxTurn={momentRangeMaxTurn}
            {...(customBehaviour ? { customBehaviorId: customBehaviour.id } : {})}
            {...(customBehaviour?.facetId ? { facetId: customBehaviour.facetId } : {})}
            onMomentRangeChange={setMomentRangeWithMax}
            onClose={() => {
              setBehaviourPath([])
              setMomentRangeWithMax(undefined)
            }}
          />
        </Layout.Aside>
      ) : coldStartSessionId ? (
        <Layout.Aside>
          <SessionDetailDrawer
            key={coldStartSessionId}
            projectId={project.id}
            sessionId={coldStartSessionId}
            onClose={() => setColdStartSessionId("")}
          />
        </Layout.Aside>
      ) : null}
    </Layout>
  )
}

/**
 * A behavior's page: its tree, under a header naming the behavior and listing its
 * views. Serves the topic behavior, every facet behavior, and every view — the
 * scope decides which slice the tree reads.
 */
export function BehavioursPage({
  project,
  scope,
  initialForm,
  onFormClose,
}: {
  readonly project: RouteProject
  readonly scope: BehaviourScope
  /** Route-driven form to open on mount (deep-link / entry point). */
  readonly initialForm?: BehaviourFormIntent
  readonly onFormClose?: () => void
}) {
  return (
    <BehavioursTreeBody
      project={project}
      customBehaviour={scopeTreeBehaviour(scope)}
      header={
        <BehavioursScopeHeader
          project={project}
          scope={scope}
          {...(initialForm ? { initialForm } : {})}
          {...(onFormClose ? { onFormClose } : {})}
        />
      }
    />
  )
}
