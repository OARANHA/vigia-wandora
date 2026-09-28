import { DEFAULT_API_KEY_NAME } from "@domain/api-keys"
import { Button, CodeBlock, Text, useToast } from "@repo/ui"
import { useState } from "react"
import { insertApiKeyMutation, useApiKeysCollection } from "../../../../../domains/api-keys/api-keys.collection.ts"
import { toUserMessage } from "../../../../../lib/errors.ts"
import {
  getVigiaConnectionValues,
  getVigiaOtelCurlVerifySnippet,
  getVigiaOtelEnvBlock,
  VIGIA_AGENT_STACKS,
  type VigiaAgentStackId,
} from "./vigia-connection.ts"

export function VigiaConnectionInstructions({
  projectSlug,
  source,
  apiKeyToken,
}: {
  readonly projectSlug: string
  readonly source: VigiaAgentStackId
  readonly apiKeyToken?: string | null
}) {
  const { toast } = useToast()
  const { data: apiKeysList = [] } = useApiKeysCollection()
  const [creatingKey, setCreatingKey] = useState(false)

  const preferredKey = apiKeysList.find((key) => key.name === DEFAULT_API_KEY_NAME) ?? apiKeysList[0] ?? null
  const resolvedApiKey = apiKeyToken !== undefined ? apiKeyToken : resolvedApiKey
  const config = getVigiaConnectionValues(projectSlug, resolvedApiKey)
  const stack = VIGIA_AGENT_STACKS.find((entry) => entry.id === source) ?? VIGIA_AGENT_STACKS.at(-1)

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

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Text.H5M>Como conectar {stack?.label ?? "seu agente"}</Text.H5M>
        <Text.H5 color="foregroundMuted">{stack?.guidance}</Text.H5>
      </div>

      <div className="flex flex-col gap-3">
        <Text.H5M>1. Copie os dados do Vigia</Text.H5M>
        <div className="flex flex-col gap-2">
          <Text.H6 color="foregroundMuted">Endpoint OTLP</Text.H6>
          <CodeBlock value={config.endpoint} copyable />
        </div>
        <div className="flex flex-col gap-2">
          <Text.H6 color="foregroundMuted">Projeto</Text.H6>
          <CodeBlock value={config.project} copyable />
        </div>
        <div className="flex flex-col gap-2">
          <Text.H6 color="foregroundMuted">Chave Vigia</Text.H6>
          {resolvedApiKey ? (
            <CodeBlock value={resolvedApiKey} copyable />
          ) : apiKeyToken === undefined ? (
            <div className="flex flex-col items-start gap-2">
              <Text.H6 color="foregroundMuted">
                Crie uma chave para autenticar os traces enviados por este ambiente.
              </Text.H6>
              <Button variant="outline" disabled={creatingKey} onClick={() => void handleCreateKey()}>
                {creatingKey ? "Criando chave…" : "Criar chave de conexão"}
              </Button>
            </div>
          ) : (
            <Text.H6 color="foregroundMuted">Nenhuma chave de conexão está disponível neste ambiente.</Text.H6>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Text.H5M>2. Configure o exportador OpenTelemetry</Text.H5M>
        <Text.H5 color="foregroundMuted">
          Use OTLP HTTP para enviar traces. O cabeçalho X-Vigia-Project identifica este agente no Vigia.
        </Text.H5>
        <CodeBlock value={getVigiaOtelEnvBlock(projectSlug, resolvedApiKey)} copyable />
      </div>

      <div className="flex flex-col gap-2">
        <Text.H5M>3. Execute uma conversa de teste</Text.H5M>
        <Text.H5 color="foregroundMuted">
          Reinicie o agente se necessário e faça uma execução real. O Vigia detectará automaticamente o primeiro trace.
        </Text.H5>
      </div>

      <div className="flex flex-col gap-2">
        <Text.H6 color="foregroundMuted">Teste rápido opcional</Text.H6>
        <Text.H6 color="foregroundMuted">
          Este comando envia um trace mínimo para validar endpoint, chave e projeto antes de instrumentar o fluxo completo.
        </Text.H6>
        <CodeBlock value={getVigiaOtelCurlVerifySnippet(projectSlug, resolvedApiKey)} copyable />
      </div>
    </div>
  )
}
