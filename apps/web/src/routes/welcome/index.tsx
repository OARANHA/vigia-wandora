import { Button, Text } from "@repo/ui"
import { createFileRoute } from "@tanstack/react-router"
import { AuthScreen } from "../../components/auth-screen.tsx"
import { getSession } from "../../domains/sessions/session.functions.ts"
import { clarityHeadScriptsUnlessExcluded } from "../../lib/analytics/clarity.ts"
import { gtmHeadScripts, validateTrackingSearch } from "../../lib/analytics/gtm.ts"
import { resolveEntryDestination } from "../../lib/entry-destination.ts"
import { isLatitudeStaffEmail } from "../../lib/posthog/posthog-client.ts"
import { VIGIA_PRODUCT } from "../../lib/product.ts"
import { welcomeLoader } from "./-lib/loader.ts"

export const Route = createFileRoute("/welcome/")({
  component: WelcomePage,
  validateSearch: validateTrackingSearch,
  head: ({ loaderData }) => ({
    scripts: [...gtmHeadScripts(), ...clarityHeadScriptsUnlessExcluded(loaderData?.excludeFromAnalytics)],
  }),
  loader: () => welcomeLoader({ getSession, resolveEntryDestination, isLatitudeStaffEmail }),
})

function WelcomePage() {
  return (
    <AuthScreen title="Seu acesso ao Vigia" description="Este e-mail ainda não possui uma empresa ativada no Vigia.">
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-muted/50 p-6">
        <div className="flex flex-col gap-2">
          <Text.H4 weight="medium">Use o link de ativação da sua compra</Text.H4>
          <Text.H5 color="foregroundMuted">
            Depois da compra, o Vigia envia um e-mail com o acesso da sua empresa. Esse link abre o onboarding guiado
            para conectar seu primeiro agente.
          </Text.H5>
        </div>

        <Text.H6 color="foregroundMuted">
          Se você recebeu um convite para uma empresa existente, abra o link do convite. Entrar com um e-mail, sozinho,
          não cria uma nova empresa.
        </Text.H6>

        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `${VIGIA_PRODUCT.marketingUrl}/interesse/?source=welcome`
          }}
        >
          Quero conhecer o Vigia
        </Button>
      </div>
    </AuthScreen>
  )
}
