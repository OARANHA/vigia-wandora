import { magicLinkTemplate } from "@domain/email"
import { describe, expect, it } from "vitest"

describe("magic link email copy", () => {
  it("uses Vigia branding and PT-BR copy", async () => {
    const rendered = await magicLinkTemplate({
      userName: "there",
      magicLinkUrl: "https://vigia.wandora.com.br/auth/verify#preview",
    })

    expect(rendered.subject).toBe("Seu link de acesso ao Vigia")
    expect(rendered.text).toContain("Recebemos uma solicitação de acesso ao Vigia")
    expect(rendered.text).toContain("Entrar no Vigia")
    expect(rendered.html).toContain("Confirme seu acesso")
    expect(rendered.html).toContain("Entrar no Vigia")
    expect(rendered.html).toContain("Vigia")
    expect(rendered.html).toContain("by Wandora")
    expect(rendered.html).toContain("/brand/vigia-logo.png")
    expect(rendered.html).not.toContain("Latitude")
    expect(rendered.text).not.toContain("Latitude")
  })
})
