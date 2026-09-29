import { Button, GitHubIcon, GoogleIcon, Icon, Input, Text, useMountEffect } from "@repo/ui"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { AlertCircle, Mail } from "lucide-react"
import { type SubmitEvent, useCallback, useRef, useState } from "react"
import z from "zod"
import { AuthScreen } from "../components/auth-screen.tsx"
import { Turnstile } from "../components/turnstile.tsx"
import { sendMagicLink } from "../domains/auth/auth.functions.ts"
import { getSession } from "../domains/sessions/session.functions.ts"
import { lookupSsoForEmail } from "../domains/sso/sso.functions.ts"
import { clarityHeadScripts } from "../lib/analytics/clarity.ts"
import { appendTrackingParams, gtmHeadScripts, pickTrackingParams } from "../lib/analytics/gtm.ts"
import { setSignupAttributionCookie } from "../lib/analytics/signup-attribution-cookie.ts"
import { oauthCallbackErrorMessage } from "../lib/auth/oauth-errors.ts"
import { authClient } from "../lib/auth-client.ts"
import { TURNSTILE_SITE_KEY } from "../lib/auth-config.ts"
import { ptBR } from "../lib/i18n/pt-BR.ts"
import { bootstrapPostHogAttributionSession, getPostHogSessionId } from "../lib/posthog/posthog-client.ts"
import { VIGIA_PRODUCT } from "../lib/product.ts"

const loginSearchParams = z.object({
  redirect: z.string().optional(),
  email: z.string().optional(),
  error: z.string().optional(),
})

const captureSignupAttribution = async (tracking: Record<string, string>) => {
  const sessionId = await getPostHogSessionId()
  return {
    ...(sessionId ? { sessionId } : {}),
    ...(window.document.referrer ? { referrer: window.document.referrer } : {}),
    ...(Object.keys(tracking).length > 0 ? { trackingParams: tracking } : {}),
  }
}

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchParams,
  beforeLoad: async () => {
    const session = await getSession()
    if (session) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({ scripts: [...gtmHeadScripts(), ...clarityHeadScripts()] }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectPath, email: prefilledEmail, error: oauthErrorCode } = Route.useSearch()
  useMountEffect(() => {
    void bootstrapPostHogAttributionSession()
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(() => oauthCallbackErrorMessage(oauthErrorCode))
  const [isSent, setIsSent] = useState(false)
  const [isRedirectingToSso, setIsRedirectingToSso] = useState(false)
  const [email, setEmail] = useState(prefilledEmail ?? "")
  const captchaTokenRef = useRef<string | undefined>(undefined)

  const handleCaptchaVerify = useCallback((token: string) => {
    captchaTokenRef.current = token
  }, [])
  const handleCaptchaExpire = useCallback(() => {
    captchaTokenRef.current = undefined
  }, [])

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return

    const formData = new FormData(e.currentTarget)
    const emailValue = String(formData.get("email") ?? "")
    setEmail(emailValue)
    setIsLoading(true)
    setError(undefined)

    const callbackURL = redirectPath ?? "/"
    const tracking = pickTrackingParams(window.location.search)
    const newUserCallbackURL = appendTrackingParams(redirectPath ?? "/welcome", {
      ...tracking,
      signup: "email",
    })
    const attribution = await captureSignupAttribution(tracking)

    try {
      const ssoMatch = await lookupSsoForEmail({ data: { email: emailValue } })
      if (ssoMatch) {
        setIsRedirectingToSso(true)
        const { error: ssoError } = await authClient.signIn.sso({
          email: emailValue,
          callbackURL,
          newUserCallbackURL,
        })
        if (ssoError) {
          setIsRedirectingToSso(false)
          setError(ptBR.auth.ssoError)
          setIsLoading(false)
        }
        return
      }

      await sendMagicLink({
        data: {
          email: emailValue,
          callbackURL,
          newUserCallbackURL,
          captchaToken: captchaTokenRef.current,
          ...(Object.keys(attribution).length > 0 ? { attribution } : {}),
        },
      })

      setIsSent(true)
      setIsLoading(false)
    } catch {
      setError(ptBR.auth.requestError)
      setIsLoading(false)
    }
  }

  const submitSocialSignIn = async (provider: "google" | "github") => {
    if (isLoading) return

    setIsLoading(true)
    setError(undefined)

    try {
      const tracking = pickTrackingParams(window.location.search)
      const attribution = await captureSignupAttribution(tracking)
      setSignupAttributionCookie(attribution)

      const startParams = new URLSearchParams(tracking)
      if (redirectPath) startParams.set("redirect", redirectPath)
      const startUrl = `/api/auth/${provider}/start${startParams.toString() ? `?${startParams.toString()}` : ""}`
      window.location.assign(startUrl)
    } catch {
      setError(ptBR.auth.socialError)
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <AuthScreen>
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon icon={Mail} className="h-6 w-6 text-primary" />
          </div>
          <Text.H3 align="center">{ptBR.auth.checkEmailTitle}</Text.H3>
          <Text.H5 color="foregroundMuted" align="center">
            {ptBR.auth.checkEmailSent} <strong>{email}</strong>
          </Text.H5>
          <Text.H6 color="foregroundMuted" align="center">
            {ptBR.auth.checkEmailInstructions}
          </Text.H6>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setIsSent(false)
              setEmail("")
            }}
          >
            {ptBR.auth.useDifferentEmail}
          </Button>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title={ptBR.auth.loginTitle} description={ptBR.auth.loginDescription}>
      <div className="flex flex-col gap-4 rounded-xl overflow-hidden shadow-none bg-muted/50 border border-border p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            name="email"
            type="email"
            label={ptBR.auth.emailLabel}
            placeholder={ptBR.auth.emailPlaceholder}
            required
            autoComplete="email"
            data-autofocus="true"
            background="background"
            defaultValue={email}
          />

          {TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
              onError={handleCaptchaExpire}
            />
          )}

          {error && (
            <div className="flex items-start gap-2">
              <div className="shrink-0">
                <Icon icon={AlertCircle} size="sm" color="destructive" />
              </div>
              <Text.H6 color="destructive">{error}</Text.H6>
            </div>
          )}

          <Button size="full" type="submit" disabled={isLoading}>
            {isRedirectingToSso
              ? ptBR.auth.redirectingToSso
              : isLoading
                ? ptBR.auth.sending
                : ptBR.auth.continueWithEmail}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-[1px] bg-border" />
          <span className="bg-muted/50 px-2 text-xs leading-4 text-muted-foreground">{ptBR.auth.divider}</span>
          <div className="flex-1 h-[1px] bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <Button size="full" variant="outline" onClick={() => void submitSocialSignIn("google")} disabled={isLoading}>
            <GoogleIcon />
            {ptBR.auth.continueWithGoogle}
          </Button>

          <Button size="full" variant="outline" onClick={() => void submitSocialSignIn("github")} disabled={isLoading}>
            <GitHubIcon />
            {ptBR.auth.continueWithGitHub}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-y-4">
        <Text.H6 color="foregroundMuted" align="center">
          {ptBR.auth.helpPrefix}{" "}
          <a
            href={VIGIA_PRODUCT.wandoraUrl}
            className="text-accent-foreground underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ptBR.auth.helpLink}
          </a>
          .
        </Text.H6>
      </div>
    </AuthScreen>
  )
}
