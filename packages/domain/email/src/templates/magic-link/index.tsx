// @ts-expect-error TS6133 - React required at runtime for JSX in workers
// biome-ignore lint/correctness/noUnusedImports: React required at runtime for JSX in workers (tsx/esbuild classic transform)
import React from "react"
import { renderEmail } from "../../utils/render.ts"
import type { RenderedEmail } from "../types.ts"
import { MagicLinkEmail } from "./EmailTemplate.tsx"

export interface MagicLinkEmailData {
  readonly userName: string
  readonly magicLinkUrl: string
}

export async function magicLinkTemplate(data: MagicLinkEmailData): Promise<RenderedEmail> {
  return {
    html: await renderEmail(<MagicLinkEmail userName={data.userName} magicLinkUrl={data.magicLinkUrl} />),
    subject: "Seu link de acesso ao Vigia",
    text: `Recebemos uma solicitação de acesso ao Vigia com este e-mail. Clique no link abaixo para entrar com segurança.

Entrar no Vigia: ${data.magicLinkUrl}

Se você não solicitou este acesso, ignore este e-mail.`,
  }
}

export default MagicLinkEmail
