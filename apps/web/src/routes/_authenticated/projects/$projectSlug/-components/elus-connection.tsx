import { Button, Text, useToast } from "@repo/ui"
import { useState } from "react"
import { authorizeElusIntegration } from "../../../../../domains/integrations/elus.functions.ts"
import { toUserMessage } from "../../../../../lib/errors.ts"

const ELUS_URL = "https://elus.wandora.com.br"

export function ElusConnection({
  projectSlug,
  state,
  codeChallenge,
  connected,
}: {
  readonly projectSlug: string
  readonly state?: string
  readonly codeChallenge?: string
  readonly connected: boolean
}) {
  const { toast } = useToast()
  const [authorizing, setAuthorizing] = useState(false)

  if (connected) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
        <Text.H4M>Elus conectado</Text.H4M>
        <Text.H5 color="foregroundMuted">
          Agora use seu agente normalmente. Assim que houver a primeira execução, começaremos a mostrar os dados aqui.
        </Text.H5>
      </div>
    )
  }

  if (state && codeChallenge) {
    const authorize = async () => {
      setAuthorizing(true)
      try {
        const result = await authorizeElusIntegration({
          data: { projectSlug, state, codeChallenge },
        })
        window.location.assign(result.callbackUrl)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Não foi possível autorizar o Elus",
          description: toUserMessage(error),
        })
        setAuthorizing(false)
      }
    }

    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
        <div className="flex flex-col gap-2">
          <Text.H4M>Autorizar Elus</Text.H4M>
          <Text.H5 color="foregroundMuted">
            Confirme a conexão deste projeto. A credencial de ingestão será entregue somente ao backend do Elus.
          </Text.H5>
        </div>
        <div>
          <Button disabled={authorizing} onClick={() => void authorize()}>
            {authorizing ? "Autorizando…" : "Autorizar conexão"}
          </Button>
        </div>
      </div>
    )
  }

  const start = () => {
    const url = new URL("/api/v1/integrations/vigia/start", ELUS_URL)
    url.searchParams.set("vigia_project", projectSlug)
    window.location.assign(url.toString())
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
      <div className="flex flex-col gap-2">
        <Text.H4M>Você usa Elus</Text.H4M>
        <Text.H5 color="foregroundMuted">
          Conecte sua conta e deixe o Vigia configurar tudo automaticamente. Você não precisa copiar endpoint, chave ou headers.
        </Text.H5>
      </div>
      <div>
        <Button onClick={start}>Conectar Elus</Button>
      </div>
    </div>
  )
}
