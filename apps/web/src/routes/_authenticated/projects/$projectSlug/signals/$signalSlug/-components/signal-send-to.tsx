import {
  Button,
  ButtonGroup,
  CloseTrigger,
  CopyButton,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Input,
  Modal,
  Select,
  Skeleton,
  Text,
  ToastAction,
  useToast,
} from "@repo/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronDown, Clipboard, Loader2, Plus, Sparkles } from "lucide-react"
import { useState } from "react"
import {
  getSignalDispatchPrompt,
  listCursorRepositories,
  listSendToDestinations,
  listSignalAgentDispatches,
  projectDispatchSettingsQueryKey,
  type SendToDestinationRecord,
  sendSignalToIntegration,
  sendToDestinationsQueryKey,
  setDispatchRepo,
  signalAgentDispatchesQueryKey,
} from "../../../../../../../domains/agent-dispatch/agent-dispatch.functions.ts"
import {
  AGENT_DISPATCH_KIND_ICONS,
  AGENT_DISPATCH_KIND_LABELS,
} from "../../../../../../../domains/agent-dispatch/agent-dispatch-kinds.ts"
import { integrationSlug } from "../../../../../../../domains/integrations/integration-catalog.ts"
import { toUserMessage } from "../../../../../../../lib/errors.ts"
import { SignalDispatchHistory } from "./signal-dispatch-history.tsx"

const failureDescription = (label: string, reason: string): string =>
  reason === "auth" || reason === "config" ? `${label} recusou o envio.` : `Não foi possível acessar ${label}. Tente novamente.`

function dispatchHistoryLink(projectSlug: string, kind: SendToDestinationRecord["kind"]) {
  return (
    <Link
      to="/projects/$projectSlug/settings/integrations/$integrationSlug"
      params={{ projectSlug, integrationSlug: integrationSlug(kind) }}
      className="font-medium underline"
    >
      Ver histórico de envios
    </Link>
  )
}

function dispatchToastDescription(message: string, projectSlug: string, kind: SendToDestinationRecord["kind"]) {
  return (
    <span>
      {message} {dispatchHistoryLink(projectSlug, kind)}
    </span>
  )
}

export function SignalSendTo({
  projectId,
  projectSlug,
  signalId,
  disabled = false,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly signalId: string
  readonly disabled?: boolean
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [cursorRepoModal, setCursorRepoModal] = useState<SendToDestinationRecord | null>(null)

  const { data: dispatches } = useQuery({
    queryKey: signalAgentDispatchesQueryKey(projectId, signalId),
    queryFn: () => listSignalAgentDispatches({ data: { projectId, signalId } }),
    enabled: !disabled && signalId.length > 0,
  })

  const { data: destinations, isLoading: destinationsLoading } = useQuery({
    queryKey: sendToDestinationsQueryKey(projectId),
    queryFn: () => listSendToDestinations({ data: { projectId } }),
  })

  const sendMutation = useMutation({
    mutationFn: (destination: SendToDestinationRecord) =>
      sendSignalToIntegration({
        data: { projectId, signalId, kind: destination.kind, sendId: crypto.randomUUID() },
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: signalAgentDispatchesQueryKey(projectId, signalId) }),
    onSuccess: (result, destination) => {
      const label = AGENT_DISPATCH_KIND_LABELS[destination.kind]
      if (result.status === "dispatched") {
        toast({
          description: dispatchToastDescription(`Enviado para ${label}.`, projectSlug, destination.kind),
          ...(result.externalUrl
            ? {
                action: (
                  <ToastAction altText={`Ver em ${label}`} asChild>
                    <a href={result.externalUrl} target="_blank" rel="noreferrer">
                      Ver
                    </a>
                  </ToastAction>
                ),
              }
            : {}),
        })
      } else if (result.status === "skipped-already-dispatched") {
        toast({
          description: dispatchToastDescription(`Já enviado para ${label}.`, projectSlug, destination.kind),
        })
      } else if (result.status === "not-ready") {
        toast({
          variant: "destructive",
          description: dispatchToastDescription(`Conclua primeiro a configuração de ${label}.`, projectSlug, destination.kind),
        })
      } else {
        toast({
          variant: "destructive",
          description: dispatchToastDescription(
            failureDescription(label, result.reason),
            projectSlug,
            destination.kind,
          ),
        })
      }
    },
    onError: (error, destination) =>
      toast({
        variant: "destructive",
        description: dispatchToastDescription(toUserMessage(error), projectSlug, destination.kind),
      }),
  })

  const sendingKind = sendMutation.isPending ? sendMutation.variables?.kind : undefined

  const hasCloudDestinations = (destinations?.length ?? 0) > 0
  const hasDispatches = !disabled && !!dispatches && dispatches.length > 0

  const menuContent = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="font-medium text-muted-foreground">Agentes na nuvem</DropdownMenuLabel>
      {destinationsLoading ? (
        <DropdownMenuItem disabled className="items-center gap-2">
          <Text.H5 color="foregroundMuted">Carregando integrações…</Text.H5>
        </DropdownMenuItem>
      ) : hasCloudDestinations ? (
        destinations?.map((destination) =>
          !destination.ready && destination.kind !== "cursor" ? (
            <DropdownMenuItem key={destination.kind} asChild className="cursor-pointer items-center gap-2">
              <Link to="/projects/$projectSlug/settings/signals" params={{ projectSlug }} hash={destination.kind}>
                <Icon icon={AGENT_DISPATCH_KIND_ICONS[destination.kind]} size="sm" />
                <Text.H5>{`Concluir configuração de ${AGENT_DISPATCH_KIND_LABELS[destination.kind]}`}</Text.H5>
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={destination.kind}
              disabled={sendMutation.isPending}
              className="cursor-pointer items-center gap-2"
              onSelect={() => {
                if (sendMutation.isPending) return
                if (!destination.ready) {
                  setCursorRepoModal(destination)
                  return
                }
                sendMutation.mutate(destination)
              }}
            >
              {sendingKind === destination.kind ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-70" aria-hidden />
              ) : (
                <Icon icon={AGENT_DISPATCH_KIND_ICONS[destination.kind]} size="sm" />
              )}
              <Text.H5>
                {sendingKind === destination.kind ? "Enviando…" : AGENT_DISPATCH_KIND_LABELS[destination.kind]}
              </Text.H5>
            </DropdownMenuItem>
          ),
        )
      ) : (
        <DropdownMenuItem asChild className="cursor-pointer items-center gap-2">
          <Link to="/projects/$projectSlug/settings/integrations" params={{ projectSlug }}>
            <Icon icon={Plus} size="sm" />
            <Text.H5>Configurar agentes na nuvem</Text.H5>
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="font-medium text-muted-foreground">Agentes locais</DropdownMenuLabel>
      <DropdownMenuItem className="cursor-pointer items-center gap-2" onSelect={() => setPromptModalOpen(true)}>
        <Icon icon={Clipboard} size="sm" />
        <Text.H5>Copiar prompt</Text.H5>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  const modals = (
    <>
      {promptModalOpen ? (
        <CopyPromptModal projectId={projectId} signalId={signalId} onClose={() => setPromptModalOpen(false)} />
      ) : null}
      {cursorRepoModal ? (
        <SendToCursorRepoModal
          projectId={projectId}
          integrationId={cursorRepoModal.integrationId}
          onClose={() => setCursorRepoModal(null)}
          onSaved={(destination) => {
            setCursorRepoModal(null)
            sendMutation.mutate(destination)
          }}
          destination={cursorRepoModal}
        />
      ) : null}
    </>
  )

  // Already dispatched: the primary button opens the dispatch-history popover;
  // the resend menu tucks behind the chevron as a joined split button.
  if (hasDispatches) {
    return (
      <>
        <ButtonGroup>
          <SignalDispatchHistory
            dispatches={dispatches}
            projectSlug={projectSlug}
            triggerClassName="rounded-r-none border-r-0"
          />
          <DropdownMenuRoot modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-l-none px-1.5"
                aria-label="Enviar novamente para o agente"
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Icon icon={ChevronDown} size="sm" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>{menuContent}</DropdownMenuPortal>
          </DropdownMenuRoot>
        </ButtonGroup>
        {modals}
      </>
    )
  }

  return (
    <>
      <DropdownMenuRoot modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-sm" disabled={disabled || sendMutation.isPending}>
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Icon icon={Sparkles} size="sm" />
            )}
            {sendMutation.isPending ? "Enviando…" : "Enviar para agente"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>{menuContent}</DropdownMenuPortal>
      </DropdownMenuRoot>
      {modals}
    </>
  )
}

function SendToCursorRepoModal({
  projectId,
  integrationId,
  destination,
  onClose,
  onSaved,
}: {
  readonly projectId: string
  readonly integrationId: string
  readonly destination: SendToDestinationRecord
  readonly onClose: () => void
  readonly onSaved: (destination: SendToDestinationRecord) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [repoUrl, setRepoUrl] = useState("")

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ["cursor-repositories", integrationId],
    queryFn: () => listCursorRepositories({ data: { integrationId } }),
  })
  const repositoryOptions = repositories.map((repo) => ({
    label: `${repo.owner}/${repo.name}`,
    value: repo.repository,
  }))

  const saveMutation = useMutation({
    mutationFn: () => setDispatchRepo({ data: { kind: "cursor", repoUrl } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sendToDestinationsQueryKey(projectId) })
      await queryClient.invalidateQueries({ queryKey: projectDispatchSettingsQueryKey(projectId, "cursor") })
      onSaved({ ...destination, ready: true, missing: [] })
    },
    onError: (error) => toast({ variant: "destructive", description: toUserMessage(error) }),
  })

  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => (!next ? onClose() : undefined)}
      title="Escolha um repositório"
      description="O Cursor precisa de um repositório antes do envio. Essa escolha será salva para os próximos envios da sua empresa."
      footer={
        <>
          <CloseTrigger />
          <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} disabled={!repoUrl}>
            Salvar e enviar
          </Button>
        </>
      }
    >
      {repositoryOptions.length > 0 ? (
        <Select
          name="repoUrl"
          label="Repositório"
          placeholder={isLoading ? "Carregando repositórios" : "Selecione um repositório"}
          searchable
          loading={isLoading}
          disabled={isLoading}
          options={repositoryOptions}
          value={repoUrl}
          onChange={(value) => setRepoUrl(String(value))}
        />
      ) : (
        <Input
          label="URL do repositório"
          placeholder="https://github.com/acme/app"
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
        />
      )}
    </Modal>
  )
}

function CopyPromptModal({
  projectId,
  signalId,
  onClose,
}: {
  readonly projectId: string
  readonly signalId: string
  readonly onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["signal-dispatch-prompt", projectId, signalId],
    queryFn: () => getSignalDispatchPrompt({ data: { projectId, signalId } }),
  })

  const prompt = data && "prompt" in data ? data.prompt : undefined
  const loadError = data && "error" in data ? data.error : undefined

  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => (!next ? onClose() : undefined)}
      title="Copiar prompt"
      description="Cole isto no Cursor, Claude Code, Codex, OpenCode ou em qualquer agente de código no repositório que produziu estes traces."
      footer={<CloseTrigger />}
    >
      <div className="flex flex-col gap-4">
        {loadError || (!isLoading && !prompt) ? (
          <Text.H6 color="destructive">Não foi possível carregar o prompt. Feche esta janela e tente novamente.</Text.H6>
        ) : isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="group relative">
            <div className="absolute top-0 right-0 z-10 rounded-tr-md rounded-bl-lg bg-muted p-0.5">
              <CopyButton value={prompt ?? ""} tooltip="Copiar" />
            </div>
            <pre className="max-h-80 overflow-y-auto rounded-md bg-muted p-3 pr-12 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
              {prompt}
            </pre>
          </div>
        )}
        <Text.H6 display="block" color="foregroundMuted">
          Funciona melhor com um servidor MCP conectado, mas o prompt já inclui IDs de trace e trechos como evidência inicial.
        </Text.H6>
      </div>
    </Modal>
  )
}
