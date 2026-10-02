import { DEFAULT_API_KEY_NAME } from "@domain/api-keys"
import type { VigiaBusinessProfile } from "@domain/shared"
import { Button, CodeBlock, Text, useToast } from "@repo/ui"
import { useState } from "react"
import { insertApiKeyMutation, useApiKeysCollection } from "../../../../../domains/api-keys/api-keys.collection.ts"
import { toUserMessage } from "../../../../../lib/errors.ts"
import { VIGIA_BUILD_STACK_OPTIONS } from "./vigia-business-profile.ts"
import {
  getVigiaConnectionValues,
  getVigiaN8nConnectionValues,
  getVigiaOtelCurlVerifySnippet,
  getVigiaOtelEnvBlock,
  VIGIA_AGENT_STACKS,
  type VigiaAgentStackId,
} from "./vigia-connection.ts"

export function VigiaConnectionInstructions({
  projectSlug,
  source,
  businessProfile,
  apiKeyToken,
}: {
  readonly projectSlug: string
  readonly source: VigiaAgentStackId
  readonly businessProfile?: VigiaBusinessProfile | undefined
  readonly apiKeyToken?: string | null | undefined
}) {
  const { toast } = useToast()
  const { data: apiKeysList = [] } = useApiKeysCollection()
  const [creatingKey, setCreatingKey] = useState(false)

  const preferredKey = apiKeysList.find((key) => key.name === DEFAULT_API_KEY_NAME) ?? apiKeysList[0] ?? null
  const resolvedApiKey = apiKeyToken !== undefined ? apiKeyToken : (preferredKey?.token ?? null)

  const handleCreateKey = async () => {
    setCreatingKey(true)
    try {
      await insertApiKeyMutation(DEFAULT_API_KEY_NAME)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível criar a chave",
        description: toUserMessage(error),
      })
    } finally {
      setCreatingKey(false)
    }
  }

  if (!resolvedApiKey) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Text.H5M>Prepare a conexão do Vigia</Text.H5M>
        {apiKeyToken === undefined ? (
          <>
            <Text.H5 color="foregroundMuted">
              Crie uma chave de conexão. Ela será usada pela ferramenta que executa seu agente.
            </Text.H5>
            <div className="flex items-center">
              <Button variant="outline" disabled={creatingKey} onClick={() => void handleCreateKey()}>
                {creatingKey ? "Criando chave…" : "Criar chave de conexão"}
              </Button>
            </div>
          </>
        ) : (
          <Text.H5 color="foregroundMuted">Nenhuma chave de conexão está disponível neste ambiente.</Text.H5>
        )}
      </div>
    )
  }

  if (source === "n8n") {
    return <N8nConnectionInstructions projectSlug={projectSlug} apiKey={resolvedApiKey} />
  }

  return (
    <GenericOtelInstructions
      projectSlug={projectSlug}
      source={source}
      businessProfile={businessProfile}
      apiKey={resolvedApiKey}
    />
  )
}

function N8nConnectionInstructions({ projectSlug, apiKey }: { readonly projectSlug: string; readonly apiKey: string }) {
  const config = getVigiaN8nConnectionValues(projectSlug, apiKey)

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Text.H5M>Conectar n8n</Text.H5M>
        <Text.H5 color="foregroundMuted">
          No n8n, abra Settings → OpenTelemetry. Preencha os campos abaixo e mantenha os spans dos nós ativados.
        </Text.H5>
      </div>

      <div className="flex flex-col gap-3">
        <Text.H5M>1. Configure a conexão</Text.H5M>
        <ConnectionValue label="Protocolo" value={config.protocol} />
        <ConnectionValue label="Endpoint" value={config.collectorEndpoint} />
        <ConnectionValue label="Caminho dos traces" value={config.tracesPath} />
      </div>

      <div className="flex flex-col gap-3">
        <Text.H5M>2. Adicione os headers</Text.H5M>
        <ConnectionValue label="Authorization" value={config.authorizationHeaderValue} />
        <ConnectionValue label="X-Vigia-Project" value={config.projectHeaderValue} />
      </div>

      <div className="flex flex-col gap-2">
        <Text.H5M>3. Execute um workflow real</Text.H5M>
        <Text.H5 color="foregroundMuted">
          Salve e ative o OpenTelemetry no n8n. Depois execute o workflow que você quer acompanhar. O Vigia conclui a
          conexão quando receber essa primeira execução real.
        </Text.H5>
      </div>

      <Text.H6 color="foregroundMuted">
        O botão Send test trace do n8n pode ajudar a diagnosticar a conexão, mas o onboarding do Vigia deve ser validado
        pela execução do workflow que será monitorado.
      </Text.H6>
    </div>
  )
}

function GenericOtelInstructions({
  projectSlug,
  source,
  businessProfile,
  apiKey,
}: {
  readonly projectSlug: string
  readonly source: VigiaAgentStackId
  readonly businessProfile?: VigiaBusinessProfile | undefined
  readonly apiKey: string
}) {
  const config = getVigiaConnectionValues(projectSlug, apiKey)
  const stack = VIGIA_AGENT_STACKS.find((entry) => entry.id === source) ?? VIGIA_AGENT_STACKS.at(-1)
  const selectedBusinessStack =
    businessProfile?.buildStack
      .flatMap((id) => {
        const label = VIGIA_BUILD_STACK_OPTIONS.find((option) => option.id === id)?.label
        return label ? [label] : []
      })
      .join(", ") ?? ""

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Text.H5M>Como conectar {stack?.label ?? "seu agente"}</Text.H5M>
        <Text.H5 color="foregroundMuted">{stack?.guidance}</Text.H5>
        {selectedBusinessStack && !businessProfile?.buildStack.includes("codigo-proprio") ? (
          <Text.H6 color="foregroundMuted">
            O Vigia registrou sua stack ({selectedBusinessStack}). Nesta versão, a conexão direta específica dessa
            combinação ainda não é automática; conecte a parte do fluxo que já suporta OpenTelemetry.
          </Text.H6>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Text.H5M>1. Copie os dados do Vigia</Text.H5M>
        <ConnectionValue label="Endpoint OTLP" value={config.endpoint} />
        <ConnectionValue label="Projeto" value={config.project} />
        <ConnectionValue label="Chave Vigia" value={apiKey} />
      </div>

      <div className="flex flex-col gap-2">
        <Text.H5M>2. Configure a telemetria</Text.H5M>
        <Text.H5 color="foregroundMuted">
          Use OTLP HTTP. O cabeçalho X-Vigia-Project identifica este agente no Vigia.
        </Text.H5>
        <CodeBlock value={getVigiaOtelEnvBlock(projectSlug, apiKey)} copyable />
      </div>

      <div className="flex flex-col gap-2">
        <Text.H5M>3. Execute o agente</Text.H5M>
        <Text.H5 color="foregroundMuted">
          Faça uma execução real. Quando os dados chegarem, o Vigia confirma a conexão automaticamente.
        </Text.H5>
      </div>

      <div className="flex flex-col gap-2">
        <Text.H6 color="foregroundMuted">Teste técnico opcional</Text.H6>
        <CodeBlock value={getVigiaOtelCurlVerifySnippet(projectSlug, apiKey)} copyable />
      </div>
    </div>
  )
}

function ConnectionValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Text.H6 color="foregroundMuted">{label}</Text.H6>
      <CodeBlock value={value} copyable />
    </div>
  )
}
