import { Button, Icon, Text, useMountEffect } from "@repo/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertCircle, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { AuthScreen } from "../../components/auth-screen.tsx"
import { hasMagicLinkVerificationToken, reconstructMagicLinkVerificationUrl } from "../../lib/auth/magic-link.ts"
import { ptBR } from "../../lib/i18n/pt-BR.ts"

export const Route = createFileRoute("/auth/verify")({
  component: VerifyMagicLinkPage,
})

function VerifyMagicLinkPage() {
  const [hasVerificationToken, setHasVerificationToken] = useState<boolean | undefined>(undefined)

  useMountEffect(() => {
    setHasVerificationToken(hasMagicLinkVerificationToken(window.location.hash))
  })

  const confirm = () => {
    const verificationUrl = reconstructMagicLinkVerificationUrl({
      fragment: window.location.hash,
      origin: window.location.origin,
    })

    if (verificationUrl) {
      window.location.assign(verificationUrl)
    } else {
      setHasVerificationToken(false)
    }
  }

  return (
    <AuthScreen title={ptBR.auth.verifyTitle} description={ptBR.auth.verifyDescription}>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/50 p-6">
        {hasVerificationToken === false ? (
          <>
            <div role="alert" className="flex flex-col items-center gap-3 text-center">
              <Icon icon={AlertCircle} size="lg" className="text-destructive" />
              <Text.H5 color="foregroundMuted">{ptBR.auth.invalidLink}</Text.H5>
            </div>
            <Button asChild size="full">
              <Link to="/login">{ptBR.auth.backToSignIn}</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <Icon icon={ShieldCheck} size="lg" className="text-primary" />
              <Text.H5 color="foregroundMuted">{ptBR.auth.verifyCard}</Text.H5>
            </div>
            <Button size="full" disabled={hasVerificationToken === undefined} onClick={confirm}>
              {ptBR.auth.verifyButton}
            </Button>
          </>
        )}
      </div>
    </AuthScreen>
  )
}
