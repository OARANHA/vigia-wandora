import { createPkceChallenge, issueNativeIntegrationAuthorization } from "@repo/utils"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { type ApiTestContext, setupTestApi } from "../test-utils/create-test-app.ts"

const issue = async ({
  nonce,
  verifier,
  expiresAt = Date.now() + 60_000,
}: {
  nonce: string
  verifier: string
  expiresAt?: number
}) =>
  Effect.runPromise(
    issueNativeIntegrationAuthorization(
      {
        version: 1,
        integration: "elus",
        nonce,
        organizationId: "org_test",
        projectId: "project_test",
        projectSlug: "agente-elus",
        apiKey: "test-api-key",
        ingestUrl: "https://vigia.example",
        apiUrl: "https://vigia.example",
        codeChallenge: await createPkceChallenge(verifier),
        expiresAt,
      },
      process.env.LAT_MASTER_ENCRYPTION_KEY ?? "test-master-key",
    ),
  )

const exchange = (app: ApiTestContext["app"], code: string, codeVerifier: string) =>
  app.fetch(
    new Request("http://localhost/v1/integrations/elus/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier }),
    }),
  )

describe("Elus native integration exchange", () => {
  setupTestApi()

  it<ApiTestContext>("returns the server-side config once and rejects replay", async ({ app }) => {
    const verifier = "v".repeat(64)
    const code = await issue({ nonce: "one-shot-1", verifier })

    const first = await exchange(app, code, verifier)
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({
      organizationId: "org_test",
      projectId: "project_test",
      projectSlug: "agente-elus",
      ingestUrl: "https://vigia.example",
      apiUrl: "https://vigia.example",
      apiKey: "test-api-key",
    })

    const replay = await exchange(app, code, verifier)
    expect(replay.status).toBe(409)
    expect(await replay.json()).toEqual({ error: "code_already_used" })
  })

  it<ApiTestContext>("does not burn the code when the PKCE verifier is wrong", async ({ app }) => {
    const verifier = "v".repeat(64)
    const code = await issue({ nonce: "pkce-1", verifier })

    const forged = await exchange(app, code, "x".repeat(64))
    expect(forged.status).toBe(400)
    expect(await forged.json()).toEqual({ error: "invalid_verifier" })

    const genuine = await exchange(app, code, verifier)
    expect(genuine.status).toBe(200)
  })

  it<ApiTestContext>("rejects expired authorization codes", async ({ app }) => {
    const verifier = "v".repeat(64)
    const code = await issue({ nonce: "expired-1", verifier, expiresAt: Date.now() - 1 })

    const response = await exchange(app, code, verifier)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "expired_code" })
  })
})
