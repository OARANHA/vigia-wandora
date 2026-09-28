import { VIGIA_PRODUCT } from "../../../../../lib/product.ts"

export const VIGIA_AGENT_STACK_IDS = [
  "openai-agents",
  "langgraph",
  "mastra",
  "vercel-ai-sdk",
  "python",
  "nodejs",
  "opentelemetry",
] as const

export type VigiaAgentStackId = (typeof VIGIA_AGENT_STACK_IDS)[number]

export const DEFAULT_VIGIA_AGENT_STACK: VigiaAgentStackId = "opentelemetry"

export const VIGIA_AGENT_STACKS: ReadonlyArray<{
  readonly id: VigiaAgentStackId
  readonly label: string
  readonly guidance: string
}> = [
  {
    id: "openai-agents",
    label: "OpenAI Agents",
    guidance: "Ative a instrumentação OpenTelemetry do seu agente e envie os traces para o endpoint OTLP do Vigia.",
  },
  {
    id: "langgraph",
    label: "LangGraph",
    guidance: "Use a instrumentação OpenTelemetry da sua aplicação e aponte o exportador de traces para o Vigia.",
  },
  {
    id: "mastra",
    label: "Mastra",
    guidance: "Mantenha sua instrumentação OpenTelemetry e configure o exportador OTLP HTTP para o Vigia.",
  },
  {
    id: "vercel-ai-sdk",
    label: "Vercel AI SDK",
    guidance: "Habilite telemetria no seu runtime e envie os spans OpenTelemetry para o endpoint do Vigia.",
  },
  {
    id: "python",
    label: "Python",
    guidance: "Configure o OpenTelemetry SDK da aplicação para exportar traces por OTLP HTTP para o Vigia.",
  },
  {
    id: "nodejs",
    label: "Node.js",
    guidance: "Configure o OpenTelemetry SDK do Node.js para exportar traces por OTLP HTTP para o Vigia.",
  },
  {
    id: "opentelemetry",
    label: "Outro / OpenTelemetry",
    guidance:
      "Qualquer runtime compatível com OpenTelemetry pode enviar traces diretamente para o Vigia por OTLP HTTP.",
  },
]

const apiKeyPlaceholder = "SUA_CHAVE_VIGIA"

function normalizedProjectSlug(projectSlug: string): string {
  return projectSlug.trim() || "seu-projeto"
}

function resolvedApiKey(apiKey: string | null): string {
  return apiKey?.trim() || apiKeyPlaceholder
}

export function getVigiaConnectionValues(projectSlug: string, apiKey: string | null) {
  return {
    endpoint: VIGIA_PRODUCT.ingestUrl,
    apiKey: resolvedApiKey(apiKey),
    project: normalizedProjectSlug(projectSlug),
  } as const
}

export function getVigiaOtelEnvBlock(projectSlug: string, apiKey: string | null): string {
  const config = getVigiaConnectionValues(projectSlug, apiKey)
  return [
    `VIGIA_ENDPOINT=${config.endpoint}`,
    `VIGIA_API_KEY=${config.apiKey}`,
    `VIGIA_PROJECT=${config.project}`,
    "",
    `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${config.endpoint}`,
    `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer ${config.apiKey},X-Vigia-Project=${config.project}`,
  ].join("\n")
}

export function getVigiaOtelCurlVerifySnippet(projectSlug: string, apiKey: string | null): string {
  const config = getVigiaConnectionValues(projectSlug, apiKey)

  return `curl -X POST ${config.endpoint} \\\
  -H "Authorization: Bearer ${config.apiKey}" \\\
  -H "X-Vigia-Project: ${config.project}" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": { "stringValue": "vigia-connection-test" }
        }]
      },
      "scopeSpans": [{
        "scope": { "name": "vigia-onboarding" },
        "spans": [{
          "traceId": "00000000000000000000000000000001",
          "spanId": "0000000000000001",
          "name": "vigia-connection-test",
          "kind": 1,
          "startTimeUnixNano": "1700000000000000000",
          "endTimeUnixNano": "1700000001000000000"
        }]
      }]
    }]
  }'`
}
