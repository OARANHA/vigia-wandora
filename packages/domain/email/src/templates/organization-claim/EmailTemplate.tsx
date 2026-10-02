import { Section } from "@react-email/components"
// @ts-expect-error TS6133 - React required at runtime for JSX in workers
// biome-ignore lint/correctness/noUnusedImports: React required at runtime for JSX in workers
import React from "react"
import { ContainerLayout, type EmailBranding } from "../../components/ContainerLayout.tsx"
import { EmailButton } from "../../components/EmailButton.tsx"
import { EmailText } from "../../components/EmailText.tsx"
import { emailDesignTokens } from "../../tokens/design-system.ts"

interface OrganizationClaimEmailProps {
  readonly claimUrl: string
  readonly organizationName: string
  readonly expiresAtLabel: string
  readonly kind: "temporary" | "commercial"
}

function vigiaBranding(claimUrl: string): EmailBranding {
  const homeUrl = new URL("/", claimUrl).toString()

  return {
    homeUrl,
    logoUrl: new URL("/brand/vigia-logo.png", homeUrl).toString(),
    logoAlt: "Vigia by Wandora",
    logoWidth: 176,
    logoHeight: 80,
    actionLabel: "Abrir o Vigia",
    footerName: "Vigia",
    footerSubtitle: "by Wandora",
    siteLabel: "vigia.wandora.com.br",
  }
}

export function OrganizationClaimEmail({
  claimUrl,
  organizationName,
  expiresAtLabel,
  kind,
}: OrganizationClaimEmailProps) {
  const commercial = kind === "commercial"

  return (
    <ContainerLayout
      previewText={commercial ? "Seu Vigia está pronto" : "Seu ambiente temporário do Vigia está pronto"}
      branding={vigiaBranding(claimUrl)}
    >
      <EmailText variant="heading" className={emailDesignTokens.spacing.headingGap}>
        {commercial ? "Sua compra do Vigia foi confirmada" : "Seu ambiente do Vigia está pronto"}
      </EmailText>
      <EmailText variant="body" className={emailDesignTokens.spacing.contentGap}>
        {commercial
          ? `O ambiente de ${organizationName} já está preparado. Ative seu acesso e o Vigia vai orientar você, passo a passo, até receber os primeiros dados do seu agente.`
          : `O ambiente temporário de ${organizationName} já está preparado. Ative o acesso e conecte seu agente ao Vigia.`}
      </EmailText>

      <Section className={emailDesignTokens.spacing.buttonTop}>
        <EmailButton href={claimUrl} label={commercial ? "Ativar meu Vigia" : "Ativar ambiente"} />
      </Section>

      <EmailText variant="bodySmall" className={`text-muted-foreground ${emailDesignTokens.spacing.footnoteTop}`}>
        {commercial
          ? `Por segurança, este link de ativação expira em ${expiresAtLabel}. Seu ambiente não é excluído se o link vencer.`
          : `Ative até ${expiresAtLabel}. Se você não iniciou esta configuração, ignore este e-mail; ambientes temporários não ativados são removidos automaticamente.`}
      </EmailText>
    </ContainerLayout>
  )
}

OrganizationClaimEmail.PreviewProps = {
  claimUrl: "https://app-vigia.wandora.com.br/claim/claim-token-preview",
  organizationName: "Acme",
  expiresAtLabel: "9 de outubro de 2026",
  kind: "commercial",
} satisfies OrganizationClaimEmailProps
