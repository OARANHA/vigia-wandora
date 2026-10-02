import type {
  VigiaAgentBuildStack,
  VigiaAgentChannel,
  VigiaAgentSuccessOutcome,
  VigiaAgentUseCase,
  VigiaBusinessProfile,
} from "@domain/shared"
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
import {
  VIGIA_BUILD_STACK_OPTIONS,
  VIGIA_CHANNEL_OPTIONS,
  VIGIA_SUCCESS_OPTIONS,
  VIGIA_USE_CASE_OPTIONS,
  vigiaChannelLabels,
  vigiaSuccessLabels,
  vigiaUseCaseLabel,
} from "./vigia-business-profile.ts"
import {
  DEFAULT_VIGIA_AGENT_STACK,
  suggestVigiaConnectionSource,
  type VigiaAgentStackId,
} from "./vigia-connection.ts"
import { VigiaConnectionInstructions } from "./vigia-connection-instructions.tsx"

export const ONBOARDING_STEPS = ["agent", "connect"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

const toggleValue = <T extends string>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]

export function OnboardingFlow({
  projectId,
  projectSlug,
  projectName: initialProjectName,
  persistedProjectName,
  initialBusinessProfile,
  initialStep,
  initialSource,
  onOpenProjectTraces,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly projectName: string
  readonly persistedProjectName: string
  readonly initialBusinessProfile?: VigiaBusinessProfile | undefined
  readonly initialStep?: OnboardingStep
  readonly initialSource?: VigiaAgentStackId
  readonly onOpenProjectTraces: (projectId: string) => Promise<void>
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>(initialStep ?? "agent")
  const [projectName, setProjectName] = useState(initialProjectName)
  const [useCase, setUseCase] = useState<VigiaAgentUseCase | null>(initialBusinessProfile?.useCase ?? null)
  const [channels, setChannels] = useState<VigiaAgentChannel[]>(initialBusinessProfile?.channels ?? [])
  const [buildStack, setBuildStack] = useState<VigiaAgentBuildStack[]>(initialBusinessProfile?.buildStack ?? [])
  const [successOutcomes, setSuccessOutcomes] = useState<VigiaAgentSuccessOutcome[]>(
    initialBusinessProfile?.successOutcomes ?? [],
  )
  const [source, setSource] = useState<VigiaAgentStackId>(
    initialSource ?? suggestVigiaConnectionSource(initialBusinessProfile?.buildStack ?? []) ?? DEFAULT_VIGIA_AGENT_STACK,
  )
  const [isSavingAgent, setIsSavingAgent] = useState(false)
  const [traceReceived, setTraceReceived] = useState(false)

  const projectIdRef = useRef(projectId)
  const onOpenProjectTracesRef = useRef(onOpenProjectTraces)
  const toastRef = useRef(toast)
  projectIdRef.current = projectId
  onOpenProjectTracesRef.current = onOpenProjectTraces
  toastRef.current = toast

  const businessProfile: VigiaBusinessProfile | null =
    useCase && channels.length > 0 && buildStack.length > 0 && successOutcomes.length > 0
      ? { useCase, channels, buildStack, successOutcomes }
      : null

  const goToStep = (next: OnboardingStep, selectedSource = source) => {
    setStep(next)
    setSource(selectedSource)
    void navigate({
      to: "/projects/$projectSlug/onboarding",
      params: { projectSlug },
      search: { step: next, source: selectedSource },
      replace: true,
    })
  }

  const handleBuildStackToggle = (value: VigiaAgentBuildStack) => {
    setBuildStack((current) => {
      if (value === "nao-sei") {
        return current.includes(value) ? [] : [value]
      }
      return toggleValue(
        current.filter((entry) => entry !== "nao-sei"),
        value,
      )
    })
  }

  const handleSaveAgent = async () => {
    const trimmedName = projectName.trim()
    if (!trimmedName) {
      toast({ variant: "destructive", description: "Informe um nome para o agente." })
      return
    }
    if (!useCase) {
      toast({ variant: "destructive", description: "Escolha o que esse agente faz." })
      return
    }
    if (channels.length === 0) {
      toast({ variant: "destructive", description: "Escolha onde esse agente funciona." })
      return
    }
    if (buildStack.length === 0) {
      toast({ variant: "destructive", description: "Marque como o agente foi montado ou escolha “Não sei”." })
      return
    }
    if (successOutcomes.length === 0) {
      toast({ variant: "destructive", description: "Escolha pelo menos um resultado importante para esse agente." })
      return
    }

    const profile: VigiaBusinessProfile = { useCase, channels, buildStack, successOutcomes }
    const nextSource = suggestVigiaConnectionSource(buildStack)

    setIsSavingAgent(true)
    try {
      await updateProject({
        data: {
          id: projectId,
          ...(trimmedName !== persistedProjectName ? { name: trimmedName } : {}),
          settings: { vigiaBusinessProfile: profile },
        },
      })
      await getQueryClient().invalidateQueries({ queryKey: ["projects"] })
      goToStep("connect", nextSource)
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
              useCase={useCase}
              channels={channels}
              buildStack={buildStack}
              successOutcomes={successOutcomes}
              isSaving={isSavingAgent}
              onProjectNameChange={setProjectName}
              onUseCaseChange={setUseCase}
              onChannelToggle={(value) => setChannels((current) => toggleValue(current, value))}
              onBuildStackToggle={handleBuildStackToggle}
              onSuccessToggle={(value) => setSuccessOutcomes((current) => toggleValue(current, value))}
              onContinue={() => void handleSaveAgent()}
            />
          ) : (
            <ConnectionStep
              projectSlug={projectSlug}
              source={source}
              businessProfile={businessProfile ?? initialBusinessProfile}
              traceReceived={traceReceived}
              onBack={() => goToStep("agent")}
            />
          )}
        </div>
      </div>

      <OnboardingSummary
        step={step}
        businessProfile={businessProfile ?? initialBusinessProfile}
        traceReceived={traceReceived}
      />
    </div>
  )
}

function AgentStep({
  projectName,
  useCase,
  channels,
  buildStack,
  successOutcomes,
  isSaving,
  onProjectNameChange,
  onUseCaseChange,
  onChannelToggle,
  onBuildStackToggle,
  onSuccessToggle,
  onContinue,
}: {
  readonly projectName: string
  readonly useCase: VigiaAgentUseCase | null
  readonly channels: readonly VigiaAgentChannel[]
  readonly buildStack: readonly VigiaAgentBuildStack[]
  readonly successOutcomes: readonly VigiaAgentSuccessOutcome[]
  readonly isSaving: boolean
  readonly onProjectNameChange: (value: string) => void
  readonly onUseCaseChange: (value: VigiaAgentUseCase) => void
  readonly onChannelToggle: (value: VigiaAgentChannel) => void
  readonly onBuildStackToggle: (value: VigiaAgentBuildStack) => void
  readonly onSuccessToggle: (value: VigiaAgentSuccessOutcome) => void
  readonly onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Text.H2 weight="medium">Conte ao Vigia sobre seu agente</Text.H2>
        <Text.H4 color="foregroundMuted">
          Isso define o que vamos acompanhar e prepara a conexão sem exigir conhecimento de observabilidade.
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

        <ChoiceGroup label="O que esse agente faz?">
          {VIGIA_USE_CASE_OPTIONS.map((option) => (
            <SelectorChip
              key={option.id}
              selected={useCase === option.id}
              onSelect={() => onUseCaseChange(option.id)}
              label={option.label}
            />
          ))}
        </ChoiceGroup>

        <ChoiceGroup label="Onde ele funciona?" description="Escolha um ou mais canais.">
          {VIGIA_CHANNEL_OPTIONS.map((option) => (
            <SelectorChip
              key={option.id}
              selected={channels.includes(option.id)}
              onSelect={() => onChannelToggle(option.id)}
              label={option.label}
            />
          ))}
        </ChoiceGroup>

        <ChoiceGroup label="Como ele foi montado?" description="Marque as peças que fazem parte da solução.">
          {VIGIA_BUILD_STACK_OPTIONS.map((option) => (
            <SelectorChip
              key={option.id}
              selected={buildStack.includes(option.id)}
              onSelect={() => onBuildStackToggle(option.id)}
              label={option.label}
            />
          ))}
        </ChoiceGroup>

        <ChoiceGroup label="O que significa sucesso para esse agente?" description="Escolha os resultados que importam.">
          {VIGIA_SUCCESS_OPTIONS.map((option) => (
            <SelectorChip
              key={option.id}
              selected={successOutcomes.includes(option.id)}
              onSelect={() => onSuccessToggle(option.id)}
              label={option.label}
            />
          ))}
        </ChoiceGroup>
      </div>

      <div className="flex items-center justify-end">
        <Button disabled={isSaving} onClick={onContinue}>
          {isSaving ? "Salvando…" : "Salvar e preparar conexão"}
        </Button>
      </div>
    </div>
  )
}

function ChoiceGroup({
  label,
  description,
  children,
}: {
  readonly label: string
  readonly description?: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Text.H5M>{label}</Text.H5M>
        {description ? <Text.H6 color="foregroundMuted">{description}</Text.H6> : null}
      </div>
      <div className="flex flex-row flex-wrap gap-2">{children}</div>
    </div>
  )
}

function ConnectionStep({
  projectSlug,
  source,
  businessProfile,
  traceReceived,
  onBack,
}: {
  readonly projectSlug: string
  readonly source: VigiaAgentStackId
  readonly businessProfile?: VigiaBusinessProfile | undefined
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
            {traceReceived ? "Conectado! Primeira execução recebida." : "Aguardando a primeira execução…"}
          </Text.H5>
        </div>
        <div className="flex flex-col gap-2">
          <Text.H2 weight="medium">{traceReceived ? "Seu agente está conectado" : "Conecte o agente ao Vigia"}</Text.H2>
          <Text.H4 color="foregroundMuted">
            {traceReceived
              ? "A conexão foi validada. Abrindo o Vigia…"
              : "Siga os passos abaixo na ferramenta que já executa seu agente. O Vigia confirma a conexão automaticamente."}
          </Text.H4>
        </div>
      </div>

      <VigiaConnectionInstructions projectSlug={projectSlug} source={source} businessProfile={businessProfile} />

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
  businessProfile,
  traceReceived,
}: {
  readonly step: OnboardingStep
  readonly businessProfile?: VigiaBusinessProfile | undefined
  readonly traceReceived: boolean
}) {
  const useCase = vigiaUseCaseLabel(businessProfile?.useCase)
  const channels = vigiaChannelLabels(businessProfile?.channels ?? [])
  const success = vigiaSuccessLabels(businessProfile?.successOutcomes ?? [])

  const contextDescription =
    useCase && channels.length > 0 ? `${useCase} em ${channels.join(", ")}` : "Função, canal e tecnologia do agente"
  const successDescription =
    success.length > 0 ? success.join(", ") : "Defina os resultados que o Vigia deve acompanhar"

  return (
    <div className="hidden h-full min-h-0 w-1/2 shrink-0 flex-col justify-center overflow-hidden bg-secondary px-16 lg:flex">
      <div className="flex w-full max-w-[480px] flex-col gap-8 self-center">
        <div className="flex flex-col gap-2">
          <Text.H3 weight="medium">Do agente ao resultado</Text.H3>
          <Text.H5 color="foregroundMuted">
            O Vigia transforma a execução em saúde, falhas, custo e resultado. O detalhe técnico continua disponível
            quando alguém precisar investigar.
          </Text.H5>
        </div>

        <ProgressItem
          number="1"
          title="Entender a operação"
          description={contextDescription}
          complete={step === "connect" || traceReceived}
        />
        <ProgressItem
          number="2"
          title="Conectar a execução"
          description={
            traceReceived
              ? "Primeira execução recebida pelo Vigia."
              : step === "connect"
                ? "Aguardando uma execução do agente."
                : "O Vigia prepara a conexão de acordo com a sua tecnologia."
          }
          active={step === "connect" && !traceReceived}
          complete={traceReceived}
        />
        <ProgressItem
          number="3"
          title="Acompanhar resultado"
          description={successDescription}
          active={traceReceived}
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
