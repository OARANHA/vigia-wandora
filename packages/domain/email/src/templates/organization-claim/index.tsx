// @ts-expect-error TS6133 - React required at runtime for JSX in workers
// biome-ignore lint/correctness/noUnusedImports: React required at runtime for JSX in workers (tsx/esbuild classic transform)
import React from "react"
import { renderEmail } from "../../utils/render.ts"
import type { RenderedEmail } from "../types.ts"
import { OrganizationClaimEmail } from "./EmailTemplate.tsx"

export interface OrganizationClaimEmailData {
  readonly claimUrl: string
  readonly organizationName: string
  /** ISO claim deadline; the purchased organization itself does not expire. */
  readonly expiresAt: string
  readonly kind?: "temporary" | "commercial"
}

function formatClaimDeadline(expiresAt: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(expiresAt))
}

export async function organizationClaimTemplate(data: OrganizationClaimEmailData): Promise<RenderedEmail> {
  const kind = data.kind ?? "temporary"
  const expiresAtLabel = formatClaimDeadline(data.expiresAt)
  const commercial = kind === "commercial"

  return {
    html: await renderEmail(
      <OrganizationClaimEmail
        claimUrl={data.claimUrl}
        organizationName={data.organizationName}
        expiresAtLabel={expiresAtLabel}
        kind={kind}
      />,
    ),
    subject: commercial ? "Sua compra do Vigia foi confirmada" : "Seu ambiente temporário do Vigia está pronto",
    text: commercial
      ? `Sua compra do Vigia foi confirmada. O ambiente de ${data.organizationName} já está pronto.

Ative seu acesso e siga o onboarding guiado para conectar seu primeiro agente:
${data.claimUrl}

Por segurança, este link de ativação expira em ${expiresAtLabel}. Seu ambiente não é excluído se o link vencer.`
      : `Seu ambiente temporário de ${data.organizationName} está pronto no Vigia.

Ative o acesso antes de ${expiresAtLabel}:
${data.claimUrl}

Se você não iniciou esta configuração, ignore este e-mail. Ambientes temporários não ativados são removidos automaticamente.`,
  }
}

export default OrganizationClaimEmail
