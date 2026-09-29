import { type AlertSeverity, DEFAULT_ESCALATION_SENSITIVITY, type MonitorMetric } from "@domain/shared"
import { Button, cn, Icon, Input, Select, type TabOption, Tabs, Text } from "@repo/ui"
import {
  ActivityIcon,
  CircleDollarSignIcon,
  DatabaseZapIcon,
  EqualApproximately,
  GaugeIcon,
  HashIcon,
  LineDotRightHorizontal,
  TimerIcon,
  TrendingUp,
  XIcon,
} from "lucide-react"
import { SeveritySelector } from "../../../../../../domains/alerts/severity-selector.tsx"
import {
  metricOptionId,
  metricThresholdUnitLabel,
  targetMetricOptions,
} from "../../../../../../domains/monitors/monitor-target.ts"
import { useSavedSearchesList } from "../../../../../../domains/saved-searches/saved-searches.collection.ts"
import {
  type AlertDraft,
  type AlertFieldErrors,
  type BaselineKind,
  type ComparisonMode,
  draftWithKind,
  kindsForDraft,
  type LookbackUnit,
  type MetricDirection,
  previewAlertSentence,
  type UserAlertKind,
  type WindowUnit,
} from "./alert-form-helpers.ts"
import { SavedSearchSourcePicker } from "./saved-search-source-picker.tsx"

// Sensitivity is an integer 1–6 (shared with the seasonal escalation detector).
const SENSITIVITY_MIN = 1
const SENSITIVITY_MAX = 6
// Field help copy — written so a non-engineer can predict what each control does.
const KIND_HELP: Record<UserAlertKind, string> = {
  "savedSearch.match": "Abre um incidente na primeira vez em que cada sessão correspondente é detectada",
  "savedSearch.threshold": "Abre um incidente quando os traces correspondentes atingem um limite",
  "savedSearch.escalating": "Abre um incidente quando os traces correspondentes permanecem elevados por um período contínuo",
  "monitor.match": "Abre um incidente na primeira vez em que cada sessão correspondente é detectada",
  "monitor.threshold": "Abre um incidente quando a métrica cruza um limite",
  "monitor.escalating": "Abre um incidente quando a métrica permanece elevada por um período contínuo",
}

// Monitors window on the activity axis while every other view is start-anchored, so the same
// filters can read differently here and on the dashboard. Say so wherever a monitor is created.
const TIME_AXIS_HELP = [
  "Monitores avaliam as sessões pela atividade mais recente, então uma sessão longa é verificada durante a execução e novamente ao terminar.",
  "Cada sessão gera no máximo um alerta, e qualquer intervalo fixo de datas da busca é ignorado.",
  "Dashboards e análises listam sessões pelo horário de início, então uma sessão que acabou de alertar pode aparecer mais atrás.",
].join(" ")

// Tab label + icon per kind. Saved-search exposes all three; a unified target
// exposes only threshold/escalating (kindsForDraft drops "match" for targets).
const TAB_FOR_KIND: Record<UserAlertKind, { label: string; icon: typeof EqualApproximately }> = {
  "savedSearch.match": { label: "Correspondência", icon: EqualApproximately },
  "savedSearch.threshold": { label: "Limite", icon: LineDotRightHorizontal },
  "savedSearch.escalating": { label: "Escalando", icon: TrendingUp },
  "monitor.match": { label: "Correspondência", icon: EqualApproximately },
  "monitor.threshold": { label: "Limite", icon: LineDotRightHorizontal },
  "monitor.escalating": { label: "Escalando", icon: TrendingUp },
}

const isMatchKind = (kind: UserAlertKind): boolean => kind === "savedSearch.match" || kind === "monitor.match"
const isEscalatingKind = (kind: UserAlertKind): boolean =>
  kind === "savedSearch.escalating" || kind === "monitor.escalating"

type MetricDimension = "count" | "errorRate" | "cacheHitRate" | "duration" | "cost" | "tokens"

const DIMENSION_META: Record<MetricDimension, { label: string; description: string; icon: typeof HashIcon }> = {
  count: {
    label: "Volume",
    description: "Quantidade de sessões correspondentes",
    icon: HashIcon,
  },
  errorRate: {
    label: "Erros",
    description: "Percentual de sessões correspondentes que falham",
    icon: ActivityIcon,
  },
  cacheHitRate: {
    label: "Taxa de acerto de cache",
    description: "Percentual de tokens de entrada atendidos pelo cache",
    icon: DatabaseZapIcon,
  },
  duration: {
    label: "Latência",
    description: "Quanto tempo as sessões correspondentes levam",
    icon: TimerIcon,
  },
  cost: {
    label: "Custo",
    description: "Custo das sessões correspondentes",
    icon: CircleDollarSignIcon,
  },
  tokens: {
    label: "Tokens",
    description: "Uso de tokens nas sessões correspondentes",
    icon: GaugeIcon,
  },
}

const aggregationLabel = (metric: MonitorMetric): string => {
  if (metric.kind === "count") return "Contagem"
  if (metric.kind === "errorRate") return "Taxa"
  if (metric.kind === "cacheHitRate") return "Taxa"
  if (metric.kind === "sum") return "Soma"
  if (metric.kind === "min") return "Mínimo"
  if (metric.kind === "max") return "Máximo"
  if (metric.kind === "avg") return "Média"
  return "Mediana"
}

const metricDimension = (metric: MonitorMetric): MetricDimension => {
  if (metric.kind === "count" || metric.kind === "errorRate" || metric.kind === "cacheHitRate") return metric.kind
  return metric.field
}

const canonicalDirection = (dimension: MetricDimension): MetricDirection =>
  dimension === "cacheHitRate" ? "below" : "above"

function MetricSelector({
  value,
  stream,
  onChange,
  disabled,
  countOnly = false,
}: {
  readonly value: MonitorMetric
  readonly stream: NonNullable<AlertDraft["target"]>["stream"]
  readonly onChange: (metric: MonitorMetric, direction?: MetricDirection) => void
  readonly disabled?: boolean
  readonly countOnly?: boolean
}) {
  const options = targetMetricOptions(stream)
  const selectedDimension = metricDimension(value)
  const dimensions = (["count", "errorRate", "cacheHitRate", "duration", "cost", "tokens"] as const).filter(
    (dimension) =>
      (!countOnly || dimension === "count") && options.some((option) => metricDimension(option.metric) === dimension),
  )
  const aggregations = options.filter((option) => metricDimension(option.metric) === selectedDimension)

  return (
    <div className="flex flex-col gap-2">
      <Text.H5M>Métrica</Text.H5M>
      <div className="grid grid-cols-2 gap-2">
        {dimensions.map((dimension) => {
          const meta = DIMENSION_META[dimension]
          const active = dimension === selectedDimension
          return (
            <button
              key={dimension}
              type="button"
              disabled={disabled}
              className={cn(
                "flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
                {
                  "border-primary bg-primary/5": active,
                  "hover:bg-muted": !active && !disabled,
                },
              )}
              onClick={() => {
                const next = options.find((option) => metricDimension(option.metric) === dimension)
                if (next) onChange(next.metric, canonicalDirection(dimension))
              }}
            >
              <Icon icon={meta.icon} size="sm" color={active ? "primary" : "foregroundMuted"} className="shrink-0" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <Text.H5M>{meta.label}</Text.H5M>
                <Text.H6 color="foregroundMuted">{meta.description}</Text.H6>
              </span>
            </button>
          )
        })}
      </div>
      {aggregations.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <Text.H6 color="foregroundMuted">Medida</Text.H6>
          <Tabs<string>
            variant="bordered"
            size="sm"
            {...(disabled ? { disabled: true } : {})}
            options={aggregations.map((option) => ({
              id: option.id,
              label: aggregationLabel(option.metric),
            }))}
            active={metricOptionId(value)}
            onSelect={(id) => {
              const next = aggregations.find((option) => option.id === id)
              if (next) onChange(next.metric)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

// Severity is a triage label: it sets the priority shown on the incidents this
// alert opens (incident lists, chart markers, notifications) — it doesn't
// change when or how the alert fires.
const SEVERITY_HELP: Record<AlertSeverity, string> = {
  low: "Abre incidentes com prioridade baixa. Informativo; revise quando puder.",
  medium: "Abre incidentes com prioridade média. Vale revisar em breve.",
  high: "Abre incidentes com prioridade alta. Exige atenção imediata.",
  urgent: "Abre incidentes como urgentes. Exige ação imediata.",
}

const COMPARISON_TABS: readonly TabOption<ComparisonMode>[] = [
  { id: "times", label: "Absoluto" },
  { id: "timesMoreThan", label: "Relativo" },
]

const TARGET_DIRECTION_OPTIONS: { label: string; value: MetricDirection }[] = [
  { label: "acima", value: "above" },
  { label: "abaixo", value: "below" },
]

const RELATIVE_DIRECTION_OPTIONS: { label: string; value: MetricDirection }[] = [
  { label: "vezes acima de", value: "above" },
  { label: "vezes abaixo de", value: "below" },
]

const BASELINE_KIND_OPTIONS: { label: string; value: BaselineKind }[] = [
  { label: "do período anterior", value: "period" },
  { label: "esperado", value: "expected" },
]

const LOOKBACK_UNIT_OPTIONS: { label: string; value: LookbackUnit }[] = [
  { label: "minutos", value: "minutes" },
  { label: "horas", value: "hours" },
  { label: "dias", value: "days" },
]

const LOOKBACK_MAX_BY_UNIT: Record<LookbackUnit, number> = {
  minutes: 59,
  hours: 23,
  days: 30,
}

const WINDOW_UNIT_OPTIONS: { label: string; value: WindowUnit }[] = [
  { label: "minutos", value: "minutes" },
  { label: "horas", value: "hours" },
  { label: "dias", value: "days" },
]

function FieldErrors({ errors }: { readonly errors?: readonly string[] | undefined }) {
  if (!errors?.length) return null
  return (
    <div className="mt-1 flex flex-col gap-1" role="alert">
      {errors.map((error) => (
        <Text.H6 key={error} color="destructive">
          {error}
        </Text.H6>
      ))}
    </div>
  )
}

function ThresholdWindowForm({
  value,
  onChange,
  disabled,
  errors,
}: {
  readonly value: AlertDraft
  readonly onChange: (patch: Partial<AlertDraft>) => void
  readonly disabled?: boolean
  readonly errors?: AlertFieldErrors | undefined
}) {
  const targetMode = value.target !== null
  const relative = value.comparison === "timesMoreThan"
  const expected = relative && value.baselineKind === "expected"
  const hasLookback = relative && !expected
  // Unified metric thresholds are floats (error rate 0.1, average latency…); counts are whole numbers.
  const amountStep = expected ? 1 : relative || targetMode ? 0.1 : 1
  const amountMin = expected ? SENSITIVITY_MIN : targetMode ? 0 : 1
  // Absolute thresholds carry the metric's display unit; relative ones are unitless multipliers.
  const absoluteUnit =
    targetMode && value.target && !relative ? metricThresholdUnitLabel(value.metric, value.target.stream) : null

  const amountInput = (
    <Input
      type="number"
      min={amountMin}
      max={expected ? SENSITIVITY_MAX : undefined}
      step={amountStep}
      value={value.amount}
      onChange={(event) => onChange({ amount: Number(event.target.value) })}
      onFocus={(event) => event.currentTarget.select()}
      size="sm"
      className="h-7 w-16"
      {...(disabled ? { disabled: true } : {})}
    />
  )

  const leadIn = targetMode ? "Alertar quando a métrica estiver" : "Alertar quando traces forem detectados"
  const lookbackMax = LOOKBACK_MAX_BY_UNIT[value.lookbackUnit]

  // The amount doubles as the sensitivity in expected mode; snap an out-of-range
  // count/factor onto a valid 1–6 default when switching so the field stays valid.
  const onBaselineKindChange = (baselineKind: BaselineKind) => {
    const needsSensitivityReset =
      baselineKind === "expected" &&
      (!Number.isInteger(value.amount) || value.amount < SENSITIVITY_MIN || value.amount > SENSITIVITY_MAX)
    onChange(needsSensitivityReset ? { baselineKind, amount: DEFAULT_ESCALATION_SENSITIVITY } : { baselineKind })
  }

  const onComparisonChange = (comparison: ComparisonMode) => {
    if (comparison === value.comparison) return
    if (comparison === "times") {
      onChange({ comparison, amount: targetMode ? 1 : 100 })
      return
    }
    onChange({ comparison, amount: 2, baselineKind: "period" })
  }

  const onLookbackUnitChange = (lookbackUnit: LookbackUnit) => {
    onChange({
      lookbackUnit,
      lookbackAmount: Math.min(value.lookbackAmount, LOOKBACK_MAX_BY_UNIT[lookbackUnit]),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex min-h-8 flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex h-8 items-center">
            <Text.H5M>Limite</Text.H5M>
          </div>
          <Tabs<ComparisonMode>
            variant="bordered"
            size="sm"
            {...(disabled ? { disabled: true } : {})}
            options={COMPARISON_TABS}
            active={value.comparison}
            onSelect={onComparisonChange}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Text.H5 color="foregroundMuted">{leadIn}</Text.H5>
          {targetMode && !relative ? (
            <Select<MetricDirection>
              name="direction"
              width="auto"
              options={TARGET_DIRECTION_OPTIONS}
              value={value.direction}
              onChange={(direction) => onChange({ direction })}
              size="small"
              {...(disabled ? { disabled: true } : {})}
            />
          ) : null}
          {amountInput}
          {absoluteUnit ? <Text.H5 color="foregroundMuted">{absoluteUnit}</Text.H5> : null}
          {!targetMode && !relative ? <Text.H5 color="foregroundMuted">vezes</Text.H5> : null}
          {targetMode && relative ? (
            <Select<MetricDirection>
              name="relativeDirection"
              width="auto"
              options={RELATIVE_DIRECTION_OPTIONS}
              value={value.direction}
              onChange={(direction) => onChange({ direction })}
              size="small"
              {...(disabled ? { disabled: true } : {})}
            />
          ) : null}
          {!targetMode && relative ? <Text.H5 color="foregroundMuted">vezes acima de</Text.H5> : null}
          {relative ? (
            <Select<BaselineKind>
              name="baselineKind"
              width="auto"
              options={BASELINE_KIND_OPTIONS}
              value={value.baselineKind}
              onChange={onBaselineKindChange}
              size="small"
              {...(disabled ? { disabled: true } : {})}
            />
          ) : null}
          {hasLookback ? (
            <Input
              type="number"
              min={1}
              max={lookbackMax}
              step={1}
              value={value.lookbackAmount}
              onChange={(event) =>
                onChange({
                  lookbackAmount: Math.max(1, Math.min(Number(event.target.value), lookbackMax)),
                })
              }
              onFocus={(event) => event.currentTarget.select()}
              size="sm"
              className="h-7 w-16"
              {...(disabled ? { disabled: true } : {})}
            />
          ) : null}
          {hasLookback ? (
            <Select<LookbackUnit>
              name="lookbackUnit"
              width="auto"
              options={LOOKBACK_UNIT_OPTIONS}
              value={value.lookbackUnit}
              onChange={onLookbackUnitChange}
              size="small"
              {...(disabled ? { disabled: true } : {})}
            />
          ) : null}
        </div>
        <FieldErrors errors={errors?.threshold} />
      </div>

      {isEscalatingKind(value.kind) ? (
        <div className="flex flex-col">
          <Text.H5M>Janela</Text.H5M>
          <div className="flex flex-wrap items-center gap-2 -mt-1">
            <Text.H5 color="foregroundMuted">Mantido por pelo menos</Text.H5>
            <Input
              type="number"
              min={1}
              value={value.windowAmount}
              onChange={(event) => onChange({ windowAmount: Number(event.target.value) })}
              onFocus={(event) => event.currentTarget.select()}
              size="sm"
              className="h-7 w-16"
              {...(disabled ? { disabled: true } : {})}
            />
            <Select<WindowUnit>
              name="windowUnit"
              width="auto"
              options={WINDOW_UNIT_OPTIONS}
              value={value.windowUnit}
              onChange={(windowUnit) => onChange({ windowUnit })}
              size="small"
              {...(disabled ? { disabled: true } : {})}
            />
          </div>
          <FieldErrors errors={errors?.window} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Controlled editor for a single alert. Saved-search mode shows the saved-search
 * picker; unified (tool/user/raw-stream) mode — when the draft has a `target` —
 * shows a read-only target chip and a metric selector. Switching the tab resets
 * the threshold/window fields.
 */
export function AlertCardForm({
  value,
  onChange,
  projectId,
  projectSlug,
  disabled,
  onRemove,
  errors,
  showSourcePicker = true,
  sourceName,
  metricReadonly = false,
  conditionsReadonly = false,
}: {
  readonly value: AlertDraft
  readonly onChange: (next: AlertDraft) => void
  readonly projectId: string
  readonly projectSlug: string
  readonly disabled?: boolean
  readonly onRemove?: () => void
  readonly errors?: AlertFieldErrors
  /** Hide the saved-search picker when the caller fixes the source (e.g. the search being created in the save-search modal). */
  readonly showSourcePicker?: boolean
  /** Preview-sentence name override for sources that don't exist yet (paired with `showSourcePicker: false`). */
  readonly sourceName?: string
  /** Lock the metric (set at creation; the firing path reads it off the monitor target). Used when editing an existing unified monitor. */
  readonly metricReadonly?: boolean
  /** Lock trigger type and threshold/window fields. Used when editing an existing monitor — only severity stays editable. */
  readonly conditionsReadonly?: boolean
}) {
  const targetMode = value.target !== null
  const conditionsLocked = disabled || conditionsReadonly
  const { data: savedSearches } = useSavedSearchesList(projectId, {
    enabled: showSourcePicker && !targetMode,
  })
  const savedSearchName =
    sourceName ?? (value.sourceId ? savedSearches.find((search) => search.id === value.sourceId)?.name : undefined)

  const set = (patch: Partial<AlertDraft>) => onChange({ ...value, ...patch })

  const kindTabs: readonly TabOption<UserAlertKind>[] = kindsForDraft(value).map((kind) => ({
    id: kind,
    label: TAB_FOR_KIND[kind].label,
    icon: <Icon icon={TAB_FOR_KIND[kind].icon} size="sm" />,
  }))

  const removeButton = (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRemove} aria-label="Remover condição">
      <Icon icon={XIcon} size="sm" color="foregroundMuted" />
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Tabs<UserAlertKind>
            variant="secondary"
            size="sm"
            {...(conditionsLocked ? { disabled: true } : {})}
            options={kindTabs}
            active={value.kind}
            onSelect={(kind) => onChange(draftWithKind(value, kind))}
          />
          {onRemove ? removeButton : null}
        </div>
        <Text.H6 color="foregroundMuted">{KIND_HELP[value.kind]}</Text.H6>
      </div>

      {targetMode && value.target && !isMatchKind(value.kind) ? (
        <MetricSelector
          value={value.metric}
          stream={value.target.stream}
          countOnly={isEscalatingKind(value.kind)}
          onChange={(metric, direction) => set(direction ? { metric, direction } : { metric })}
          {...(disabled || metricReadonly ? { disabled: true } : {})}
        />
      ) : null}

      {!targetMode && showSourcePicker ? (
        <SavedSearchSourcePicker
          projectId={projectId}
          projectSlug={projectSlug}
          value={value.sourceId}
          onChange={(sourceId) => set({ sourceId })}
          {...(disabled ? { disabled: true } : {})}
          {...(errors?.source ? { errors: [...errors.source] } : {})}
        />
      ) : null}

      {!isMatchKind(value.kind) ? (
        <ThresholdWindowForm
          value={value}
          onChange={set}
          errors={errors}
          {...(conditionsLocked ? { disabled: true } : {})}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="rounded-lg bg-muted/80 px-3 py-2 flex justify-start items-center">
          <Text.H6 color="foregroundMuted">{previewAlertSentence(value, savedSearchName)}</Text.H6>
        </div>
        <Text.H6 color="foregroundMuted">{TIME_AXIS_HELP}</Text.H6>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text.H5M>Severidade</Text.H5M>
        <SeveritySelector
          value={value.severity}
          onSelect={(severity) => set({ severity })}
          {...(disabled ? { disabled: true } : {})}
        />
        <Text.H6 color="foregroundMuted">{SEVERITY_HELP[value.severity]}</Text.H6>
      </div>
    </div>
  )
}
