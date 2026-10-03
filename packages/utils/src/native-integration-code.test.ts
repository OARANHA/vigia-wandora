import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  createPkceChallenge,
  issueNativeIntegrationAuthorization,
  readNativeIntegrationAuthorization,
  verifyNativeIntegrationPkce,
} from "./native-integration-code.ts"

describe("native integration authorization", () => {
  it("keeps the Vigia ingest credential encrypted while preserving the PKCE binding", async () => {
    const verifier = "v".repeat(64)
    const challenge = await createPkceChallenge(verifier)
    const masterSecret = "master-secret-used-only-in-test"

    const code = await Effect.runPromise(
      issueNativeIntegrationAuthorization(
        {
          version: 1,
          integration: "elus",
          nonce: "nonce-1",
          organizationId: "org_1",
          projectId: "project_1",
          projectSlug: "meu-agente",
          apiKey: "vig_super_secret",
          ingestUrl: "https://vigia.example",
          apiUrl: "https://vigia.example",
          codeChallenge: challenge,
          expiresAt: Date.now() + 60_000,
        },
        masterSecret,
      ),
    )

    expect(code).not.toContain("vig_super_secret")

    const decoded = await Effect.runPromise(readNativeIntegrationAuthorization(code, masterSecret))
    expect(decoded.projectSlug).toBe("meu-agente")
    expect(decoded.apiKey).toBe("vig_super_secret")
    expect(await verifyNativeIntegrationPkce(verifier, decoded.codeChallenge)).toBe(true)
    expect(await verifyNativeIntegrationPkce("x".repeat(64), decoded.codeChallenge)).toBe(false)
  })

  it("rejects a code encrypted by another Vigia master key", async () => {
    const code = await Effect.runPromise(
      issueNativeIntegrationAuthorization(
        {
          version: 1,
          integration: "elus",
          nonce: "nonce-1",
          organizationId: "org_1",
          projectId: "project_1",
          projectSlug: "meu-agente",
          apiKey: "vig_secret",
          ingestUrl: "https://vigia.example",
          apiUrl: "https://vigia.example",
          codeChallenge: await createPkceChallenge("v".repeat(64)),
          expiresAt: Date.now() + 60_000,
        },
        "master-a",
      ),
    )

    await expect(Effect.runPromise(readNativeIntegrationAuthorization(code, "master-b"))).rejects.toBeDefined()
  })
})
