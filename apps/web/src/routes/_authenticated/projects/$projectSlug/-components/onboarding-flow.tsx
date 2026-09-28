import { Button, Icon, Input, Text, useToast } from "@repo/ui"
import { useNavigate } from "@tanstack/react-router"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { SelectorChip } from "../../../../../components/selector-chip.tsx"
import { VigiaBrand } from "../../../../../components/vigia-brand.tsx"
import { completeProjectOnboarding, updateProject } from "../../../../../domains/projects/projects.functions.ts"
import { countTracesByProject } from "../../../../../domains/traces/traces.functions.ts"
import { getQueryClient } from "../../../../../lib/data/query-client.tsx"
import { toUserMessage } from "../../../../../lib/errors.ts"
import { DEFAULT_VIGIA_AGENT_STACK, VIGIA_AGENT_STACKS, type VigiaAgentStackId } from "./vigia-connection.ts"
import { VigiaConnectionInstructions } from "./vigia-connection-instructions.tsx"

export const ONBOARDING_STEPS = ["agent", "connect"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export function OnboardingFlow({
  projectId,
  projectSlug,
  projectName: initialProjectName,
  persistedProjectName,
  initialStep,
  initialSource = DEFAULT_VIGIA_AGENT_STACK,
  onOpenProjectTraces,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly projectName: string
  readonly persistedProjectName: string
  readonly initialStep?: OnboardingStep
  readonly initialSource?: VigiaAgentStackId
  readonly onOpenProjectTraces: (projectId: string) => Promise<void>
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>(initialStep ?? "agent")
  const [projectName, setProjectName] = useState(initialProjectName)
  const [source, setSource] = useState<VigiaAgentStackId>(initialSource)
  const [isSavingAgent, setIsSavingAgent] = useState(false)
  const [traceReceived, setTraceReceived] = useState(false)

  const projectIdRef = useRef(projectId)
  const onOpenProjectTracesRef = useRef(onOpenProjectTraces)
  const toastRef = useRef(toast)
  projectIdRef.current = projectId
  onOpenProjectTracesRef.current = onOpenProjectTraces
  toastRef.current = toast

  const goToStep = (next: OnboardingStep, selectedSource = source) => {
    setStep(next)
    void navigate({
      to: "/projects/$projectSlug/onboarding",
      params: { projectSlug },
      search: { step: next, source: selectedSource },
      replace: true,
    })
  }

  const handleSourceChange = (nextSource: VigiaAgentStackId) => {
    setSource(nextSource)
  }

  const handleSaveAgent = async () => {
    const trimmedName = projectName.trim()
    if (!trimmedName) {
      toast({ variant: "destructive", description: "Informe um nome para o agente." })
      return
    }

    setIsSavingAgent(true)
    try {
      if (trimmedName !== persistedProjectName) {
        await updateProject({ data: { id: projectId, name: trimmedName } })
        await getQueryClient().invalidateQueries({ queryKey: ["projects"] })
      }
      goToStep("connect")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar o agente",
        description: toUserMessage(error),
      })
    } finally {
      setIsSavingAgent(false)
    }
  }

  useEffect(() => {
    if (step !== "connect") return

    let cancelled = false
    let pollTimeout: number | undefined
    let redirectTimeout: number | undefined

    const schedulePoll = () => {
      if (!cancelled) {
        pollTimeout = window.setTimeout(() => void poll(), 3000)
      }
    }

    const finishConnection = async () => {
      setTraceReceived(true)
      try {
        await completeProjectOnboarding({ data: { projectId: projectIdRef.current } })
        await getQueryClient().invalidateQueries({ queryKey: ["projects"] })
      } catch (error) {
        toastRef.current({
          variant: "destructive",
          description: toUserMessage(error),
        })
      }

      if (cancelled) return
      redirectTimeout = window.setTimeout(() => {
        if (!cancelled) {
          void onOpenProjectTracesRef.current(projectIdRef.current)
        }
      }, 1800)
    }

    const poll = async () => {
      if (cancelled) return

      const count = await countTracesByProject({
        data: { projectId: projectIdRef.current },
      }).catch(() => 0)

      if (cancelled) return
      if (count < 1) {
        schedulePoll()
        return
      }

      await finishConnection()
    }

    void poll()

    return () => {
      cancelled = true
      if (pollTimeout !== undefined) window.clearTimeout(pollTimeout)
      if (redirectTimeout !== undefined) window.clearTimeout(redirectTimeout)
    }
  }, [step])

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden bg-background">
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20 lg:py-16">
        <div className="flex w-full max-w-[640px] flex-col gap-10 self-center">
          <div className="flex items-start">
            <VigiaBrand />
          </div>

          {step === "agent" ? (
            <AgentStep
              projectName={projectName}
              source={source}
              isSaving={isSavingAgent}
              onProjectNameChange={setProjectName}
              onSourceChange={handleSourceChange}
              onContinue={() => void handleSaveAgent()}
            />
          ) : (
            <ConnectionStep
              projectSlug={projectSlug}
              source={source}
              traceReceived={traceReceived}
              onBack={() => goToStep("agent")}
            />
          )}
        </div>
      </div>

      <OnboardingSummary step={step} source={source} traceReceived={traceReceived} />
    </div>
  )
}

function AgentStep({
  projectName,
  source,
  isSaving,
  onProjectNameChange,
  onSourceChange,
  onContinue,
}: {
  readonly projectName: string
  readonly source: VigiaAgentStackId
  readonly isSaving: boolean
  readonly onProjectNameChange: (value: string) => void
  readonly onSourceChange: (source: VigiaAgentStackId) => void
  readonly onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Text.H2 weight="medium">Conecte seu primeiro agente</Text.H2>
        <Text.H4 color="foregroundMuted">
          Dê um nome ao agente e conte como ele foi desenvolvido. O Vigia prepara a conexão por OpenTelemetry.
        </Text.H4>
      </div>

      <div className="flex flex-col gap-6">
        <Input
          required
          type="text"
          label="Nome do agente"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Agente de atendimento"
        />

        <div className="flex flex-col gap-3">
          <Text.H5M>Como seu agente foi desenvolvido?</Text.H5M>
          <div className="flex flex-row flex-wrap gap-2">
            {VIGIA_AGENT_STACKS.map((stack) => (
              <SelectorChip
                key={stack.id}
                selected={source === stack.id}
                onSelect={() => onSourceChange(stack.id)}
                label={stack.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button disabled={isSaving} onClick={onContinue}>
          {isSaving ? "Salvando…" : "Ver instruções de conexão"}
        </Button>
      </div>
    </div>
  )
}

function ConnectionStep({
  projectSlug,
  source,
  traceReceived,
  onBack,
}: {
  readonly projectSlug: string
  readonly source: VigiaAgentStackId
  readonly traceReceived: boolean
  readonly onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-2">
          {traceReceived ? (
            <Icon icon={CheckCircle2} size="sm" color="success" />
          ) : (
            <Icon icon={Loader2} size="sm" color="foregroundMuted" className="animate-spin" />
          )}
          <Text.H5 color={traceReceived ? "success" : "foregroundMuted"}>
            {traceReceived ? "Conectado! Primeiro trace recebido." : "Aguardando a primeira execução…"}
          </Text.H5>
        </div>
        <div className="flex flex-col gap-2">
          <Text.H2 weight="medium">{traceReceived ? "Seu agente está conectado" : "Conecte o agente ao Vigia"}</Text.H2>
          <Text.H4 color="foregroundMuted">
            {traceReceived
              ? "A conexão foi validada. Abrindo os traces do agente…"
              : "Copie a configuração abaixo, execute o agente e deixe esta tela aberta. O Vigia detecta a conexão automaticamente."}
          </Text.H4>
        </div>
      </div>

      <VigiaConnectionInstructions projectSlug={projectSlug} source={source} />

      {!traceReceived ? (
        <div className="flex items-center">
          <Button variant="outline" onClick={onBack}>
            Voltar e editar
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function OnboardingSummary({
  step,
  source,
  traceReceived,
}: {
  readonly step: OnboardingStep
  readonly source: VigiaAgentStackId
  readonly traceReceived: boolean
}) {
  const stack = VIGIA_AGENT_STACKS.find((entry) => entry.id === source)

  return (
    <div className="hidden h-full min-h-0 w-1/2 shrink-0 flex-col justify-center overflow-hidden bg-secondary px-16 lg:flex">
      <div className="flex w-full max-w-[480px] flex-col gap-8 self-center">
        <div className="flex flex-col gap-2">
          <Text.H3 weight="medium">Do agente ao primeiro trace</Text.H3>
          <Text.H5 color="foregroundMuted">
            O cliente configura OpenTelemetry uma vez. O restante da observabilidade acontece dentro do Vigia.
          </Text.H5>
        </div>

        <ProgressItem
          number="1"
          title="Identificar o agente"
          description={stack ? `Tecnologia selecionada: ${stack.label}` : "Nome e tecnologia do agente"}
          complete={step === "connect" || traceReceived}
        />
        <ProgressItem
          number="2"
          title="Conectar por OTLP"
          description={
            traceReceived
              ? "Primeiro trace recebido pelo Vigia."
              : step === "connect"
                ? "Aguardando uma execução do agente."
                : "Endpoint, chave e projeto serão mostrados no próximo passo."
          }
          active={step === "connect" && !traceReceived}
          complete={traceReceived}
        />
      </div>
    </div>
  )
}

function ProgressItem({
  number,
  title,
  description,
  active = false,
  complete = false,
}: {
  readonly number: string
  readonly title: string
  readonly description: string
  readonly active?: boolean
  readonly complete?: boolean
}) {
  return (
    <div className="flex flex-row items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
        {complete ? <Icon icon={CheckCircle2} size="sm" color="success" /> : <Text.H6>{number}</Text.H6>}
      </div>
      <div className="flex flex-col gap-1">
        <Text.H5M>{title}</Text.H5M>
        <Text.H6 color={active ? "foreground" : "foregroundMuted"}>{description}</Text.H6>
      </div>
    </div>
  )
}
