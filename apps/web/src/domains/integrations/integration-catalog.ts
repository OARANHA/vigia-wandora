import { ClaudeCodeIcon, CursorIcon, GithubIcon, LinearIcon, SlackIcon } from "@repo/ui"
import { type LucideProps, Webhook } from "lucide-react"
import type { ComponentType } from "react"
import type { AgentDispatchKindKey } from "../agent-dispatch/agent-dispatch-kinds.ts"

export type IntegrationKey = "slack" | "github" | AgentDispatchKindKey

export interface IntegrationCatalogEntry {
  readonly key: IntegrationKey
  readonly label: string
  readonly icon: ComponentType<LucideProps>
  /** One line of what it gets you, shown on the tile of an unconnected integration. */
  readonly summary: string
  readonly docsUrl?: string
}

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  {
    key: "slack",
    label: "Slack",
    icon: SlackIcon,
    summary: "Envie notificações do Vigia para seu workspace do Slack.",
    docsUrl: "https://docs.latitude.so/more/slack",
  },
  {
    key: "github",
    label: "GitHub",
    icon: GithubIcon,
    summary: "Resolva sinais automaticamente quando um PR ou commit relacionado for integrado.",
    docsUrl: "https://docs.latitude.so/more/github",
  },
  {
    key: "cursor",
    label: "Cursor",
    icon: CursorIcon,
    summary: "Agentes do Cursor reagem a sinais e monitores do Vigia e enviam correções para o seu código.",
  },
  {
    key: "claude_code",
    label: "Claude Code",
    icon: ClaudeCodeIcon,
    summary: "Rotinas do Claude Code reagem a sinais e monitores do Vigia e enviam correções para o seu código.",
  },
  {
    key: "linear",
    label: "Linear",
    icon: LinearIcon,
    summary: "Crie issues no Linear para sinais que precisam de acompanhamento.",
  },
  {
    key: "webhook",
    label: "Webhook",
    icon: Webhook,
    summary: "Envie eventos de integração para o seu próprio endpoint.",
  },
]

export const integrationEntry = (key: IntegrationKey): IntegrationCatalogEntry => {
  const entry = INTEGRATION_CATALOG.find((row) => row.key === key)
  if (!entry) throw new Error(`Unknown integration: ${key}`)
  return entry
}

const isIntegrationKey = (value: string): value is IntegrationKey =>
  INTEGRATION_CATALOG.some((row) => row.key === value)

/** Keys whose URL segment reads better than the stored kind. */
const SLUG_OVERRIDES: Partial<Record<IntegrationKey, string>> = { claude_code: "claude" }

/** The URL segment for an integration — never the raw kind when an override exists. */
export const integrationSlug = (key: IntegrationKey): string => SLUG_OVERRIDES[key] ?? key

/** Resolves a URL segment back to its key; raw kinds still resolve so older links keep working. */
export const integrationKeyFromSlug = (slug: string): IntegrationKey | null => {
  const overridden = INTEGRATION_CATALOG.find((row) => SLUG_OVERRIDES[row.key] === slug)
  if (overridden) return overridden.key
  return isIntegrationKey(slug) ? slug : null
}

/** Slack's workspace and channel routing are organization-wide, so it has no project page. */
export const hasProjectSettings = (key: IntegrationKey): boolean => key !== "slack"

/**
 * A connected integration, flattened from its own server function so the list can
 * rank and render all six the same way.
 */
export interface ConnectedIntegration {
  readonly entry: IntegrationCatalogEntry
  /** The account that makes it real — workspace, org login, or vendor account. */
  readonly identity: string
  readonly detail: string
  readonly needsAttention: boolean
  readonly attentionLabel?: string | undefined
}

/** Broken first so problems surface without visiting every detail page, then alphabetical for stable muscle memory. */
export const sortConnectedIntegrations = (rows: readonly ConnectedIntegration[]): ConnectedIntegration[] =>
  [...rows].sort((a, b) => {
    if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1
    return a.entry.label.localeCompare(b.entry.label)
  })
