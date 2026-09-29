import type { FLAGGER_STRATEGY_SLUGS } from "@domain/flaggers"

export type FlaggerPresetSlug = (typeof FLAGGER_STRATEGY_SLUGS)[number]

interface FlaggerUseCasePreset {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly enabledSlugs: ReadonlyArray<FlaggerPresetSlug>
}

export const FLAGGER_DISPLAY_PT_BR = {
  frustration: {
    name: "Frustração",
    description: "A conversa mostra frustração ou insatisfação clara do usuário.",
  },
  nsfw: {
    name: "NSFW",
    description: "Aparece conteúdo impróprio, tóxico ou inadequado para o ambiente de trabalho.",
  },
  refusal: {
    name: "Recusa indevida",
    description: "O agente recusa uma solicitação que deveria conseguir atender.",
  },
  laziness: {
    name: "Baixo esforço",
    description: "O agente evita executar o trabalho solicitado ou entrega apenas uma parte superficial.",
  },
  jailbreaking: {
    name: "Tentativa de jailbreak",
    description: "Há tentativas de contornar instruções do sistema ou restrições de segurança.",
  },
  forgetting: {
    name: "Esquecimento de contexto",
    description: "O agente perde contexto ou instruções relevantes já estabelecidas na conversa.",
  },
  trashing: {
    name: "Ciclo sem progresso",
    description: "O agente alterna ou repete ferramentas sem avançar de forma útil.",
  },
  bluffing: {
    name: "Falso sucesso",
    description: "O agente segue adiante após uma falha de ferramenta como se a operação tivesse funcionado.",
  },
  "pii-leakage": {
    name: "Vazamento de PII",
    description: "A resposta do agente expõe dados pessoais que não deveriam ter sido revelados.",
  },
  incompletion: {
    name: "Tarefa incompleta",
    description: "O agente não conclui a tarefa atribuída e força o usuário a pedir continuidade ou correção.",
  },
  "tool-call-errors": {
    name: "Erros em chamadas de ferramenta",
    description: "Detecta respostas de ferramenta malformadas, duplicadas ou com falha explícita sem chamar um LLM.",
  },
  "output-schema-validation": {
    name: "Validação de schema de saída",
    description: "Detecta saída estruturada malformada ou truncada sem chamar um LLM.",
  },
  "empty-response": {
    name: "Resposta vazia",
    description: "Detecta respostas vazias, compostas apenas por espaços ou degeneradas sem chamar um LLM.",
  },
  "low-cache-hit-rate": {
    name: "Baixa taxa de acerto de cache",
    description: "Detecta traces longos em que o cache está ativo, mas reaproveita poucos tokens de entrada.",
  },
  "task-failure": {
    name: "Falha na tarefa",
    description: "A sessão termina com um objetivo relevante do usuário ainda não resolvido.",
  },
} as const satisfies Record<FlaggerPresetSlug, { readonly name: string; readonly description: string }>

export const FLAGGER_USE_CASE_PRESETS = [
  {
    id: "support-agent",
    label: "Agente de suporte",
    description: "Assistentes que atendem clientes, respondem dúvidas, tratam escaladas e executam fluxos de conta.",
    enabledSlugs: [
      "task-failure",
      "frustration",
      "refusal",
      "forgetting",
      "incompletion",
      "tool-call-errors",
      "empty-response",
      "jailbreaking",
      "nsfw",
      "pii-leakage",
    ],
  },
  {
    id: "coding-agent",
    label: "Agente de programação",
    description: "Agentes que editam arquivos, usam ferramentas e executam tarefas de implementação em várias etapas.",
    enabledSlugs: [
      "task-failure",
      "laziness",
      "trashing",
      "bluffing",
      "incompletion",
      "tool-call-errors",
      "empty-response",
      "refusal",
      "forgetting",
      "output-schema-validation",
      "frustration",
      "low-cache-hit-rate",
      "jailbreaking",
      "pii-leakage",
    ],
  },
  {
    id: "sales-agent",
    label: "Agente de vendas",
    description: "Assistentes de qualificação e vendas em que tom, continuidade e conclusão importam.",
    enabledSlugs: [
      "task-failure",
      "frustration",
      "refusal",
      "forgetting",
      "incompletion",
      "empty-response",
      "jailbreaking",
      "nsfw",
      "pii-leakage",
    ],
  },
  {
    id: "tool-workflow-agent",
    label: "Agente de fluxos com ferramentas",
    description: "Agentes que coordenam ferramentas, APIs e fluxos estruturados.",
    enabledSlugs: [
      "task-failure",
      "tool-call-errors",
      "trashing",
      "bluffing",
      "incompletion",
      "output-schema-validation",
      "empty-response",
      "laziness",
      "low-cache-hit-rate",
      "jailbreaking",
      "pii-leakage",
    ],
  },
  {
    id: "knowledge-base-agent",
    label: "Agente de base de conhecimento",
    description: "Assistentes de RAG e documentação que precisam preservar contexto e responder de forma direta.",
    enabledSlugs: [
      "task-failure",
      "forgetting",
      "refusal",
      "incompletion",
      "empty-response",
      "frustration",
      "laziness",
      "low-cache-hit-rate",
      "jailbreaking",
      "pii-leakage",
    ],
  },
  {
    id: "structured-extraction-agent",
    label: "Extração estruturada",
    description: "Agentes de extração e classificação que retornam saídas estruturadas para consumo por sistemas.",
    enabledSlugs: [
      "task-failure",
      "output-schema-validation",
      "empty-response",
      "tool-call-errors",
      "laziness",
      "jailbreaking",
      "pii-leakage",
    ],
  },
  {
    id: "safety-agent",
    label: "Agente de segurança",
    description: "Assistentes de moderação ou sensíveis a políticas, expostos a entradas adversariais ou inseguras.",
    enabledSlugs: ["task-failure", "nsfw", "jailbreaking", "refusal", "frustration", "empty-response", "pii-leakage"],
  },
] as const satisfies ReadonlyArray<FlaggerUseCasePreset>

interface FlaggerGroup {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly slugs: ReadonlyArray<FlaggerPresetSlug>
}

export const FLAGGER_GROUPS = [
  {
    id: "response-validity",
    label: "Validade da resposta",
    description: "Verificações determinísticas sem custo de LLM, executadas em todos os traces.",
    slugs: ["empty-response", "tool-call-errors", "output-schema-validation"],
  },
  {
    id: "cost-efficiency",
    label: "Custo e eficiência",
    description: "Verificações determinísticas sem custo de LLM para desperdício de tokens e problemas de cache.",
    slugs: ["low-cache-hit-rate"],
  },
  {
    id: "user-signals",
    label: "Sinais do usuário",
    description: "Detecção com LLM de comportamento de risco ou insatisfação do usuário.",
    slugs: ["frustration", "jailbreaking", "nsfw"],
  },
  {
    id: "task-outcome",
    label: "Resultado da tarefa",
    description: "Avaliador de referência com LLM usado para medir o resultado da tarefa.",
    slugs: ["task-failure"],
  },
  {
    id: "agent-behavior",
    label: "Comportamento do agente",
    description: "Detecção com LLM de padrões de falha na própria saída do agente.",
    slugs: ["refusal", "laziness", "forgetting", "incompletion", "trashing", "bluffing", "pii-leakage"],
  },
] as const satisfies ReadonlyArray<FlaggerGroup>

// Compile-time assertion: FLAGGER_GROUPS must cover every FLAGGER_STRATEGY_SLUG. If a new slug
// is added but missing from any group, the type below resolves to the missing slug name(s)
// instead of `true`, and the assignment fails typecheck with the missing slug surfaced in the
// diagnostic. Keeps settings from silently dropping rows when a strategy ships.
type _MissingFromFlaggerGroups = Exclude<FlaggerPresetSlug, (typeof FLAGGER_GROUPS)[number]["slugs"][number]>
const _assertFlaggerGroupsExhaustive: [_MissingFromFlaggerGroups] extends [never] ? true : _MissingFromFlaggerGroups =
  true
void _assertFlaggerGroupsExhaustive

// Onboarding sorts the flat card grid by task outcome, then user-side, then agent-side, then
// deterministic programmatic checks — easier-to-grasp categories lead so the user can scan and
// pick fast.
const ONBOARDING_GROUP_ORDER: ReadonlyArray<(typeof FLAGGER_GROUPS)[number]["id"]> = [
  "task-outcome",
  "user-signals",
  "agent-behavior",
  "response-validity",
  "cost-efficiency",
]

export const FLAGGER_ONBOARDING_ORDER: ReadonlyArray<FlaggerPresetSlug> = ONBOARDING_GROUP_ORDER.flatMap(
  (groupId) => FLAGGER_GROUPS.find((group) => group.id === groupId)?.slugs ?? [],
)
