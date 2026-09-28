import { cn, initialsFromDisplayName, Text, useHashColor, useToast } from "@repo/ui"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { AuthScreen } from "../../components/auth-screen.tsx"
import { getSession } from "../../domains/sessions/session.functions.ts"
import { clarityHeadScriptsUnlessExcluded } from "../../lib/analytics/clarity.ts"
import { gtmHeadScripts, validateTrackingSearch } from "../../lib/analytics/gtm.ts"
import { authClient } from "../../lib/auth-client.ts"
import { type Organization, resolveEntryDestination } from "../../lib/entry-destination.ts"
import { toUserMessage } from "../../lib/errors.ts"
import { ptBR } from "../../lib/i18n/pt-BR.ts"
import { isLatitudeStaffEmail } from "../../lib/posthog/posthog-client.ts"
import { chooseOrganizationLoader } from "./-lib/loader.ts"

function OrgAvatar({ name }: { name: string }) {
  const { style, className } = useHashColor(name)
  return (
    <div
      className={cn("flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold", className)}
      style={style}
    >
      {initialsFromDisplayName(name)}
    </div>
  )
}

export const Route = createFileRoute("/choose-organization/")({
  component: ChooseOrganizationPage,
  validateSearch: validateTrackingSearch,
  head: ({ loaderData }) => ({
    scripts: [...gtmHeadScripts(), ...clarityHeadScriptsUnlessExcluded(loaderData?.excludeFromAnalytics)],
  }),
  loader: () => chooseOrganizationLoader({ getSession, resolveEntryDestination, isLatitudeStaffEmail }),
})

function ChooseOrganizationPage() {
  const { organizations } = Route.useLoaderData()
  const { toast } = useToast()
  const [pendingOrgId, setPendingOrgId] = useState<string>()

  const handleSelectOrg = async (orgId: string) => {
    setPendingOrgId(orgId)
    try {
      await authClient.organization.setActive({ organizationId: orgId })
      window.location.href = "/"
    } catch (err) {
      toast({ variant: "destructive", description: toUserMessage(err) })
      setPendingOrgId(undefined)
    }
  }

  return (
    <AuthScreen title={ptBR.organization.title} description={ptBR.organization.description}>
      <div className="flex flex-col rounded-xl overflow-hidden shadow-none border border-border">
        {organizations.map((org: Organization, index: number) => (
          <button
            key={org.id}
            type="button"
            disabled={pendingOrgId !== undefined}
            onClick={() => handleSelectOrg(org.id)}
            className={cn(
              "flex items-center gap-3 p-3 bg-background hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer",
              { "border-t border-border": index > 0 },
            )}
          >
            <OrgAvatar name={org.name} />
            <Text.H5 weight="medium" className="flex-1 text-left">
              {org.name}
            </Text.H5>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </AuthScreen>
  )
}
