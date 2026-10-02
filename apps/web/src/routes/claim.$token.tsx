import { Button, Icon, Text } from "@repo/ui"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { useState } from "react"
import { VigiaBrand } from "../components/vigia-brand.tsx"
import { claimOrganization, getClaimPreview } from "../domains/organizations/claim.functions.ts"
import { listProjects } from "../domains/projects/projects.functions.ts"
import { getSession } from "../domains/sessions/session.functions.ts"

export const Route = createFileRoute("/claim/$token")({
  loader: async ({ params: { token } }) => {
    const preview = await getClaimPreview({ data: { token } })
    if (!preview) {
      throw redirect({ to: "/" })
    }

    const session = await getSession().catch(() => null)
    return { preview, session }
  },
  component: ClaimPage,
})

function ClaimPage() {
  const { token } = Route.useParams()
  const { preview, session } = Route.useLoaderData()
  const router = useRouter()
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = async () => {
    if (isActivating) return

    if (!session) {
      await router.navigate({
        to: "/login",
        search: { redirect: `/claim/${token}` },
      })
      return
    }

    setIsActivating(true)
    setError(null)

    try {
      await claimOrganization({ data: { token } })
      const projects = await listProjects()
      const project = projects.find((item) => item.settings?.isSample !== true) ?? projects[0]

      if (!project) {
        setError("Seu ambiente foi ativado, mas não encontramos o primeiro agente. Fale com o suporte da Wandora.")
        setIsActivating(false)
        return
      }

      await router.navigate({
        to: "/projects/$projectSlug/onboarding",
        params: { projectSlug: project.slug },
      })
    } catch {
      setError(
        "Não foi possível ativar este ambiente com a conta atual. Entre com o mesmo e-mail usado na compra ou solicite um novo link de ativação.",
      )
      setIsActivating(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <main className="flex min-h-screen w-full flex-col px-6 py-10 sm:px-12 lg:w-3/5 lg:px-20 lg:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <VigiaBrand />

          <div className="flex flex-1 flex-col justify-center gap-8 py-12">
            <div className="flex flex-col gap-3">
              <Text.H2 weight="medium">Seu Vigia está pronto</Text.H2>
              <Text.H4 color="foregroundMuted">
                O ambiente de {preview.organizationName} já foi preparado. Agora vamos ativar seu acesso e conectar seu
                primeiro agente, passo a passo.
              </Text.H4>
            </div>

            <div className="flex flex-col gap-3">
              <ProgressItem label="Ativar seu acesso" state="current" />
              <ProgressItem label="Conectar seu primeiro agente" state="pending" />
              <ProgressItem label="Testar a conexão" state="pending" />
              <ProgressItem label="Receber os primeiros dados" state="pending" />
            </div>

            <div className="flex max-w-lg flex-col gap-3">
              <Button onClick={() => void activate()} disabled={isActivating}>
                {isActivating ? (
                  <>
                    <Icon icon={Loader2} size="sm" className="animate-spin" />
                    Ativando…
                  </>
                ) : session ? (
                  "Ativar e conectar meu agente"
                ) : (
                  "Começar configuração"
                )}
              </Button>
              {!session ? (
                <Text.H6 color="foregroundMuted">
                  Você vai confirmar o e-mail usado na compra antes de continuar. Depois disso, o onboarding volta
                  automaticamente para esta configuração.
                </Text.H6>
              ) : null}
              {error ? <Text.H6 color="destructive">{error}</Text.H6> : null}
            </div>
          </div>
        </div>
      </main>

      <aside className="hidden min-h-screen w-2/5 flex-col justify-center bg-secondary px-16 lg:flex">
        <div className="flex max-w-md flex-col gap-5">
          <Text.H3 weight="medium">Você não precisa conhecer OpenTelemetry</Text.H3>
          <Text.H5 color="foregroundMuted">
            O Vigia vai perguntar onde seu agente foi criado, mostrar somente os passos necessários e confirmar a
            conexão quando receber uma execução real.
          </Text.H5>
          <Text.H5 color="foregroundMuted">
            Depois disso, você acompanha erros, custos, qualidade e resultados em uma linguagem mais simples.
          </Text.H5>
        </div>
      </aside>
    </div>
  )
}

function ProgressItem({
  label,
  state,
}: {
  readonly label: string
  readonly state: "complete" | "current" | "pending"
}) {
  const icon = state === "complete" ? CheckCircle2 : Circle
  return (
    <div className="flex items-center gap-3">
      <Icon icon={icon} size="sm" color={state === "pending" ? "foregroundMuted" : "foreground"} />
      <Text.H5 color={state === "pending" ? "foregroundMuted" : "foreground"}>{label}</Text.H5>
    </div>
  )
}
