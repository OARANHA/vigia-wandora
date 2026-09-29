import { Section } from "@react-email/components"
// @ts-expect-error TS6133 - React required at runtime for JSX in workers
// biome-ignore lint/correctness/noUnusedImports: React required at runtime for JSX in workers
import React from "react"
import { ContainerLayout, type EmailBranding } from "../../components/ContainerLayout.tsx"
import { EmailButton } from "../../components/EmailButton.tsx"
import { EmailText } from "../../components/EmailText.tsx"
import { emailDesignTokens } from "../../tokens/design-system.ts"

interface MagicLinkEmailProps {
  readonly userName: string
  readonly magicLinkUrl: string
}

function vigiaBranding(magicLinkUrl: string): EmailBranding {
  const homeUrl = new URL("/", magicLinkUrl).toString()

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

export function MagicLinkEmail({ magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <ContainerLayout
      previewText="Confirme seu acesso ao Vigia"
      branding={vigiaBranding(magicLinkUrl)}
      footer={
        <EmailText variant="bodySmall" className="text-muted-foreground">
          Se você não solicitou este acesso, ignore este e-mail.
        </EmailText>
      }
    >
      <EmailText variant="heading" className={emailDesignTokens.spacing.headingGap}>
        Confirme seu acesso
      </EmailText>
      <EmailText variant="body" className={emailDesignTokens.spacing.contentGap}>
        Recebemos uma solicitação de acesso ao Vigia com este e-mail. Clique no botão abaixo para entrar com segurança.
      </EmailText>

      <Section className={emailDesignTokens.spacing.buttonTop}>
        <EmailButton href={magicLinkUrl} label="Entrar no Vigia" />
      </Section>
    </ContainerLayout>
  )
}

MagicLinkEmail.PreviewProps = {
  userName: "Alex",
  magicLinkUrl: "https://vigia.wandora.com.br/auth/verify#preview",
} satisfies MagicLinkEmailProps
