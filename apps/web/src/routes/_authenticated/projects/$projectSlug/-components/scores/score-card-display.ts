const BUSINESS_EVENT_SOURCE_PREFIX = "vigia.business."

type ScoreCardBusinessEventInput = {
  readonly source: string
  readonly sourceId: string
  readonly passed?: boolean
  readonly metadata?: unknown
}

export interface ScoreCardBusinessEvent {
  readonly event: string
  readonly label: string
  readonly success: boolean
  readonly value?: number
  readonly currency?: string
  readonly occurredAt?: string
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export function scoreCardBusinessEvent(score: ScoreCardBusinessEventInput): ScoreCardBusinessEvent | null {
  if (score.source !== "custom" || !score.sourceId.startsWith(BUSINESS_EVENT_SOURCE_PREFIX)) return null

  const fallbackEvent = score.sourceId.slice(BUSINESS_EVENT_SOURCE_PREFIX.length)
  const metadata = asRecord(score.metadata)
  const vigia = asRecord(metadata?.vigia)
  if (vigia && vigia.kind !== "business_event") return null

  const event = typeof vigia?.event === "string" && vigia.event ? vigia.event : fallbackEvent
  if (!event) return null

  const label = typeof vigia?.label === "string" && vigia.label ? vigia.label : event
  const success = typeof vigia?.success === "boolean" ? vigia.success : Boolean(score.passed)
  const value = typeof vigia?.value === "number" && Number.isFinite(vigia.value) ? vigia.value : undefined
  const currency = typeof vigia?.currency === "string" && /^[A-Z]{3}$/.test(vigia.currency) ? vigia.currency : undefined
  const occurredAt = typeof vigia?.occurredAt === "string" ? vigia.occurredAt : undefined

  return {
    event,
    label,
    success,
    ...(value !== undefined ? { value } : {}),
    ...(currency !== undefined ? { currency } : {}),
    ...(occurredAt !== undefined ? { occurredAt } : {}),
  }
}

export function scoreCardBusinessValue(score: ScoreCardBusinessEventInput): string | null {
  const businessEvent = scoreCardBusinessEvent(score)
  if (!businessEvent || businessEvent.value === undefined) return null

  if (businessEvent.currency) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: businessEvent.currency,
      }).format(businessEvent.value)
    } catch {
      return `${businessEvent.currency} ${businessEvent.value}`
    }
  }

  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(businessEvent.value)
}

export function scoreCardSourceTitle(
  score: { readonly source: string; readonly sourceId: string; readonly passed?: boolean; readonly metadata?: unknown },
): string | null {
  if (score.source === "evaluation") return null
  return scoreCardBusinessEvent(score)?.label ?? score.sourceId
}

export function scoreCardLinkedSignalId(score: {
  readonly signalId: string | null
  readonly evaluationSignalId: string | null
}): string | null {
  return score.evaluationSignalId ?? score.signalId
}

export function scoreCardSignalLabel(signal: {
  readonly name: string | null
  readonly slug: string | null
}): string | null {
  return signal.name ?? signal.slug
}

export function scoreCardIsAbsentEvaluation(score: {
  readonly source: string
  readonly errored: boolean
  readonly passed: boolean
  readonly signalId: string | null
}): boolean {
  return score.source === "evaluation" && !score.errored && !score.passed && score.signalId === null
}

export function scoreCardShouldShowValue(score: {
  readonly source: string
  readonly sourceId?: string
  readonly metadata?: unknown
  readonly errored: boolean
  readonly passed: boolean
  readonly signalId: string | null
}): boolean {
  if (
    score.sourceId &&
    scoreCardBusinessEvent({
      source: score.source,
      sourceId: score.sourceId,
      passed: score.passed,
      metadata: score.metadata,
    })
  ) {
    return false
  }
  return !scoreCardIsAbsentEvaluation(score)
}

export function scoreCardShouldShowFeedback(score: {
  readonly source: string
  readonly errored: boolean
  readonly passed: boolean
  readonly signalId: string | null
  readonly feedback: string | null
}): boolean {
  if (scoreCardIsAbsentEvaluation(score)) return false
  return Boolean(score.feedback?.trim())
}

export function scoreCardEvaluationVerdict(score: {
  readonly source: string
  readonly errored: boolean
  readonly passed: boolean
}): "Present" | "Absent" | null {
  if (score.source !== "evaluation" || score.errored) return null
  return score.passed ? "Present" : "Absent"
}
