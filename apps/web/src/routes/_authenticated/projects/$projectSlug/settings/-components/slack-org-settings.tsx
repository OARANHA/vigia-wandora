import type { SlackRoute } from "@domain/integrations"
import { type NotificationGroup, SLACK_ROUTABLE_NOTIFICATION_GROUPS } from "@domain/shared"
import { Alert, Button, Icon, Modal, Skeleton, Text, useToast } from "@repo/ui"
import { relativeTime } from "@repo/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { integrationEntry } from "../../../../../../domains/integrations/integration-catalog.ts"
import {
  disconnectSlackIntegration,
  getActiveSlackIntegration,
  SLACK_INTEGRATION_QUERY_KEY,
  type SlackIntegrationRecord,
} from "../../../../../../domains/integrations/integrations.functions.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { IntegrationNotConnected } from "./integration-detail-header.tsx"
import { IntegrationDocsFooter } from "./integration-docs.tsx"
import { SettingsCard } from "./settings-card.tsx"
import { persistSlackRoute, SlackRouteRow } from "./slack-route-row.tsx"

/**
 * Everything Slack: the workspace and its channel routing are both organization-wide,
 * which is why Slack has no project page at all.
 */
export function SlackOrgSettings({ projectSlug }: { readonly projectSlug: string }) {
  const { data: integration, isLoading } = useQuery({
    queryKey: SLACK_INTEGRATION_QUERY_KEY,
    queryFn: () => getActiveSlackIntegration(),
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!integration) return <IntegrationNotConnected entry={integrationEntry("slack")} projectSlug={projectSlug} />

  return <SlackOrgSettingsDetails integration={integration} />
}

function SlackOrgSettingsDetails({ integration }: { readonly integration: SlackIntegrationRecord }) {
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Should never appear while on-use refresh is healthy; when it does, the rotation
          chain is broken (refresh token revoked) and the workspace must be reconnected. */}
      {integration.needsReconnect ? (
        <Alert
          variant="destructive"
          showIcon
          title="Conexão com o Slack expirada"
          description="Não foi possível renovar o token do Slack. Reconecte para restaurar as notificações."
          cta={
            <Button asChild variant="destructive">
              <a href="/integrations/slack/install">Reconectar</a>
            </Button>
          }
        />
      ) : null}

      <SettingsCard
        title="Conexão"
        description="Compartilhada por todos os projetos da empresa."
        actions={
          <Button variant="destructive" onClick={() => setDisconnectOpen(true)}>
            Desconectar
          </Button>
        }
        footer={<IntegrationDocsFooter integration="slack" />}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text.H5 weight="semibold">{integration.teamName}</Text.H5>
          <Text.H6 color="foregroundMuted">Conectado {relativeTime(new Date(integration.installedAt))}</Text.H6>
        </div>
      </SettingsCard>

      <SlackNotificationsSection integration={integration} />

      {disconnectOpen ? <DisconnectSlackModal onClose={() => setDisconnectOpen(false)} /> : null}
    </div>
  )
}

type RouteDraft = Partial<Record<NotificationGroup, SlackRoute | null>>

const routeDraftFrom = (integration: SlackIntegrationRecord): RouteDraft =>
  Object.fromEntries(SLACK_ROUTABLE_NOTIFICATION_GROUPS.map((group) => [group, integration.routes[group]?.[0] ?? null]))

function SlackNotificationsSection({ integration }: { readonly integration: SlackIntegrationRecord }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const stored = routeDraftFrom(integration)
  const [draft, setDraft] = useState<RouteDraft>(stored)
  const [isSaving, setIsSaving] = useState(false)

  const changed = SLACK_ROUTABLE_NOTIFICATION_GROUPS.filter(
    (group) => JSON.stringify(draft[group] ?? null) !== JSON.stringify(stored[group] ?? null),
  )

  const save = async () => {
    setIsSaving(true)
    try {
      for (const group of changed) await persistSlackRoute(group, draft[group] ?? null)
      toast({ description: "Roteamento de notificações salvo" })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      // Groups are written one at a time, so a failure partway through still leaves earlier ones persisted.
      await queryClient.invalidateQueries({ queryKey: SLACK_INTEGRATION_QUERY_KEY })
      setIsSaving(false)
    }
  }

  return (
    <SettingsCard
      title="Notificações"
      description="Canal do Slack usado por cada grupo de notificações em todos os projetos."
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-1">
          {SLACK_ROUTABLE_NOTIFICATION_GROUPS.map((group) => (
            <SlackRouteRow
              key={group}
              group={group}
              route={draft[group] ?? null}
              disabled={isSaving}
              onChange={(next) => setDraft((current) => ({ ...current, [group]: next }))}
            />
          ))}
        </div>
        {changed.length > 0 ? (
          <div className="flex flex-row">
            <Button onClick={() => void save()} disabled={isSaving}>
              Salvar padrão
            </Button>
          </div>
        ) : null}
      </div>
    </SettingsCard>
  )
}

function DisconnectSlackModal({ onClose }: { readonly onClose: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [disconnecting, setDisconnecting] = useState(false)

  const mutation = useMutation({ mutationFn: () => disconnectSlackIntegration() })

  const handleConfirm = async () => {
    setDisconnecting(true)
    try {
      await mutation.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: SLACK_INTEGRATION_QUERY_KEY })
      toast({ description: "Slack desconectado" })
      onClose()
    } catch (error) {
      setDisconnecting(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal
      open
      dismissible
      onOpenChange={(value) => {
        if (!value && !disconnecting) onClose()
      }}
      title="Desconectar Slack"
      description="A desconexão interromperá todas as notificações do Vigia para este workspace do Slack e revogará o token do bot. O roteamento de canais será redefinido se você reconectar. Isso afeta todos os projetos da empresa."
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={disconnecting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={disconnecting}
            isLoading={disconnecting}
          >
            <Icon icon={Trash2} size="sm" />
            {disconnecting ? "Desconectando…" : "Desconectar Slack"}
          </Button>
        </div>
      }
    />
  )
}
