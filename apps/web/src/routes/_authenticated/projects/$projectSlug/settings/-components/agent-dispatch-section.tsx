import {
  AGENT_DISPATCH_TRIGGERS,
  type AgentDispatchTrigger,
  type StoredAgentDispatchTarget,
} from "@domain/agent-dispatch"
import {
  Badge,
  Button,
  Checkbox,
  CloseTrigger,
  CopyableText,
  CopyButton,
  Icon,
  InfiniteTable,
  type InfiniteTableColumn,
  Input,
  Label,
  Modal,
  Select,
  Skeleton,
  Text,
  useToast,
} from "@repo/ui"
import { relativeTime } from "@repo/utils"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Copy, ExternalLink, FileText } from "lucide-react"
import { type ReactNode, useState } from "react"
import { z } from "zod"
import {
  AGENT_DISPATCH_INTEGRATIONS_QUERY_KEY,
  type AgentDispatchConfigRecord,
  type AgentDispatchIntegrationRecord,
  type AgentDispatchRecord,
  connectClaudeIntegration,
  connectCursorIntegration,
  connectLinearIntegration,
  connectWebhookIntegration,
  disconnectAgentDispatchIntegration,
  getOrgDefaultDispatchConfig,
  getProjectDispatchSettings,
  getWebhookSecret,
  listAgentDispatches,
  listAgentDispatchIntegrations,
  listCursorRepositories,
  listCursorRepositoriesForApiKey,
  listLinearMembers,
  listLinearTeams,
  listLinearTeamsForApiKey,
  orgDefaultConfigQueryKey,
  projectDispatchSettingsQueryKey,
  resetProjectDispatchOverride,
  sendToDestinationsQueryKey,
  upsertOrgDefaultDispatchConfig,
  upsertProjectDispatchOverride,
} from "../../../../../../domains/agent-dispatch/agent-dispatch.functions.ts"
import {
  AGENT_DISPATCH_KIND_LABELS,
  type AgentDispatchKindKey,
} from "../../../../../../domains/agent-dispatch/agent-dispatch-kinds.ts"
import { integrationEntry, integrationSlug } from "../../../../../../domains/integrations/integration-catalog.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../../../../lib/form-server-action.ts"
import { useDebounce } from "../../../../../../lib/hooks/useDebounce.ts"
import { maskSensitiveValue } from "../../../../../../lib/mask-sensitive-value.ts"
import { IntegrationNotConnected } from "./integration-detail-header.tsx"
import { IntegrationDocsButton, IntegrationDocsFooter } from "./integration-docs.tsx"
import { otherAffectedProjects } from "./org-default-confirm.tsx"
import { OrgDefaultConfirmModal, useOrgDefaultConfirm } from "./org-default-confirm-modal.tsx"
import { ScopedSetting, type SettingScope } from "./scoped-setting.tsx"
import { SettingsCard } from "./settings-card.tsx"

export interface DispatchConfigFormValues {
  readonly triggers: readonly AgentDispatchTrigger[]
  readonly target: StoredAgentDispatchTarget
  readonly guardrails: { readonly maxDispatchesPerDay: number; readonly cooldownMinutes: number }
}

const KIND_LABELS = AGENT_DISPATCH_KIND_LABELS

const DEEP_LINK_LABELS: Record<AgentDispatchKindKey, string> = {
  cursor: "Abrir no Cursor",
  claude_code: "Abrir no Claude",
  linear: "Abrir issue no Linear",
  webhook: "Abrir entrega",
}

export const DISPATCH_ERROR_TITLES: Record<string, string> = {
  auth: "Erro de autenticação",
  config: "Envio rejeitado",
  rate_limited: "Limite de requisições atingido",
  transport: "Erro de rede",
}

const DISPATCH_ERROR_FALLBACKS: Record<string, string> = {
  auth: "As credenciais da integração foram rejeitadas. Reconecte a integração e tente novamente.",
  config: "O provedor rejeitou o envio. Novas falhas exibem aqui a resposta do provedor.",
  rate_limited: "O provedor limitou este envio. Uma nova tentativa deve ocorrer automaticamente.",
  transport: "Não foi possível acessar o provedor. Uma nova tentativa deve ocorrer automaticamente.",
}

function getDispatchErrorTitle(dispatch: AgentDispatchRecord): string | null {
  if (!dispatch.errorCategory) return null
  return DISPATCH_ERROR_TITLES[dispatch.errorCategory] ?? dispatch.errorCategory
}

function getDispatchErrorDetail(dispatch: AgentDispatchRecord): string | null {
  const genericErrorDetail = dispatch.errorCategory ? `Agent dispatch adapter failed (${dispatch.errorCategory})` : null
  if (dispatch.errorDetail && dispatch.errorDetail !== genericErrorDetail) {
    return dispatch.errorDetail
  }
  if (dispatch.errorCategory) {
    return DISPATCH_ERROR_FALLBACKS[dispatch.errorCategory] ?? null
  }
  return null
}

function DispatchErrorDetailModal({
  title,
  detail,
  onClose,
}: {
  readonly title: string
  readonly detail: string
  readonly onClose: () => void
}) {
  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => (!next ? onClose() : undefined)}
      title={title}
      description="Resposta completa de erro do provedor."
      footer={<CloseTrigger />}
    >
      <div className="group relative">
        <div className="absolute top-0 right-0 z-10 rounded-tr-md rounded-bl-lg bg-muted p-0.5">
          <CopyButton value={detail} tooltip="Copiar" />
        </div>
        <textarea
          readOnly
          value={detail}
          className="max-h-80 min-h-32 w-full resize-none rounded-md bg-muted p-3 pr-12 font-mono text-xs leading-relaxed"
        />
      </div>
    </Modal>
  )
}

const ACTIVE_DISPATCH_TRIGGERS = [
  "signal.discovered",
  "incident.opened",
  "signal.regressed",
  "monitor.incident",
] as const

export const DISPATCH_TRIGGER_TITLES: Record<string, string> = {
  "signal.discovered": "Novo sinal",
  "incident.opened": "Sinal em escalada",
  "signal.regressed": "Sinal regredido",
  "monitor.incident": "Incidente de monitor",
  manual: "Envio manual",
}

const TRIGGER_LABELS: Record<(typeof ACTIVE_DISPATCH_TRIGGERS)[number], { title: string; description: string }> = {
  "signal.discovered": {
    title: "Novo sinal",
    description: "Envie quando o Vigia descobrir um novo sinal.",
  },
  "incident.opened": {
    title: "Sinal em escalada",
    description: "Envie quando um sinal evoluir para um incidente.",
  },
  "signal.regressed": {
    title: "Sinal regredido",
    description: "Envie quando um sinal resolvido voltar a ocorrer.",
  },
  "monitor.incident": {
    title: "Incidente de monitor",
    description: "Envie quando um monitor de limite ou escalada abrir um incidente.",
  },
}

function isActiveDispatchTrigger(trigger: string): trigger is (typeof ACTIVE_DISPATCH_TRIGGERS)[number] {
  return ACTIVE_DISPATCH_TRIGGERS.some((activeTrigger) => activeTrigger === trigger)
}

const CLAUDE_ROUTINE_TEMPLATE =
  "Inspecione o sinal do Vigia, identifique a regressão ou o novo problema, implemente a correção, execute as verificações relevantes e informe o que mudou."

function extractClaudeRoutineTriggerId(routineUrl: string) {
  return routineUrl.trim().match(/\/routines\/(trig_[^/?#]+)/)?.[1] ?? null
}

export function AgentDispatchIntegrationDetails({
  projectId,
  projectSlug,
  projectCount,
  kind,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly projectCount: number
  readonly kind: AgentDispatchKindKey
}) {
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: AGENT_DISPATCH_INTEGRATIONS_QUERY_KEY,
    queryFn: () => listAgentDispatchIntegrations(),
  })
  const integration = integrations.find((row: AgentDispatchIntegrationRecord) => row.kind === kind) ?? null

  if (isLoading) return <Skeleton className="h-32 w-full" />

  if (!integration) return <IntegrationNotConnected entry={integrationEntry(kind)} projectSlug={projectSlug} />

  return (
    <div className="flex w-full flex-col gap-6">
      <DispatchConnectionSection
        kind={kind}
        integration={integration}
        projectId={projectId}
        projectSlug={projectSlug}
        canDisconnect={false}
      />
      <DispatchBehaviorSection
        kind={kind}
        integration={integration}
        projectId={projectId}
        projectSlug={projectSlug}
        projectCount={projectCount}
      />
      <AgentDispatchHistorySection projectId={projectId} projectSlug={projectSlug} kind={kind} />
    </div>
  )
}

export function DispatchConnectionSection({
  kind,
  integration,
  projectId,
  projectSlug,
  canDisconnect,
}: {
  readonly kind: AgentDispatchKindKey
  readonly integration: AgentDispatchIntegrationRecord
  readonly projectId: string
  readonly projectSlug: string
  /** Disconnecting is org-wide, so only the Defaults page — not a single project — can do it. */
  readonly canDisconnect: boolean
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectAgentDispatchIntegration({ data: { integrationId: integration.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AGENT_DISPATCH_INTEGRATIONS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: orgDefaultConfigQueryKey(kind) })
      await queryClient.invalidateQueries({ queryKey: projectDispatchSettingsQueryKey(projectId, kind) })
      await queryClient.invalidateQueries({ queryKey: sendToDestinationsQueryKey(projectId) })
      toast({ description: `${KIND_LABELS[kind]} desconectado` })
      setConfirmOpen(false)
      if (canDisconnect) {
        await navigate({ to: "/projects/$projectSlug/settings/organization/integrations", params: { projectSlug } })
      }
    },
    onError: (error) => {
      setConfirmOpen(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    },
  })

  return (
    <>
      <SettingsCard
        title="Conexão"
        description="Compartilhada por todos os projetos da empresa."
        actions={
          canDisconnect ? (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Disconnect
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link
                to="/projects/$projectSlug/settings/organization/integrations/$integrationSlug"
                params={{ projectSlug, integrationSlug: integrationSlug(kind) }}
              >
                Gerenciar para a empresa →
              </Link>
            </Button>
          )
        }
        footer={<IntegrationDocsFooter integration={kind} />}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text.H5 weight="semibold">{integration.vendorAccountId}</Text.H5>
          <Text.H6 color="foregroundMuted">Conectado {relativeTime(new Date(integration.installedAt))}</Text.H6>
        </div>
      </SettingsCard>

      {confirmOpen ? (
        <Modal
          open
          dismissible
          onOpenChange={(next) => {
            if (!next && !disconnectMutation.isPending) setConfirmOpen(false)
          }}
          title={`Desconectar ${KIND_LABELS[kind]}`}
          description={`O Vigia deixará de enviar para ${KIND_LABELS[kind]}; o padrão da empresa e todas as substituições por projeto serão removidos. Isso afeta todos os projetos da empresa.`}
          footer={
            <div className="flex flex-row items-center gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={disconnectMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                isLoading={disconnectMutation.isPending}
                disabled={disconnectMutation.isPending}
              >
                Desconectar {KIND_LABELS[kind]}
              </Button>
            </div>
          }
        />
      ) : null}
    </>
  )
}

/** Mirrors the GitHub monitoring card: the "Set by" selector is this project's override/reset action. */
function DispatchBehaviorSection({
  kind,
  integration,
  projectId,
  projectSlug,
  projectCount,
}: {
  readonly kind: AgentDispatchKindKey
  readonly integration: AgentDispatchIntegrationRecord
  readonly projectId: string
  readonly projectSlug: string
  readonly projectCount: number
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isSwitching, setIsSwitching] = useState(false)
  const [stagedScope, setStagedScope] = useState<SettingScope | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: projectDispatchSettingsQueryKey(projectId, kind),
    queryFn: () => getProjectDispatchSettings({ data: { projectId, kind } }),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: projectDispatchSettingsQueryKey(projectId, kind) })
    await queryClient.invalidateQueries({ queryKey: sendToDestinationsQueryKey(projectId) })
  }

  if (isLoading) return <Skeleton className="h-32 w-full" />

  const storedScope: SettingScope = settings?.override != null ? "project" : "organization"
  const scope = stagedScope ?? storedScope
  // Dropping the override is the only destructive direction, so it waits for an explicit apply.
  const pendingRemoval = storedScope === "project" && scope === "organization"
  // Taking ownership seeds the new override from the resolved values, so attribution changes without behavior.
  const shown = scope === "organization" ? (settings?.defaultConfig ?? null) : (settings?.effective ?? null)
  const overrideCount = settings?.overrideCount ?? 0

  const applyRemoval = async () => {
    setIsSwitching(true)
    try {
      await resetProjectDispatchOverride({ data: { projectId, integrationId: integration.id } })
      setStagedScope(null)
      await invalidate()
      toast({ description: "Este projeto agora segue o padrão da empresa" })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <ScopedSetting
      idPrefix="dispatch-behavior"
      title="Envios automáticos"
      description="Quando o Vigia envia para esta integração e quais dados são enviados."
      scope={{
        kind: "selectable",
        value: scope,
        onChange: (next) => setStagedScope(next === storedScope ? null : next),
      }}
      pendingChange={
        pendingRemoval
          ? {
              title: "Seguir o comportamento de envio da empresa?",
              description:
                "Este projeto passará a seguir o padrão da empresa e seu comportamento próprio de envio será descartado.",
              applyLabel: "Seguir empresa",
              isApplying: isSwitching,
              onApply: () => void applyRemoval(),
              onDiscard: () => setStagedScope(null),
            }
          : undefined
      }
      footer={
        // Hidden the moment the selector says "This project", so it never sits beside that card's own save.
        scope === "organization" ? (
          <div className="flex flex-row flex-wrap items-center justify-between gap-4">
            <Text.H6 color="foregroundMuted">
              {overrideCount > 0
                ? `Padrão da empresa em vigor para ${projectCount - overrideCount} de ${projectCount} projetos · ${overrideCount} usam configuração própria`
                : `Padrão da empresa em vigor para todos os ${projectCount} projetos`}
            </Text.H6>
            <Button asChild variant="outline">
              <Link
                to="/projects/$projectSlug/settings/organization/integrations/$integrationSlug"
                params={{ projectSlug, integrationSlug: integrationSlug(kind) }}
              >
                Editar padrão da empresa
              </Link>
            </Button>
          </div>
        ) : null
      }
    >
      <AgentDispatchConfigFormInner
        key={`${scope}:${shown?.id ?? "none"}:${shown?.updatedAt ?? "new"}`}
        kind={kind}
        integrationId={integration.id}
        vendorAccountId={integration.vendorAccountId}
        initial={shown}
        webhookSecret={null}
        readOnly={scope === "organization"}
        submitWhenPristine={storedScope === "organization"}
        submitLabel="Salvar neste projeto"
        onSubmit={async (values) => {
          await upsertProjectDispatchOverride({
            data: {
              projectId,
              integrationId: integration.id,
              kind,
              enabled: values.triggers.length > 0,
              triggers: values.triggers,
              target: values.target,
              guardrails: values.guardrails,
            },
          })
          setStagedScope(null)
          await invalidate()
          toast({ description: `Configurações de ${KIND_LABELS[kind]} salvas neste projeto` })
        }}
      />
    </ScopedSetting>
  )
}

/** The organization's half of the project page's Dispatch behavior card — same section, no scope selector. */
export function OrgDispatchBehaviorSection({
  kind,
  integrationId,
  vendorAccountId,
  projectCount,
  overrideCount,
  canEdit,
}: {
  readonly kind: AgentDispatchKindKey
  readonly integrationId: string
  readonly vendorAccountId: string
  readonly projectCount: number
  readonly overrideCount: number
  readonly canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: config, isLoading } = useQuery({
    queryKey: orgDefaultConfigQueryKey(kind),
    queryFn: () => getOrgDefaultDispatchConfig({ data: { kind } }),
  })

  const confirm = useOrgDefaultConfirm(otherAffectedProjects({ projectCount, overrideCount }))

  return (
    <SettingsCard
      title="Envios automáticos"
      description="Quando o Vigia envia para esta integração e quais dados são enviados."
      notice={
        canEdit ? null : <Text.H6 color="foregroundMuted">Apenas proprietários da empresa podem alterar este padrão.</Text.H6>
      }
      footer={
        <Text.H6 color="foregroundMuted">
          {overrideCount > 0
            ? `Em vigor para ${projectCount - overrideCount} de ${projectCount} projetos · ${overrideCount} usam configuração própria`
            : `Em vigor para todos os ${projectCount} projetos`}
        </Text.H6>
      }
    >
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <AgentDispatchConfigFormInner
          key={config ? `${config.id}:${config.updatedAt}` : "new"}
          kind={kind}
          integrationId={integrationId}
          vendorAccountId={vendorAccountId}
          initial={config ?? null}
          webhookSecret={null}
          readOnly={!canEdit}
          submitLabel="Salvar padrão"
          onSubmit={(values) =>
            confirm.request(async () => {
              await upsertOrgDefaultDispatchConfig({
                data: {
                  integrationId,
                  kind,
                  enabled: values.triggers.length > 0,
                  triggers: values.triggers,
                  target: values.target,
                  guardrails: values.guardrails,
                },
              })
              await queryClient.invalidateQueries({ queryKey: orgDefaultConfigQueryKey(kind) })
              await queryClient.invalidateQueries({ queryKey: ["agent-dispatch-project-settings"] })
              await queryClient.invalidateQueries({ queryKey: ["send-to-destinations"] })
              toast({ description: "Padrão da empresa atualizado" })
            })
          }
        />
      )}

      {confirm.isOpen ? (
        <OrgDefaultConfirmModal
          projectCount={projectCount}
          overrideCount={overrideCount}
          isApplying={confirm.isApplying}
          onConfirm={confirm.confirm}
          onCancel={confirm.cancel}
        />
      ) : null}
    </SettingsCard>
  )
}

export function AgentDispatchConfigFormInner({
  kind,
  integrationId,
  vendorAccountId,
  initial,
  webhookSecret,
  readOnly = false,
  submitWhenPristine = false,
  submitLabel = "Salvar configurações",
  extraActions,
  onSubmit,
}: {
  readonly kind: AgentDispatchKindKey
  readonly integrationId: string
  readonly vendorAccountId: string
  readonly initial: AgentDispatchConfigRecord | null
  readonly webhookSecret: string | null
  readonly readOnly?: boolean
  /** Offers the save even with no edits, so inherited values can be snapshotted as-is. */
  readonly submitWhenPristine?: boolean
  readonly submitLabel?: string
  readonly extraActions?: ReactNode
  readonly onSubmit: (values: DispatchConfigFormValues) => Promise<void>
}) {
  const target = initial?.target
  const visibleTriggers = ACTIVE_DISPATCH_TRIGGERS.filter((trigger) => {
    if (kind === "linear") return trigger === "signal.discovered"
    return true
  })
  const { data: cursorRepositories = [], isLoading: cursorRepositoriesLoading } = useQuery({
    queryKey: ["cursor-repositories", integrationId],
    queryFn: () => listCursorRepositories({ data: { integrationId } }),
    enabled: kind === "cursor",
  })
  const cursorRepositoryOptions = cursorRepositories.map((repo) => ({
    label: `${repo.owner}/${repo.name}`,
    value: repo.repository,
  }))
  const { data: linearMembers = [], isLoading: linearMembersLoading } = useQuery({
    queryKey: ["linear-members", integrationId],
    queryFn: () => listLinearMembers({ data: { integrationId } }),
    enabled: kind === "linear",
  })
  const { data: linearTeams = [], isLoading: linearTeamsLoading } = useQuery({
    queryKey: ["linear-teams", integrationId],
    queryFn: () => listLinearTeams({ data: { integrationId } }),
    enabled: kind === "linear",
  })
  const { data: storedWebhookSecret } = useQuery({
    queryKey: ["webhook-secret", integrationId],
    queryFn: () => getWebhookSecret({ data: { integrationId } }),
    enabled: kind === "webhook",
  })
  const linearMemberOptions = linearMembers.map((member) => ({
    label: member.email ? `${member.name} (${member.email})` : member.name,
    value: member.id,
  }))
  const linearTeamOptions = linearTeams.map((team) => ({
    label: `${team.name} (${team.key})`,
    value: team.id,
  }))
  const effectiveWebhookSecret = webhookSecret ?? storedWebhookSecret?.webhookSecret ?? null
  const form = useForm({
    defaultValues: {
      enabled: initial?.enabled ?? false,
      triggers:
        initial?.enabled === false
          ? []
          : (initial?.triggers.filter(
              (trigger) => isActiveDispatchTrigger(trigger) && visibleTriggers.includes(trigger),
            ) ?? ["signal.discovered"]),
      maxDispatchesPerDay: initial?.guardrails.maxDispatchesPerDay ?? 10,
      cooldownMinutes: initial?.guardrails.cooldownMinutes ?? 60,
      repoUrl: kind === "cursor" && target && "repoUrl" in target ? target.repoUrl : "",
      startingRef: kind === "cursor" && target && "startingRef" in target ? (target.startingRef ?? "") : "",
      routineTriggerId:
        kind === "claude_code" && target && "routineTriggerId" in target
          ? target.routineTriggerId
          : kind === "claude_code"
            ? (vendorAccountId.match(/^claude:(trig_.+)$/)?.[1] ?? "")
            : "",
      teamId:
        kind === "linear" && target && "teamId" in target
          ? target.teamId
          : kind === "linear"
            ? (vendorAccountId.match(/^linear:(.+)$/)?.[1] ?? "")
            : "",
      assigneeId: kind === "linear" && target && "assigneeId" in target ? (target.assigneeId ?? "") : "",
      webhookUrl:
        kind === "webhook" && target
          ? "webhookUrl" in target
            ? target.webhookUrl
            : "url" in target
              ? String(target.url ?? "")
              : ""
          : "",
    },
    onSubmit: createFormSubmitHandler(
      async (values: Record<string, unknown>) => {
        const common = z
          .object({
            triggers: z.array(z.enum(AGENT_DISPATCH_TRIGGERS)),
            maxDispatchesPerDay: z.coerce.number().int().positive(),
            cooldownMinutes: z.coerce.number().int().nonnegative(),
          })
          .parse(values)
        const guardrails = {
          maxDispatchesPerDay: common.maxDispatchesPerDay,
          cooldownMinutes: common.cooldownMinutes,
        }
        let target: StoredAgentDispatchTarget
        if (kind === "cursor") {
          const parsed = z
            .object({ repoUrl: z.string().url().or(z.literal("")), startingRef: z.string().optional() })
            .parse(values)
          target = {
            ...(parsed.repoUrl ? { repoUrl: parsed.repoUrl } : {}),
            ...(parsed.startingRef ? { startingRef: parsed.startingRef } : {}),
          }
        } else if (kind === "claude_code") {
          const parsed = z.object({ routineTriggerId: z.string().min(1) }).parse(values)
          target = { routineTriggerId: parsed.routineTriggerId }
        } else if (kind === "linear") {
          const parsed = z.object({ teamId: z.string().uuid(), assigneeId: z.string().optional() }).parse(values)
          target = { teamId: parsed.teamId, ...(parsed.assigneeId ? { assigneeId: parsed.assigneeId } : {}) }
        } else {
          const parsed = z.object({ webhookUrl: z.string().url() }).parse(values)
          target = { webhookUrl: parsed.webhookUrl }
        }
        await onSubmit({ triggers: common.triggers, target, guardrails })
      },
      { resetOnSuccess: false },
    ),
  })

  return (
    <form
      className="flex w-full flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="triggers">
        {(field) => (
          <div className="flex max-w-3xl flex-col gap-3">
            <Label>Gatilhos</Label>
            {visibleTriggers.map((trigger) => {
              const meta = TRIGGER_LABELS[trigger]
              return (
                <div key={trigger} className="flex flex-row items-start gap-3">
                  <Checkbox
                    disabled={readOnly}
                    checked={field.state.value.includes(trigger)}
                    onCheckedChange={(checked) => {
                      field.handleChange(
                        checked === true
                          ? [...field.state.value, trigger]
                          : field.state.value.filter((value) => value !== trigger),
                      )
                    }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <Text.H6 display="block">{meta.title}</Text.H6>
                    <Text.H6 display="block" color="foregroundMuted">
                      {meta.description}
                    </Text.H6>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </form.Field>

      {kind === "cursor" ? (
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <form.Field name="repoUrl">
            {(field) =>
              cursorRepositoryOptions.length > 0 ? (
                <Select
                  name="repoUrl"
                  label="Repositório"
                  placeholder={cursorRepositoriesLoading ? "Carregando repositórios" : "Selecione um repositório"}
                  searchable
                  loading={cursorRepositoriesLoading}
                  disabled={readOnly || cursorRepositoriesLoading}
                  options={cursorRepositoryOptions}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(String(value))}
                  errors={fieldErrorsAsStrings(field.state.meta.errors)}
                />
              ) : (
                <Input
                  label="URL do repositório"
                  placeholder="https://github.com/acme/app"
                  disabled={readOnly || cursorRepositoriesLoading}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  errors={fieldErrorsAsStrings(field.state.meta.errors)}
                />
              )
            }
          </form.Field>
          <form.Field name="startingRef">
            {(field) => (
              <Input
                label="Branch"
                placeholder="main"
                className="h-9"
                disabled={readOnly}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
        </div>
      ) : null}

      {kind === "claude_code" ? (
        <div className="max-w-md">
          <form.Field name="routineTriggerId">
            {(field) => (
              <Input
                label="ID do gatilho da rotina"
                disabled={readOnly}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
        </div>
      ) : null}
      {kind === "linear" ? (
        <div className="flex max-w-md flex-col gap-3">
          <form.Field name="teamId">
            {(field) => (
              <Select
                name="teamId"
                label="Equipe do Linear"
                description="O Vigia cria issues nesta equipe."
                placeholder={linearTeamsLoading ? "Carregando equipes do Linear" : "Selecione uma equipe do Linear"}
                searchable
                loading={linearTeamsLoading}
                disabled={readOnly || linearTeamsLoading}
                options={linearTeamOptions}
                value={field.state.value}
                onChange={(value) => field.handleChange(String(value))}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
          <form.Field name="assigneeId">
            {(field) => (
              <Select
                name="assigneeId"
                label="Responsável"
                description="Opcional. Deixe vazio para criar issues sem responsável."
                placeholder={linearMembersLoading ? "Carregando usuários do Linear" : "Selecione um usuário do Linear"}
                searchable
                removable
                loading={linearMembersLoading}
                disabled={readOnly || linearMembersLoading}
                options={linearMemberOptions}
                value={field.state.value}
                onChange={(value) => field.handleChange(String(value))}
              />
            )}
          </form.Field>
        </div>
      ) : null}
      {kind === "webhook" ? (
        <div className="flex max-w-3xl flex-col gap-4">
          {effectiveWebhookSecret ? (
            <div className="flex flex-col gap-2">
              <Text.H6>Segredo do webhook</Text.H6>
              <CopyableText
                value={effectiveWebhookSecret}
                displayValue={maskSensitiveValue(effectiveWebhookSecret)}
                tooltip="Copiar segredo do webhook"
              />
            </div>
          ) : null}
          <form.Field name="webhookUrl">
            {(field) => (
              <Input
                label="Webhook URL"
                disabled={readOnly}
                value={String(field.state.value)}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
        </div>
      ) : null}

      {readOnly ? (
        extraActions ? (
          <div className="flex max-w-3xl flex-row gap-2">{extraActions}</div>
        ) : null
      ) : (
        <form.Subscribe selector={(state) => ({ isDirty: state.isDirty, isSubmitting: state.isSubmitting })}>
          {({ isDirty, isSubmitting }) => (
            <div className="flex max-w-3xl flex-row gap-2">
              {isDirty || submitWhenPristine ? (
                <Button type="submit" disabled={isSubmitting}>
                  {submitLabel}
                </Button>
              ) : null}
              {extraActions}
            </div>
          )}
        </form.Subscribe>
      )}
    </form>
  )
}

export function ConnectAgentDispatchModal({
  kind,
  projectId,
  open,
  onClose,
  onWebhookSecret,
}: {
  readonly kind: AgentDispatchKindKey
  readonly projectId: string
  readonly open: boolean
  readonly onClose: () => void
  readonly onWebhookSecret: (secret: string) => void
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null)
  const [cursorRepositories, setCursorRepositories] = useState<
    Awaited<ReturnType<typeof listCursorRepositoriesForApiKey>>
  >([])
  const [cursorApiKeyForRepositories, setCursorApiKeyForRepositories] = useState("")
  const [loadedCursorApiKeyForRepositories, setLoadedCursorApiKeyForRepositories] = useState("")
  const [cursorRepositoryError, setCursorRepositoryError] = useState<string | null>(null)
  const [linearTeams, setLinearTeams] = useState<Awaited<ReturnType<typeof listLinearTeamsForApiKey>>>([])
  const [linearApiKeyForTeams, setLinearApiKeyForTeams] = useState("")
  const [loadedLinearApiKeyForTeams, setLoadedLinearApiKeyForTeams] = useState("")
  const [linearTeamError, setLinearTeamError] = useState<string | null>(null)

  const form = useForm({
    defaultValues:
      kind === "cursor"
        ? { cursorApiKey: "", repoUrl: "", startingRef: "" }
        : kind === "claude_code"
          ? { claudeRoutineToken: "", routineUrl: "" }
          : kind === "linear"
            ? { linearApiKey: "", teamId: "" }
            : { webhookUrl: "" },
    onSubmit: createFormSubmitHandler(
      async (
        values:
          | { cursorApiKey: string; repoUrl: string; startingRef: string }
          | { claudeRoutineToken: string; routineUrl: string }
          | { linearApiKey: string; teamId: string }
          | { webhookUrl: string },
      ) => {
        if (kind === "cursor") {
          const parsed = z
            .object({
              cursorApiKey: z.string().min(1),
              repoUrl: z.string().url().or(z.literal("")),
              startingRef: z.string().optional(),
            })
            .parse(values)
          await connectCursorIntegration({
            data: {
              kind: "cursor",
              cursorApiKey: parsed.cursorApiKey,
              ...(parsed.repoUrl ? { repoUrl: parsed.repoUrl } : {}),
              ...(parsed.startingRef ? { startingRef: parsed.startingRef } : {}),
            },
          })
        } else if (kind === "claude_code") {
          const parsed = z
            .object({
              claudeRoutineToken: z.string().min(1),
              routineUrl: z
                .string()
                .url()
                .refine(
                  (value) => extractClaudeRoutineTriggerId(value) !== null,
                  "Cole a URL da página da rotina no Claude Code.",
                ),
            })
            .parse(values)
          await connectClaudeIntegration({
            data: {
              kind: "claude_code",
              claudeRoutineToken: parsed.claudeRoutineToken,
              routineTriggerId: extractClaudeRoutineTriggerId(parsed.routineUrl)!,
            },
          })
        } else if (kind === "linear") {
          const parsed = z.object({ linearApiKey: z.string().min(1), teamId: z.string().uuid() }).parse(values)
          await connectLinearIntegration({
            data: { kind: "linear", linearApiKey: parsed.linearApiKey, teamId: parsed.teamId },
          })
        } else {
          const parsed = z.object({ webhookUrl: z.string().url() }).parse(values)
          const result = await connectWebhookIntegration({
            data: { kind: "webhook", webhookUrl: parsed.webhookUrl },
          })
          setWebhookSecret(result.webhookSecret)
          onWebhookSecret(result.webhookSecret)
          await queryClient.invalidateQueries({ queryKey: AGENT_DISPATCH_INTEGRATIONS_QUERY_KEY })
          await queryClient.invalidateQueries({ queryKey: orgDefaultConfigQueryKey(kind) })
          await queryClient.invalidateQueries({ queryKey: projectDispatchSettingsQueryKey(projectId, kind) })
          await queryClient.invalidateQueries({ queryKey: sendToDestinationsQueryKey(projectId) })
          toast({ description: `${KIND_LABELS[kind]} connected` })
          return
        }
        await queryClient.invalidateQueries({ queryKey: AGENT_DISPATCH_INTEGRATIONS_QUERY_KEY })
        await queryClient.invalidateQueries({ queryKey: orgDefaultConfigQueryKey(kind) })
        await queryClient.invalidateQueries({ queryKey: projectDispatchSettingsQueryKey(projectId, kind) })
        await queryClient.invalidateQueries({ queryKey: sendToDestinationsQueryKey(projectId) })
        toast({ description: `${KIND_LABELS[kind]} connected` })
        onClose()
      },
      { resetOnSuccess: true },
    ),
  })

  const cursorRepositoryOptions = cursorRepositories.map((repo) => ({
    label: `${repo.owner}/${repo.name}`,
    value: repo.repository,
  }))
  const linearTeamOptions = linearTeams.map((team) => ({
    label: `${team.name} (${team.key})`,
    value: team.id,
  }))
  const loadCursorRepositoriesMutation = useMutation({
    mutationFn: (cursorApiKey: string) => listCursorRepositoriesForApiKey({ data: { cursorApiKey } }),
    onSuccess: (repositories, cursorApiKey) => {
      setCursorRepositoryError(null)
      setCursorRepositories(repositories)
      setLoadedCursorApiKeyForRepositories(cursorApiKey)
    },
    onError: (error) => {
      setCursorRepositories([])
      setLoadedCursorApiKeyForRepositories("")
      setCursorRepositoryError(toUserMessage(error))
    },
  })

  const loadLinearTeamsMutation = useMutation({
    mutationFn: (linearApiKey: string) => listLinearTeamsForApiKey({ data: { linearApiKey } }),
    onSuccess: (teams, linearApiKey) => {
      setLinearTeamError(null)
      setLinearTeams(teams)
      setLoadedLinearApiKeyForTeams(linearApiKey)
    },
    onError: (error) => {
      setLinearTeams([])
      setLoadedLinearApiKeyForTeams("")
      setLinearTeamError(toUserMessage(error))
    },
  })

  const trimmedCursorApiKey = cursorApiKeyForRepositories.trim()
  const hasCursorApiKey = trimmedCursorApiKey.length > 0
  const showCursorRepositoryFields =
    kind === "cursor" &&
    hasCursorApiKey &&
    loadedCursorApiKeyForRepositories === trimmedCursorApiKey &&
    !loadCursorRepositoriesMutation.isPending &&
    !cursorRepositoryError
  const showCursorRepositorySkeleton =
    kind === "cursor" && hasCursorApiKey && !showCursorRepositoryFields && !cursorRepositoryError
  const trimmedLinearApiKey = linearApiKeyForTeams.trim()
  const hasLinearApiKey = trimmedLinearApiKey.length > 0
  const showLinearTeamFields =
    kind === "linear" &&
    hasLinearApiKey &&
    loadedLinearApiKeyForTeams === trimmedLinearApiKey &&
    !loadLinearTeamsMutation.isPending &&
    !linearTeamError
  const showLinearTeamSkeleton = kind === "linear" && hasLinearApiKey && !showLinearTeamFields && !linearTeamError

  useDebounce(
    () => {
      const cursorApiKey = cursorApiKeyForRepositories.trim()
      if (kind !== "cursor" || !cursorApiKey) {
        setCursorRepositories([])
        setLoadedCursorApiKeyForRepositories("")
        setCursorRepositoryError(null)
        return
      }
      loadCursorRepositoriesMutation.mutate(cursorApiKey)
    },
    500,
    [kind, cursorApiKeyForRepositories],
  )

  useDebounce(
    () => {
      const linearApiKey = linearApiKeyForTeams.trim()
      if (kind !== "linear" || !linearApiKey) {
        setLinearTeams([])
        setLoadedLinearApiKeyForTeams("")
        setLinearTeamError(null)
        return
      }
      loadLinearTeamsMutation.mutate(linearApiKey)
    },
    500,
    [kind, linearApiKeyForTeams],
  )

  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setWebhookSecret(null)
          onClose()
        }
      }}
      title={`Conectar ${KIND_LABELS[kind]}`}
      dismissible
      footer={
        webhookSecret ? (
          <Button onClick={onClose}>Concluir</Button>
        ) : (
          <Button onClick={() => void form.handleSubmit()} isLoading={form.state.isSubmitting}>
            Connect
          </Button>
        )
      }
    >
      {webhookSecret ? (
        <div className="flex flex-col gap-2">
          <Text.H6>Copie este segredo do webhook agora. Ele não será exibido novamente.</Text.H6>
          <CopyableText value={webhookSecret} tooltip="Copiar segredo do webhook" />
        </div>
      ) : kind === "cursor" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
            <Text.H5 display="block" weight="semibold">
              Obtenha sua chave de API do Cursor
            </Text.H5>
            <div className="flex flex-col gap-2">
              <Text.H6 display="block" color="foregroundMuted">
                1. Abra as chaves de API do Cursor em uma nova aba e entre no workspace que o Vigia deve usar.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                2. Crie uma nova chave de API para o Vigia e copie-a antes de sair do Cursor.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                3. Volte aqui, cole a chave e clique em Conectar. Depois você pode revogá-la nas configurações do Cursor.
              </Text.H6>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 pt-1">
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href="https://cursor.com/dashboard/api" target="_blank" rel="noreferrer">
                  <Icon icon={ExternalLink} size="sm" />
                  Cursor
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <a
                  href="https://cursor.com/docs/cli/reference/authentication#api-key-authentication"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon icon={ExternalLink} size="sm" />
                  Documentação do Cursor
                </a>
              </Button>
              <IntegrationDocsButton integration={kind} variant="ghost" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <form.Field name="cursorApiKey">
              {(field) => (
                <Input
                  label="Chave de API do Cursor"
                  type="password"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                    setCursorRepositories([])
                    setLoadedCursorApiKeyForRepositories("")
                    setCursorRepositoryError(null)
                    setCursorApiKeyForRepositories(event.target.value)
                  }}
                  errors={fieldErrorsAsStrings(field.state.meta.errors)}
                />
              )}
            </form.Field>
          </div>
          {cursorRepositoryError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <Text.H6 color="destructive">{cursorRepositoryError}</Text.H6>
            </div>
          ) : null}
          {showCursorRepositorySkeleton ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : showCursorRepositoryFields ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <form.Field name="repoUrl">
                {(field) =>
                  cursorRepositoryOptions.length > 0 ? (
                    <Select
                      name="repoUrl"
                      label="Repositório"
                      placeholder="Selecione um repositório"
                      searchable
                      options={cursorRepositoryOptions}
                      value={field.state.value}
                      onChange={(value) => field.handleChange(String(value))}
                      errors={fieldErrorsAsStrings(field.state.meta.errors)}
                    />
                  ) : (
                    <Input
                      label="URL do repositório"
                      placeholder="https://github.com/acme/app"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      errors={fieldErrorsAsStrings(field.state.meta.errors)}
                    />
                  )
                }
              </form.Field>
              <form.Field name="startingRef">
                {(field) => (
                  <Input
                    label="Branch"
                    placeholder="main"
                    className="h-9"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    errors={fieldErrorsAsStrings(field.state.meta.errors)}
                  />
                )}
              </form.Field>
            </div>
          ) : null}
        </div>
      ) : kind === "claude_code" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
            <Text.H5 display="block" weight="semibold">
              Conecte uma rotina do Claude Code
            </Text.H5>
            <div className="flex flex-col gap-2">
              <Text.H6 display="block" color="foregroundMuted">
                1. Abra o Claude Code e crie ou selecione a rotina que o Vigia deve acionar.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                2. Use o modelo abaixo como descrição da rotina.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                3. Copie o token do gatilho na seção de API e a URL da página da rotina no navegador.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                4. Cole os dois valores aqui. O Vigia extrairá o ID da rotina a partir da URL da página.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                O prompt de envio pede ao agente que identifique a branch e o PR com a referência do sinal (por exemplo,
                "Resolves LAT-XY9Z"); assim, ao integrar o PR, o sinal é resolvido automaticamente quando a integração
                com GitHub está conectada.
              </Text.H6>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(CLAUDE_ROUTINE_TEMPLATE)
                  toast({ description: "Descrição da rotina copiada" })
                }}
              >
                <Icon icon={Copy} size="sm" />
                Copiar descrição da rotina
              </Button>
              <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href="https://claude.ai/code/routines" target="_blank" rel="noreferrer">
                    <Icon icon={ExternalLink} size="sm" />
                    Claude Code
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <a href="https://code.claude.com/docs/en/routines" target="_blank" rel="noreferrer">
                    <Icon icon={ExternalLink} size="sm" />
                    Documentação do Claude Code
                  </a>
                </Button>
                <IntegrationDocsButton integration={kind} variant="ghost" />
              </div>
            </div>
          </div>
          <form.Field name="claudeRoutineToken">
            {(field) => (
              <Input
                label="Token da rotina"
                type="password"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
          <form.Field name="routineUrl">
            {(field) => (
              <Input
                label="Routine URL"
                description="Copie este valor do navegador enquanto visualiza a rotina."
                placeholder="https://claude.ai/code/routines/trig_..."
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
        </div>
      ) : kind === "linear" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
            <Text.H5 display="block" weight="semibold">
              Obtenha sua chave de API do Linear
            </Text.H5>
            <div className="flex flex-col gap-2">
              <Text.H6 display="block" color="foregroundMuted">
                1. Abra as configurações de API do Linear no workspace em que o Vigia deve criar issues.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                2. Crie uma chave de API pessoal para o Vigia e copie-a antes de sair do Linear.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                3. Cole a chave e escolha a equipe do Linear em que o Vigia deve criar issues.
              </Text.H6>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 pt-1">
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href="https://linear.app/settings/account/security" target="_blank" rel="noreferrer">
                  <Icon icon={ExternalLink} size="sm" />
                  Configurações de API do Linear
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <a href="https://linear.app/docs/graphql/working-with-the-graphql-api" target="_blank" rel="noreferrer">
                  <Icon icon={ExternalLink} size="sm" />
                  Documentação da API do Linear
                </a>
              </Button>
              <IntegrationDocsButton integration={kind} variant="ghost" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <form.Field name="linearApiKey">
              {(field) => (
                <Input
                  label="Chave de API do Linear"
                  type="password"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                    setLinearTeams([])
                    setLoadedLinearApiKeyForTeams("")
                    setLinearTeamError(null)
                    setLinearApiKeyForTeams(event.target.value)
                  }}
                  errors={fieldErrorsAsStrings(field.state.meta.errors)}
                />
              )}
            </form.Field>
            {linearTeamError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <Text.H6 color="destructive">{linearTeamError}</Text.H6>
              </div>
            ) : null}
            {showLinearTeamSkeleton ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ) : showLinearTeamFields ? (
              <form.Field name="teamId">
                {(field) => (
                  <Select
                    name="teamId"
                    label="Equipe do Linear"
                    description="O Vigia cria issues nesta equipe."
                    placeholder="Selecione uma equipe do Linear"
                    searchable
                    options={linearTeamOptions}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(String(value))}
                    errors={fieldErrorsAsStrings(field.state.meta.errors)}
                  />
                )}
              </form.Field>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
            <Text.H5 display="block" weight="semibold">
              Prepare seu endpoint de webhook
            </Text.H5>
            <div className="flex flex-col gap-2">
              <Text.H6 display="block" color="foregroundMuted">
                1. Crie um endpoint HTTPS público que aceite requisições POST.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                2. O Vigia envia JSON com os campos trigger, context e prompt.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                3. Verifique o cabeçalho técnico X-Latitude-Signature usando o segredo exibido após a conexão.
              </Text.H6>
              <Text.H6 display="block" color="foregroundMuted">
                4. Retorne uma resposta 2xx quando seu sistema aceitar o envio.
              </Text.H6>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 pt-1">
              <IntegrationDocsButton integration={kind} variant="outline" />
            </div>
          </div>
          <form.Field name="webhookUrl">
            {(field) => (
              <Input
                label="Webhook URL"
                placeholder="https://hooks.example.com/vigia/dispatch"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
              />
            )}
          </form.Field>
        </div>
      )}
    </Modal>
  )
}

function AgentDispatchHistorySection({
  projectId,
  projectSlug,
  kind,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly kind: AgentDispatchKindKey
}) {
  const [errorDetailModal, setErrorDetailModal] = useState<{ title: string; detail: string } | null>(null)
  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["agent-dispatches", projectId],
    queryFn: () => listAgentDispatches({ data: { projectId } }),
  })

  if (isLoading) return null

  const filteredDispatches = dispatches.filter((dispatch: AgentDispatchRecord) => dispatch.kind === kind)

  const columns: InfiniteTableColumn<AgentDispatchRecord>[] = [
    {
      key: "trigger",
      header: "Gatilho",
      width: 180,
      render: (dispatch) => DISPATCH_TRIGGER_TITLES[dispatch.trigger] ?? dispatch.trigger.replaceAll(".", " "),
    },
    {
      key: "source",
      header: "Origem",
      width: 260,
      render: (dispatch) =>
        dispatch.sourceType === "signal" && dispatch.sourceSlug ? (
          <Link
            to="/projects/$projectSlug/signals/$signalSlug"
            params={{ projectSlug, signalSlug: dispatch.sourceSlug }}
            aria-label={`Abrir sinal ${dispatch.sourceName ?? dispatch.sourceSlug}`}
            className="flex min-w-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <span className="truncate">{dispatch.sourceName ?? dispatch.sourceSlug}</span>
            <Icon icon={ExternalLink} size="xs" />
          </Link>
        ) : dispatch.sourceType === "monitor" && dispatch.sourceSlug ? (
          <Link
            to="/projects/$projectSlug/monitors/$monitorSlug"
            params={{ projectSlug, monitorSlug: dispatch.sourceSlug }}
            aria-label={`Abrir monitor ${dispatch.sourceName ?? dispatch.sourceId}`}
            className="flex min-w-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <span className="truncate">{dispatch.sourceName ?? "Monitor excluído"}</span>
            <Icon icon={ExternalLink} size="xs" />
          </Link>
        ) : (
          <div className="flex min-w-0 flex-col gap-1">
            <Badge variant="outlineMuted" size="small" className="w-fit">
              {dispatch.sourceType}
            </Badge>
            <Text.H6 className="truncate font-mono" color="foregroundMuted">
              {dispatch.sourceId}
            </Text.H6>
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: 240,
      render: (dispatch) => {
        const statusVariant =
          dispatch.status === "dispatched"
            ? "successMuted"
            : dispatch.status === "failed"
              ? "destructiveMuted"
              : "muted"
        const errorTitle = getDispatchErrorTitle(dispatch)
        const errorDetail = getDispatchErrorDetail(dispatch)

        return (
          <div className="flex min-w-0 items-end gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Badge variant={statusVariant} size="small" className="w-fit capitalize">
                {dispatch.status}
              </Badge>
              {errorTitle ? <Text.H7 color="destructive">{errorTitle}</Text.H7> : null}
            </div>
            {errorDetail ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Ver detalhes do erro"
                onClick={() => setErrorDetailModal({ title: errorTitle ?? "Detalhes do erro", detail: errorDetail })}
              >
                <Icon icon={FileText} size="sm" />
              </Button>
            ) : null}
          </div>
        )
      },
    },
    {
      key: "claimedAt",
      header: "Assumido",
      width: 130,
      render: (dispatch) => relativeTime(new Date(dispatch.claimedAt)),
    },
    {
      key: "run",
      header: "Execução",
      width: 150,
      align: "end",
      render: (dispatch) => {
        const linkLabel = dispatch.kind ? (DEEP_LINK_LABELS[dispatch.kind] ?? "Abrir execução") : "Abrir execução"
        const href = dispatch.externalUrl ?? dispatch.routineUrl
        const label = dispatch.externalUrl ? linkLabel : dispatch.routineUrl ? "Rotina do Claude" : null

        return href && label ? (
          <Button asChild variant="ghost" size="sm">
            <a href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              {label}
            </a>
          </Button>
        ) : (
          <Text.H6 color="foregroundMuted">—</Text.H6>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Text.H5 display="block" weight="semibold">
          Histórico de envios
        </Text.H5>
        <Text.H6 display="block" color="foregroundMuted">
          Registro de auditoria dos envios acionados por sinais, monitores, incidentes e ações manuais.
        </Text.H6>
      </div>
      <InfiniteTable
        data={filteredDispatches}
        isLoading={isLoading}
        columns={columns}
        getRowKey={(dispatch) => dispatch.id}
        blankSlate="Nenhum envio ainda."
        scrollAreaLayout="intrinsic"
        className="max-h-[min(32rem,60vh)]"
      />
      {errorDetailModal ? (
        <DispatchErrorDetailModal
          title={errorDetailModal.title}
          detail={errorDetailModal.detail}
          onClose={() => setErrorDetailModal(null)}
        />
      ) : null}
    </div>
  )
}
