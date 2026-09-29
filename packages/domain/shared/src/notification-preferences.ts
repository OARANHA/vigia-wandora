import { z } from "zod"
import { alertSeveritySchema, type IncidentNotificationKey } from "./alert-incident-kinds.ts"

/**
 * User-visible groupings. The preferences UI surfaces one toggle per group;
 * adding a new kind to an existing group inherits the user's current
 * setting automatically. Adding a new group = a new toggle for users.
 *
 * Lives in `@domain/shared` (not `@domain/notifications`) so the user
 * entity can carry typed preferences without introducing a circular
 * package dep with `@domain/notifications`.
 */
export const NOTIFICATION_GROUPS = [
  "signals",
  "monitors",
  "wrapped_reports",
  "agent_score",
  "custom_messages",
  "personal",
  "destinations",
  "billing",
] as const
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number]
export const notificationGroupSchema = z.enum(NOTIFICATION_GROUPS)

/**
 * Sub-toggles inside a group, for groups whose kinds are distinct enough
 * that one switch is too coarse. A topic is only ever offered under the
 * group that declares it in `NOTIFICATION_GROUP_META`.
 */
export const NOTIFICATION_TOPICS = [
  "signal.discovered",
  "signal.escalating",
  "signal.regressed",
  "signal.reprioritized",
] as const
export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number]
export const notificationTopicSchema = z.enum(NOTIFICATION_TOPICS)

export const NOTIFICATION_TOPIC_META: Record<
  NotificationTopic,
  {
    readonly label: string
    readonly description: string
    /**
     * Whether a recipient who never touched the topic's switch receives it.
     * Low-signal topics ship off so enabling them is a deliberate opt-in;
     * the stored preference always wins over this default.
     */
    readonly defaultEnabled: boolean
  }
> = {
  "signal.discovered": {
    label: "Novos sinais",
    description: "Um sinal ainda não observado aparece pela primeira vez.",
    defaultEnabled: true,
  },
  "signal.escalating": {
    label: "Sinais em escalada",
    description: "Um sinal existente escala para um incidente.",
    defaultEnabled: true,
  },
  "signal.regressed": {
    label: "Sinais recorrentes",
    description: "Um sinal já resolvido volta a acontecer.",
    defaultEnabled: true,
  },
  "signal.reprioritized": {
    label: "Sinais repriorizados",
    description: "Um sinal existente é promovido para uma prioridade maior.",
    defaultEnabled: false,
  },
}

/**
 * Which group an incident notification belongs to. The three `incident.*`
 * kinds fire for both signal escalations and monitors, so the split the
 * settings UI shows is decided here rather than by the kind.
 */
export const GROUP_FOR_INCIDENT_NOTIFICATION_KEY: Record<IncidentNotificationKey, NotificationGroup> = {
  "signal.escalating": "signals",
  "monitor.match": "monitors",
  "monitor.threshold": "monitors",
  "monitor.escalating": "monitors",
}

export const NOTIFICATION_GROUP_META: Record<
  NotificationGroup,
  {
    readonly label: string
    readonly description: string
    /**
     * Whether the group can be routed to org-level Slack channels. Personal
     * kinds target one specific user, so broadcasting them to a shared
     * channel is never right — non-routable groups are hidden from the
     * Slack routes settings, rejected by the route-config server fns, and
     * skipped by the worker's Slack fan-out.
     */
    readonly slackRoutable: boolean
    /**
     * Whether the group's notifications carry a severity, and so can be
     * held to a minimum-severity threshold on both channels.
     */
    readonly severityFiltered: boolean
    /** Sub-toggles offered inside the group; empty means the group toggle is the only switch. */
    readonly topics: readonly NotificationTopic[]
  }
> = {
  personal: {
    label: "Atribuído a você",
    description: "Notificações direcionadas a você, como quando uma ocorrência é atribuída à sua conta.",
    slackRoutable: false,
    severityFiltered: false,
    topics: [],
  },
  signals: {
    label: "Sinais",
    description: "Receba notificações quando sinais forem descobertos, escalarem, voltarem a ocorrer ou ganharem prioridade.",
    slackRoutable: true,
    severityFiltered: true,
    topics: ["signal.discovered", "signal.escalating", "signal.regressed", "signal.reprioritized"],
  },
  monitors: {
    label: "Monitores",
    description: "Receba notificações quando um dos seus monitores disparar.",
    slackRoutable: true,
    severityFiltered: true,
    topics: [],
  },
  wrapped_reports: {
    label: "Relatórios Wrapped",
    description: "Relatórios semanais do Claude Code Wrapped para seus projetos.",
    slackRoutable: true,
    severityFiltered: false,
    topics: [],
  },
  agent_score: {
    label: "Pontuação do agente",
    description: "Relatórios semanais de pontuação do agente para seus projetos.",
    slackRoutable: true,
    severityFiltered: false,
    topics: [],
  },
  custom_messages: {
    label: "Comunicados",
    description: "Comunicados do produto e mensagens administrativas.",
    slackRoutable: true,
    severityFiltered: false,
    topics: [],
  },
  destinations: {
    label: "Destinos de dados",
    description: "Receba notificações quando um destino de dados parar de sincronizar, por exemplo após falhas repetidas.",
    slackRoutable: true,
    severityFiltered: false,
    topics: [],
  },
  billing: {
    label: "Faturamento",
    description: "Alertas quando a empresa esgota os créditos incluídos, entra em excedente ou atinge um limite de gasto.",
    slackRoutable: false,
    severityFiltered: false,
    topics: [],
  },
}

/** Groups eligible for org-level Slack channel routing. */
export const SLACK_ROUTABLE_NOTIFICATION_GROUPS = NOTIFICATION_GROUPS.filter(
  (group) => NOTIFICATION_GROUP_META[group].slackRoutable,
)

/**
 * Per-topic switches on a group's delivery config. Absent topics fall back to
 * the topic's `defaultEnabled`, so a user who never opens the settings gets
 * every opt-out topic and none of the opt-in ones.
 */
export const topicPreferencesSchema = z.partialRecord(notificationTopicSchema, z.boolean())
export type TopicPreferences = z.infer<typeof topicPreferencesSchema>

/** Whether a topic passes a topic filter. Notifications with no topic are never filtered. */
export const admitsTopic = (topics: TopicPreferences | undefined, topic: NotificationTopic | null): boolean =>
  topic === null || (topics?.[topic] ?? NOTIFICATION_TOPIC_META[topic].defaultEnabled)

/**
 * Per-channel switches inside a group's preferences. Today only `email`
 * exists; Slack and other channels add fields here without a schema
 * version bump (all fields optional with sensible defaults).
 */
export const channelPreferencesSchema = z.object({
  email: z.boolean().optional(),
  emailMinSeverity: alertSeveritySchema.optional(),
  emailTopics: topicPreferencesSchema.optional(),
})
export type ChannelPreferences = z.infer<typeof channelPreferencesSchema>

const groupPreferencesShape = Object.fromEntries(
  NOTIFICATION_GROUPS.map((g) => [g, channelPreferencesSchema.optional()] as const),
) as {
  [G in NotificationGroup]: z.ZodOptional<typeof channelPreferencesSchema>
}

/**
 * User-level notification preferences, keyed by `NotificationGroup`. Stored
 * on `users.notification_preferences` as jsonb. Missing entries are
 * treated as opt-in (default = email on); a user who has never visited
 * the settings page gets the same delivery as one who explicitly enabled
 * everything.
 */
export const notificationPreferencesSchema = z.object(groupPreferencesShape)
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>
