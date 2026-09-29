import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
} from "@react-email/components"
import type { ReactNode } from "react"
// @ts-expect-error TS6133 - React required at runtime for JSX in workers
// biome-ignore lint/correctness/noUnusedImports: React required at runtime for JSX in workers
import React from "react"
import { emailDesignTokens, emailTailwindConfig } from "../tokens/design-system.js"
import { EmailButton } from "./EmailButton.tsx"

export interface EmailBranding {
  readonly homeUrl: string
  readonly logoUrl: string
  readonly logoAlt: string
  readonly logoWidth: number
  readonly logoHeight: number
  readonly actionLabel: string
  readonly footerName: string
  readonly footerSubtitle: string
  readonly siteLabel: string
}

const LATITUDE_BRANDING: EmailBranding = {
  homeUrl: "https://console.latitude.so",
  logoUrl: "https://console.latitude.so/latitude-logo.png",
  logoAlt: "Latitude's Logo",
  logoWidth: 132,
  logoHeight: 24,
  actionLabel: "Open Latitude",
  footerName: "Latitude Data S.L.",
  footerSubtitle: "The AI engineering platform for product teams.",
  siteLabel: "latitude.so",
}

interface ContainerLayoutProps {
  readonly children: ReactNode
  readonly title?: string
  readonly previewText: string
  readonly footer?: ReactNode
  readonly branding?: EmailBranding
}

export function ContainerLayout({
  children,
  title,
  previewText,
  footer,
  branding = LATITUDE_BRANDING,
}: ContainerLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="bg-secondary m-0" style={{ fontFamily: emailDesignTokens.fontFamily }}>
          <Container className="py-6 px-2">
            <Section className="pb-8">
              <Row>
                <Column align="left">
                  <Link href={branding.homeUrl} className="text-center">
                    <Img
                      src={branding.logoUrl}
                      alt={branding.logoAlt}
                      width={branding.logoWidth}
                      height={branding.logoHeight}
                    />
                  </Link>
                </Column>
                <Column align="right">
                  <EmailButton href={branding.homeUrl} label={branding.actionLabel} variant="outline" />
                </Column>
              </Row>
            </Section>
            <Section className={`bg-white ${emailDesignTokens.radius.card} px-6 py-8 border border-border`}>
              {title && (
                <Section className="mb-4">
                  <h2 className="text-2xl font-semibold text-foreground m-0">{title}</h2>
                </Section>
              )}
              {children}
              {footer ? <Section className="pt-6 border-t border-dashed mt-8 border-border">{footer}</Section> : null}
            </Section>
            <Section className="mt-8" align="center">
              <div className="mb-1 text-center">
                <span className="text-sm font-medium text-foreground">{branding.footerName}</span>
              </div>
              <div className="mb-1 text-center">
                <span className="text-sm text-muted-foreground">{branding.footerSubtitle}</span>
              </div>
              <div className="text-center">
                <Link href={branding.homeUrl} style={{ textDecoration: "none" }}>
                  <span className="text-sm" style={{ color: emailDesignTokens.colors.primary }}>
                    {branding.siteLabel}
                  </span>
                </Link>
              </div>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
