import type {
  VigiaAgentBuildStack,
  VigiaAgentChannel,
  VigiaAgentSuccessOutcome,
  VigiaAgentUseCase,
} from "@domain/shared"

export interface VigiaBusinessOption<T extends string> {
  readonly id: T
  readonly label: string
}

export const VIGIA_USE_CASE_OPTIONS: ReadonlyArray<VigiaBusinessOption<VigiaAgentUseCase>> = [
  { id: "atendimento", label: "Atendimento" },
  { id: "vendas", label: "Vendas e qualificação" },
  { id: "agendamento", label: "Agendamento" },
  { id: "cobranca", label: "Cobrança" },
  { id: "suporte", label: "Suporte" },
  { id: "pos-venda", label: "Pós-venda" },
  { id: "pedidos-ecommerce", label: "Pedidos e e-commerce" },
  { id: "operacoes-internas", label: "Operações internas" },
  { id: "documentos", label: "Documentos" },
  { id: "outro", label: "Outro" },
]

export const VIGIA_CHANNEL_OPTIONS: ReadonlyArray<VigiaBusinessOption<VigiaAgentChannel>> = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "site-chat", label: "Site / chat" },
  { id: "instagram-messenger", label: "Instagram / Messenger" },
  { id: "voz-telefone", label: "Voz / telefone" },
  { id: "email", label: "E-mail" },
  { id: "interno", label: "Uso interno" },
  { id: "outro", label: "Outro" },
]

export const VIGIA_BUILD_STACK_OPTIONS: ReadonlyArray<VigiaBusinessOption<VigiaAgentBuildStack>> = [
  { id: "n8n", label: "n8n" },
  { id: "evolution-api", label: "Evolution API" },
  { id: "flowise", label: "Flowise" },
  { id: "typebot", label: "Typebot" },
  { id: "dify", label: "Dify" },
  { id: "botpress", label: "Botpress" },
  { id: "make-zapier", label: "Make / Zapier" },
  { id: "codigo-proprio", label: "Código próprio" },
  { id: "nao-sei", label: "Não sei" },
  { id: "outro", label: "Outro" },
]

export const VIGIA_SUCCESS_OPTIONS: ReadonlyArray<VigiaBusinessOption<VigiaAgentSuccessOutcome>> = [
  { id: "atendimento-resolvido", label: "Atendimento resolvido" },
  { id: "lead-qualificado", label: "Lead qualificado" },
  { id: "venda-conversao", label: "Venda / conversão" },
  { id: "agendamento-realizado", label: "Agendamento realizado" },
  { id: "pagamento-realizado", label: "Pagamento realizado" },
  { id: "tarefa-concluida", label: "Tarefa concluída" },
  { id: "reducao-tempo-custo", label: "Redução de tempo / custo" },
  { id: "outro", label: "Outro resultado" },
]

export const vigiaUseCaseLabel = (value: VigiaAgentUseCase | null | undefined): string | null =>
  VIGIA_USE_CASE_OPTIONS.find((option) => option.id === value)?.label ?? null

export const vigiaChannelLabels = (values: readonly VigiaAgentChannel[]): string[] =>
  values.flatMap((value) => {
    const label = VIGIA_CHANNEL_OPTIONS.find((option) => option.id === value)?.label
    return label ? [label] : []
  })

export const vigiaSuccessLabels = (values: readonly VigiaAgentSuccessOutcome[]): string[] =>
  values.flatMap((value) => {
    const label = VIGIA_SUCCESS_OPTIONS.find((option) => option.id === value)?.label
    return label ? [label] : []
  })
