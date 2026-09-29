import { Alert, Button, GithubIcon, Icon, Input, Select, Skeleton, Text, useToast } from "@repo/ui"
import { relativeTime } from "@repo/utils"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import {
  GITHUB_INTEGRATION_QUERY_KEY,
  GITHUB_ORG_DEFAULTS_QUERY_KEY,
  GITHUB_REPOS_QUERY_KEY,
  type GithubProjectConfigRecord,
  getActiveGithubIntegration,
  getGithubOrgDefaults,
  getGithubProjectConfig,
  githubProjectConfigQueryKey,
  listGithubInstallationRepositories,
  resetGithubProjectOverride,
  upsertGithubProjectConfig,
} from "../../../../../../domains/github/github.functions.ts"
import { integrationEntry } from "../../../../../../domains/integrations/integration-catalog.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { GithubMonitorSettingsForm } from "./github-monitor-settings-form.tsx"
import { IntegrationNotConnected } from "./integration-detail-header.tsx"
import { IntegrationDocsFooter } from "./integration-docs.tsx"
import { ScopedSetting, type SettingScope } from "./scoped-setting.tsx"
import { SettingsCard } from "./settings-card.tsx"

/** What GitHub does for this project: which repository it watches, and whether it follows the organization. */
export function GithubProjectSettings({
  projectId,
  projectSlug,
  projectCount,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly projectCount: number
}) {
  const { data: integration, isLoading } = useQuery({
    queryKey: GITHUB_INTEGRATION_QUERY_KEY,
    queryFn: () => getActiveGithubIntegration(),
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!integration) return <IntegrationNotConnected entry={integrationEntry("github")} projectSlug={projectSlug} />

  return (
    <div className="flex w-full flex-col gap-6">
      {integration.suspendedAt ? (
        <Alert
          variant="warning"
          showIcon
          title="Instalação do GitHub suspensa"
          description="O GitHub App está suspenso nesta conta. Reative-o no GitHub para retomar o processamento."
        />
      ) : null}

      <SettingsCard
        title="Conexão"
        description="Compartilhada por todos os projetos da empresa."
        actions={
          <Button asChild variant="ghost">
            <Link
              to="/projects/$projectSlug/settings/organization/integrations/$integrationSlug"
              params={{ projectSlug, integrationSlug: "github" }}
            >
              Gerenciar para a empresa →
            </Link>
          </Button>
        }
        footer={<IntegrationDocsFooter integration="github" />}
      >
        <div className="flex min-w-0 flex-row items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background">
            {integration.accountAvatarUrl ? (
              <img src={integration.accountAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon icon={GithubIcon} />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <Text.H5 weight="semibold">{integration.accountLogin}</Text.H5>
            <Text.H6 color="foregroundMuted">Conectado {relativeTime(new Date(integration.installedAt))}</Text.H6>
          </div>
        </div>
      </SettingsCard>

      <ProjectGithubSections projectId={projectId} projectSlug={projectSlug} projectCount={projectCount} />
    </div>
  )
}

function ProjectGithubSections({
  projectId,
  projectSlug,
  projectCount,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly projectCount: number
}) {
  const queryClient = useQueryClient()
  const configKey = githubProjectConfigQueryKey(projectId)
  const { data: config, isLoading } = useQuery({
    queryKey: configKey,
    queryFn: () => getGithubProjectConfig({ data: { projectId } }),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: configKey })

  if (isLoading) return <Skeleton className="h-32 w-full" />
  // Null means the integration went away mid-session; the parent renders the not-connected state once its own query catches up.
  if (!config) return null

  return (
    <>
      <RepositorySection
        key={`repo:${config.hasOverride}:${config.repoId ?? "none"}:${config.branch ?? ""}`}
        projectId={projectId}
        projectSlug={projectSlug}
        config={config}
        projectCount={projectCount}
        onChanged={invalidate}
      />
      <MonitoringSection
        projectId={projectId}
        projectSlug={projectSlug}
        config={config}
        projectCount={projectCount}
        onChanged={invalidate}
      />
    </>
  )
}

/** Having a config row at all is the repo override — the row's own repo columns are what pin it. */
function RepositorySection({
  projectId,
  projectSlug,
  config,
  projectCount,
  onChanged,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly config: GithubProjectConfigRecord
  readonly projectCount: number
  readonly onChanged: () => Promise<unknown>
}) {
  const { toast } = useToast()
  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: GITHUB_REPOS_QUERY_KEY,
    queryFn: () => listGithubInstallationRepositories(),
  })
  const [repoId, setRepoId] = useState<number | null>(config.repoId)
  const [branch, setBranch] = useState(config.branch ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [stagedScope, setStagedScope] = useState<SettingScope | null>(null)

  const storedScope: SettingScope = config.hasOverride ? "project" : "organization"
  const scope = stagedScope ?? storedScope
  const pendingRemoval = storedScope === "project" && scope === "organization"

  // `config.repoId` is this project's own binding when it has one, so previewing what it
  // would inherit needs the organization default on its own.
  const { data: orgDefaults } = useQuery({
    queryKey: GITHUB_ORG_DEFAULTS_QUERY_KEY,
    queryFn: () => getGithubOrgDefaults(),
  })
  const inheritedRepo = orgDefaults?.defaultRepo ?? null
  const previewsInherited = scope === "organization" && orgDefaults != null
  const shownRepoId = previewsInherited ? (inheritedRepo?.repoId ?? null) : repoId
  const shownBranch = previewsInherited ? (inheritedRepo?.branch ?? "") : branch
  // Taking ownership is itself a change worth saving, so an untouched snapshot still offers it.
  const canSave = storedScope === "organization" || repoId !== config.repoId || branch.trim() !== (config.branch ?? "")

  const onSelectRepo = (value: string | undefined) => {
    if (value === undefined) {
      setRepoId(null)
      setBranch("")
      return
    }
    const id = Number(value)
    setRepoId(id)
    setBranch(repos?.find((repo) => repo.id === id)?.defaultBranch ?? "")
  }

  const save = async () => {
    if (repoId === null) return
    setIsSaving(true)
    try {
      await upsertGithubProjectConfig({ data: { projectId, repoId, branch: branch.trim() } })
      setStagedScope(null)
      await onChanged()
      toast({ description: "Repositório salvo para este projeto" })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  const applyRemoval = async () => {
    setIsSaving(true)
    try {
      await resetGithubProjectOverride({ data: { projectId } })
      setStagedScope(null)
      await onChanged()
      toast({ description: "Este projeto agora segue o repositório da empresa" })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScopedSetting
      idPrefix="github-repository"
      title="Repositório monitorado"
      description="Repositório e branch onde vivem os sinais deste projeto."
      scope={{
        kind: "selectable",
        value: scope,
        onChange: (next) => setStagedScope(next === storedScope ? null : next),
      }}
      pendingChange={
        pendingRemoval
          ? {
              title: "Seguir o repositório da empresa?",
              description:
                "Este projeto passará a seguir o repositório da empresa, e suas configurações próprias de monitoramento serão descartadas.",
              applyLabel: "Seguir empresa",
              isApplying: isSaving,
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
              {config.repoOverrideCount > 0
                ? `Repositório da empresa em vigor em ${projectCount - config.repoOverrideCount} de ${projectCount} projetos · ${config.repoOverrideCount} usam configuração própria`
                : `Repositório da empresa em vigor em todos os ${projectCount} projetos`}
            </Text.H6>
            <Button asChild variant="outline">
              <Link
                to="/projects/$projectSlug/settings/organization/integrations/$integrationSlug"
                params={{ projectSlug, integrationSlug: "github" }}
              >
                Editar padrão da empresa
              </Link>
            </Button>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-row flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1">
            <Select
              name="project-repository"
              label="Repositório"
              placeholder={reposLoading ? "Carregando repositórios" : "Selecione um repositório"}
              searchable
              removable
              contentWidth="trigger"
              loading={reposLoading}
              disabled={scope === "organization" || reposLoading}
              options={(repos ?? []).map((repo) => ({ label: repo.fullName, value: String(repo.id) }))}
              value={shownRepoId === null ? undefined : String(shownRepoId)}
              onChange={(value) => onSelectRepo(value == null ? undefined : String(value))}
            />
          </div>
          <div className="w-44">
            <Input
              label="Branch"
              placeholder="main"
              className="h-9"
              disabled={scope === "organization" || shownRepoId === null}
              value={shownBranch}
              onChange={(event) => setBranch(event.target.value)}
            />
          </div>
        </div>
        {scope === "project" && canSave ? (
          <div className="flex flex-row">
            <Button onClick={() => void save()} disabled={repoId === null || branch.trim().length === 0 || isSaving}>
              Salvar para este projeto
            </Button>
          </div>
        ) : null}
      </div>
    </ScopedSetting>
  )
}

function MonitoringSection({
  projectId,
  projectSlug,
  config,
  projectCount,
  onChanged,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly config: GithubProjectConfigRecord
  readonly projectCount: number
  readonly onChanged: () => Promise<unknown>
}) {
  const { toast } = useToast()
  const [isSwitching, setIsSwitching] = useState(false)
  const [stagedScope, setStagedScope] = useState<SettingScope | null>(null)

  const storedScope: SettingScope = config.hasBehaviorOverride ? "project" : "organization"
  const scope = stagedScope ?? storedScope
  // Dropping the override is the only destructive direction, so it waits for an explicit apply.
  const pendingRemoval = storedScope === "project" && scope === "organization"

  // `config.settings` is already merged, so the inherited preview needs the default on its own.
  const { data: orgDefaults } = useQuery({
    queryKey: GITHUB_ORG_DEFAULTS_QUERY_KEY,
    queryFn: () => getGithubOrgDefaults(),
  })
  const shown = scope === "organization" ? (orgDefaults?.settings ?? config.settings) : config.settings

  const applyRemoval = async () => {
    if (config.repoId === null) {
      toast({ variant: "destructive", description: "Selecione primeiro um repositório para este projeto." })
      return
    }
    setIsSwitching(true)
    try {
      // `resetGithubProjectOverride` would delete the whole row, repo binding included.
      // Nulling the four behavior columns keeps the binding and restores inheritance.
      await upsertGithubProjectConfig({
        data: { projectId, repoId: config.repoId, branch: config.branch ?? "", overrides: null },
      })
      setStagedScope(null)
      await onChanged()
      toast({ description: "Este projeto agora segue o padrão da empresa" })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <ScopedSetting
      idPrefix="github-monitoring"
      title="Monitoramento"
      description="O que o Vigia monitora e quais palavras vinculam ou resolvem um sinal."
      scope={{
        kind: "selectable",
        value: scope,
        onChange: (next) => setStagedScope(next === storedScope ? null : next),
      }}
      pendingChange={
        pendingRemoval
          ? {
              title: "Seguir o monitoramento da empresa?",
              description:
                "Este projeto passará a seguir o padrão da empresa, e suas configurações próprias de monitoramento serão descartadas. O vínculo com o repositório será mantido.",
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
              {config.overrideCount > 0
                ? `Padrão da empresa em vigor em ${projectCount - config.overrideCount} de ${projectCount} projetos · ${config.overrideCount} usam configuração própria`
                : `Padrão da empresa em vigor em todos os ${projectCount} projetos`}
            </Text.H6>
            <Button asChild variant="outline">
              <Link
                to="/projects/$projectSlug/settings/organization/integrations/$integrationSlug"
                params={{ projectSlug, integrationSlug: "github" }}
              >
                Editar padrão da empresa
              </Link>
            </Button>
          </div>
        ) : null
      }
    >
      {/* Keyed on the seeded values, not the query's dataUpdatedAt: an inherited card must
          follow a changed organization default, while an identical refetch must not wipe edits. */}
      <GithubMonitorSettingsForm
        key={`${scope}:${config.repoId ?? "none"}:${JSON.stringify(shown)}`}
        initial={shown}
        readOnly={scope === "organization"}
        submitLabel="Salvar para este projeto"
        submitWhenPristine={storedScope === "organization"}
        submitDisabled={config.repoId === null}
        onSubmit={async (settings) => {
          if (config.repoId === null) return
          await upsertGithubProjectConfig({
            data: { projectId, repoId: config.repoId, branch: config.branch ?? "", overrides: settings },
          })
          setStagedScope(null)
          await onChanged()
          toast({ description: "Monitoramento salvo para este projeto" })
        }}
      />
    </ScopedSetting>
  )
}
