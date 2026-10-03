import type {
  VigiaBusinessProfile,
  VigiaBusinessStackId,
  VigiaChannelId,
  VigiaSuccessOutcomeId,
  VigiaUseCaseId,
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
import { ElusConnection } from "./elus-connection.tsx"
import { resolveVigiaConnectionSource, type VigiaAgentStackId } from "./vigia-connection.ts"
import { VigiaConnectionInstructions } from "./vigia-connection-instructions.tsx"

export const ONBOARDING_STEPS = ["agent", "channels", "stack", "success", "connect"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

const USE_CASE_OPTIONS: ReadonlyArray<{ readonly id: VigiaUseCaseId; readonly label: string }> = [
  { id: "customer-service", label: "Atendimento" },
  { id: "sales", label: "Vendas / qualificação de leads" },
  { id: "scheduling", label: "Agendamento" },
  { id: "billing", label: "Cobrança" },
  { id: "support", label: "Suporte" },
  { id: "post-sales", label: "Pós-venda" },
  { id: "commerce", label: "Pedidos / e-commerce" },
  { id: "internal-operations", label: "Operações internas" },
  { id: "documents", label: "Documentos" },
  { id: "other", label: "Outro" },
]

const CHANNEL_OPTIONS: ReadonlyArray<{ readonly id: VigiaChannelId; readonly label: string }> = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "web-chat", label: "Site / chat" },
  { id: "instagram-messenger", label: "Instagram / Messenger" },
  { id: "voice", label: "Voz / telefone" },
  { id: "email", label: "E-mail" },
  { id: "internal", label: "Uso interno" },
  { id: "other", label: "Outro" },
]

const STACK_OPTIONS: ReadonlyArray<{ readonly id: VigiaBusinessStackId; readonly label: string }> = [
  { id: "elus", label: "Elus" },
  { id: "n8n", label: "n8n" },
  { id: "evolution-api", label: "Evolution API" },
  { id: "flowise", label: "Flowise" },
  { id: "typebot", label: "Typebot" },
  { id: "dify", label: "Dify" },
  { id: "botpress", label: "Botpress" },
  { id: "make-zapier", label: "Make / Zapier" },
  { id: "code-sdk", label: "OpenAI / SDK / código próprio" },
  { id: "other", label: "Outro" },
]

const SUCCESS_OPTIONS: ReadonlyArray<{ readonly id: VigiaSuccessOutcomeId; readonly label: string }> = [
  { id: "resolved-service", label: "Atendimento resolvido" },
  { id: "qualified-lead", label: "Lead qualificado" },
  { id: "conversion", label: "Venda / conversão" },
  { id: "scheduled", label: "Agendamento realizado" },
  { id: "payment", label: "Pagamento realizado" },
  { id: "process-completed", label: "Processo concluído" },
  { id: "time-cost-reduction", label: "Redução de tempo / custo" },
  { id: "other", label: "Outro resultado" },
]

function toggleValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

function labelFor<T extends string>(
  options: ReadonlyArray<{ readonly id: T; readonly label: string }>,
  value: T | null | undefined,
): string | null {
  return options.find((option) => option.id === value)?.label ?? null
}

export function OnboardingFlow({
  projectId,
  projectSlug,
  projectName: initialProjectName,
  persistedProjectName,
  initialStep,
  initialBusinessProfile,
  elusState,
  elusCodeChallenge,
  elusConnected = false,
  onOpenProjectTraces,
}: {
  readonly projectId: string
  readonly projectSlug: string
  readonly projectName: string
  readonly persistedProjectName: string
  readonly initialStep?: OnboardingStep
  readonly initialBusinessProfile?: VigiaBusinessProfile | undefined
  readonly elusState?: string | undefined
  readonly elusCodeChallenge?: string | undefined
  readonly elusConnected?: boolean | undefined
  readonly onOpenProjectTraces: (projectId: string) => Promise<void>
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>(initialBusinessProfile ? (initialStep ?? "agent") : "agent")
  const [projectName, setProjectName] = useState(initialProjectName)
  const [useCase, setUseCase] = useState<VigiaUseCaseId | null>(initialBusinessProfile?.useCase ?? null)
  const [channels, setChannels] = useState<VigiaChannelId[]>(initialBusinessProfile?.channels ?? [])
  const [stack, setStack] = useState<VigiaBusinessStackId[]>(initialBusinessProfile?.stack ?? [])
  const [successOutcomes, setSuccessOutcomes] = useState<VigiaSuccessOutcomeId[]>(
    initialBusinessProfile?.successOutcomes ?? [],
  )
  const [successOther, setSuccessOther] = useState(initialBusinessProfile?.successOther ?? "")
  const [isSavingAgent, setIsSavingAgent] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [traceReceived, setTraceReceived] = useState(false)

  const projectIdRef = useRef(projectId)
  const onOpenProjectTracesRef = useRef(onOpenProjectTraces)
  const toastRef = useRef(toast)
  projectIdRef.current = projectId
  onOpenProjectTracesRef.current = onOpenProjectTraces
  toastRef.current = toast

  const connectionSource = resolveVigiaConnectionSource(stack)

  const goToStep = (next: OnboardingStep) => {
    setStep(next)
    void navigate({
      to: "/projects/$projectSlug/onboarding",
      params: { projectSlug },
      search: { step: next },
      replace: true,
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

    setIsSavingAgent(true)
    try {
      if (trimmedName !== persistedProjectName) {
        await updateProject({ data: { id: projectId, name: trimmedName } })
        await getQueryClient().invalidateQueries({ queryKey: ["projects"] })
      }
      goToStep("channels")
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

  const handleChannelsContinue = () => {
    if (channels.length < 1) {
      toast({ variant: "destructive", description: "Escolha pelo menos um canal." })
      return
    }
    goToStep("stack")
  }

  const handleStackContinue = () => {
    if (stack.length < 1) {
      toast({ variant: "destructive", description: "Escolha pelo menos uma peça da solução." })
      return
    }
    goToStep("success")
  }

  const handleSaveProfile = async () => {
    if (!useCase || channels.length < 1 || stack.length < 1) {
      toast({ variant: "destructive", description: "Revise as etapas anteriores antes de conectar." })
      return
    }
    if (successOutcomes.length < 1) {
      toast({ variant: "destructive", description: "Escolha pelo menos um resultado de sucesso." })
      return
    }

    const trimmedSuccessOther = successOther.trim()
    if (successOutcomes.includes("other") && !trimmedSuccessOther) {
      toast({ variant: "destructive", description: "Descreva o outro resultado que significa sucesso." })
      return
    }

    const businessProfile: VigiaBusinessProfile = {
      useCase,
      channels,
      stack,
      successOutcomes,
      ...(successOutcomes.includes("other") && trimmedSuccessOther ? { successOther: trimmedSuccessOther } : {}),
    }

    setIsSavingProfile(true)
    try {
      await updateProject({
        data: {
          id: projectId,
          settings: { businessProfile },
        },
      })
      await getQueryClient().invalidateQueries({ queryKey: ["projects"] })
      goToStep("connect")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar o perfil do agente",
        description: toUserMessage(error),
      })
    } finally {
      setIsSavingProfile(false)
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
        data: {
          projectId: projectIdRef.current,
          ...(connectionSource === "elus"
            ? { filters: { serviceNames: [{ op: "eq" as const, value: "elus" }] } }
            : {}),
        },
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
  }, [connectionSource, step])

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden bg-background">
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20 lg:py-16">
        <div className="flex w-full max-w-[640px] flex-col gap-10 self-center">
          <div className="flex items-start">
            <VigiaBrand />
          </div>

          {step === "agent" ? (
            <PurposeStep
              projectName={projectName}
              useCase={useCase}
              isSaving={isSavingAgent}
              onProjectNameChange={setProjectName}
              onUseCaseChange={setUseCase}
              onContinue={() => void handleSaveAgent()}
            />
          ) : step === "channels" ? (
            <ChannelsStep
              channels={channels}
              onToggle={(channel) => setChannels((current) => toggleValue(current, channel))}
              onBack={() => goToStep("agent")}
              onContinue={handleChannelsContinue}
            />
          ) : step === "stack" ? (
            <StackStep
              stack={stack}
              onToggle={(entry) => setStack((current) => toggleValue(current, entry))}
              onBack={() => goToStep("channels")}
              onContinue={handleStackContinue}
            />
          ) : step === "success" ? (
            <SuccessStep
              outcomes={successOutcomes}
              successOther={successOther}
              isSaving={isSavingProfile}
              onToggle={(outcome) => setSuccessOutcomes((current) => toggleValue(current, outcome))}
              onSuccessOtherChange={setSuccessOther}
              onBack={() => goToStep("stack")}
              onContinue={() => void handleSaveProfile()}
            />
          ) : (
            <ConnectionStep
              projectSlug={projectSlug}
              source={connectionSource}
              stack={stack}
              traceReceived={traceReceived}
              elusState={elusState}
              elusCodeChallenge={elusCodeChallenge}
              elusConnected={elusConnected}
              onBack={() => goToStep("success")}
            />
          )}
        </div>
      </div>

      <OnboardingSummary
        step={step}
        useCase={useCase}
        stack={stack}
        successOutcomes={successOutcomes}
        traceReceived={traceReceived}
      />
    </div>
  )
}

function PurposeStep({
  projectName,
  useCase,
  isSaving,
  onProjectNameChange,
  onUseCaseChange,
  onContinue,
}: {
  readonly projectName: string
  readonly useCase: VigiaUseCaseId | null
  readonly isSaving: boolean
  readonly onProjectNameChange: (value: string) => void
  readonly onUseCaseChange: (value: VigiaUseCaseId) => void
  readonly onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Text.H2 weight="medium">O que esse agente faz?</Text.H2>
        <Text.H4 color="foregroundMuted">
          Comece pelo trabalho que a empresa espera dele. A tecnologia vem depois.
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
          <Text.H5M>Função principal</Text.H5M>
          <div className="flex flex-row flex-wrap gap-2">
            {USE_CASE_OPTIONS.map((option) => (
              <SelectorChip
                key={option.id}
                selected={useCase === option.id}
                onSelect={() => onUseCaseChange(option.id)}
                label={option.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button disabled={isSaving} onClick={onContinue}>
          {isSaving ? "Salvando…" : "Continuar"}
        </Button>
      </div>
    </div>
  )
}

function ChannelsStep({
  channels,
  onToggle,
  onBack,
  onContinue,
}: {
  readonly channels: readonly VigiaChannelId[]
  readonly onToggle: (value: VigiaChannelId) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}) {
  return (
    <ChoiceStep
      title="Onde ele funciona?"
      description="Marque todos os canais em que esse agente atende pessoas ou executa trabalho."
      options={CHANNEL_OPTIONS}
      selected={channels}
      onToggle={onToggle}
      onBack={onBack}
      onContinue={onContinue}
    />
  )
}

function StackStep({
  stack,
  onToggle,
  onBack,
  onContinue,
}: {
  readonly stack: readonly VigiaBusinessStackId[]
  readonly onToggle: (value: VigiaBusinessStackId) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}) {
  return (
    <ChoiceStep
      title="Como ele foi montado?"
      description="Pode marcar várias peças. Exemplo: Evolution API + n8n + OpenAI + CRM."
      options={STACK_OPTIONS}
      selected={stack}
      onToggle={onToggle}
      onBack={onBack}
      onContinue={onContinue}
    />
  )
}

function ChoiceStep<T extends string>({
  title,
  description,
  options,
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  readonly title: string
  readonly description: string
  readonly options: ReadonlyArray<{ readonly id: T; readonly label: string }>
  readonly selected: readonly T[]
  readonly onToggle: (value: T) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Text.H2 weight="medium">{title}</Text.H2>
        <Text.H4 color="foregroundMuted">{description}</Text.H4>
      </div>

      <div className="flex flex-row flex-wrap gap-2">
        {options.map((option) => (
          <SelectorChip
            key={option.id}
            selected={selected.includes(option.id)}
            onSelect={() => onToggle(option.id)}
            label={option.label}
          />
        ))}
      </div>

      <StepActions onBack={onBack} onContinue={onContinue} />
    </div>
  )
}

function SuccessStep({
  outcomes,
  successOther,
  isSaving,
  onToggle,
  onSuccessOtherChange,
  onBack,
  onContinue,
}: {
  readonly outcomes: readonly VigiaSuccessOutcomeId[]
  readonly successOther: string
  readonly isSaving: boolean
  readonly onToggle: (value: VigiaSuccessOutcomeId) => void
  readonly onSuccessOtherChange: (value: string) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Text.H2 weight="medium">O que significa sucesso para esse agente?</Text.H2>
        <Text.H4 color="foregroundMuted">
          O Vigia usa isso para falar de resultado, não só de traces e falhas técnicas.
        </Text.H4>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-row flex-wrap gap-2">
          {SUCCESS_OPTIONS.map((option) => (
            <SelectorChip
              key={option.id}
              selected={outcomes.includes(option.id)}
              onSelect={() => onToggle(option.id)}
              label={option.label}
            />
          ))}
        </div>

        {outcomes.includes("other") ? (
          <Input
            type="text"
            label="Outro resultado"
            value={successOther}
            onChange={(event) => onSuccessOtherChange(event.target.value)}
            placeholder="Ex.: orçamento aprovado"
          />
        ) : null}
      </div>

      <StepActions
        onBack={onBack}
        onContinue={onContinue}
        continueLabel={isSaving ? "Salvando…" : "Preparar conexão"}
        disabled={isSaving}
      />
    </div>
  )
}

function StepActions({
  onBack,
  onContinue,
  continueLabel = "Continuar",
  disabled = false,
}: {
  readonly onBack: () => void
  readonly onContinue: () => void
  readonly continueLabel?: string
  readonly disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" disabled={disabled} onClick={onBack}>
        Voltar
      </Button>
      <Button disabled={disabled} onClick={onContinue}>
        {continueLabel}
      </Button>
    </div>
  )
}

function ConnectionStep({
  projectSlug,
  source,
  stack,
  traceReceived,
  elusState,
  elusCodeChallenge,
  elusConnected,
  onBack,
}: {
  readonly projectSlug: string
  readonly source: VigiaAgentStackId
  readonly stack: readonly VigiaBusinessStackId[]
  readonly traceReceived: boolean
  readonly elusState?: string | undefined
  readonly elusCodeChallenge?: string | undefined
  readonly elusConnected: boolean
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
            {traceReceived ? "Dados recebidos ✓" : "Aguardando a primeira execução…"}
          </Text.H5>
        </div>
        <div className="flex flex-col gap-2">
          <Text.H2 weight="medium">{traceReceived ? "Seu agente está sendo monitorado" : "Conecte o agente ao Vigia"}</Text.H2>
          <Text.H4 color="foregroundMuted">
            {traceReceived
              ? "A conexão foi validada. Abrindo os traces do agente…"
              : "Siga somente a instrução relevante para a sua stack e execute o agente. O Vigia detecta a conexão automaticamente."}
          </Text.H4>
        </div>
      </div>

      {source === "elus" ? (
        <ElusConnection
          projectSlug={projectSlug}
          state={elusState}
          codeChallenge={elusCodeChallenge}
          connected={elusConnected}
          traceReceived={traceReceived}
        />
      ) : (
        <VigiaConnectionInstructions projectSlug={projectSlug} source={source} stack={stack} />
      )}

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
  useCase,
  stack,
  successOutcomes,
  traceReceived,
}: {
  readonly step: OnboardingStep
  readonly useCase: VigiaUseCaseId | null
  readonly stack: readonly VigiaBusinessStackId[]
  readonly successOutcomes: readonly VigiaSuccessOutcomeId[]
  readonly traceReceived: boolean
}) {
  const stepIndex = ONBOARDING_STEPS.indexOf(step)
  const useCaseLabel = labelFor(USE_CASE_OPTIONS, useCase)
  const stackLabel =
    stack.length > 0 ? stack.map((entry) => labelFor(STACK_OPTIONS, entry)).filter(Boolean).join(" + ") : null

  return (
    <div className="hidden h-full min-h-0 w-1/2 shrink-0 flex-col justify-center overflow-hidden bg-secondary px-16 lg:flex">
      <div className="flex w-full max-w-[480px] flex-col gap-8 self-center">
        <div className="flex flex-col gap-2">
          <Text.H3 weight="medium">Do negócio ao primeiro resultado</Text.H3>
          <Text.H5 color="foregroundMuted">
            O Vigia entende o que importa para a empresa antes de pedir qualquer configuração técnica.
          </Text.H5>
        </div>

        <ProgressItem
          number="1"
          title="Entender o agente"
          description={useCaseLabel ?? "O que ele faz para a empresa"}
          active={stepIndex === 0}
          complete={stepIndex > 0}
        />
        <ProgressItem
          number="2"
          title="Mapear a operação"
          description={stackLabel ?? "Canais e peças que formam a solução"}
          active={stepIndex === 1 || stepIndex === 2}
          complete={stepIndex > 2}
        />
        <ProgressItem
          number="3"
          title="Definir sucesso"
          description={
            successOutcomes.length > 0
              ? `${successOutcomes.length} resultado${successOutcomes.length === 1 ? "" : "s"} selecionado${successOutcomes.length === 1 ? "" : "s"}`
              : "O que significa resultado de negócio"
          }
          active={stepIndex === 3}
          complete={stepIndex > 3}
        />
        <ProgressItem
          number="4"
          title="Conectar e testar"
          description={traceReceived ? "Primeiro trace recebido pelo Vigia." : "Aguardando uma execução real do agente."}
          active={stepIndex === 4 && !traceReceived}
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
