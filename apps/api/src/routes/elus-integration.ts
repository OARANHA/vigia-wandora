import { parseEnv } from "@platform/env"
import { readNativeIntegrationAuthorization, verifyNativeIntegrationPkce } from "@repo/utils"
import { Effect } from "effect"
import type { OpenAPIHono } from "@hono/zod-openapi"
import { z } from "zod"
import type { AppEnv } from "../types.ts"

const exchangeSchema = z.object({
  code: z.string().min(1).max(12_000),
  codeVerifier: z.string().min(43).max(128),
})

export const registerElusIntegrationRoutes = ({ app }: { app: OpenAPIHono<AppEnv> }) => {
  app.post("/integrations/elus/exchange", async (c) => {
    c.header("Cache-Control", "no-store")

    const raw = await c.req.json().catch(() => null)
    const parsed = exchangeSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: "invalid_request" }, 400)
    }

    const masterSecret = Effect.runSync(parseEnv("LAT_MASTER_ENCRYPTION_KEY", "string"))
    const authorization = await Effect.runPromise(
      readNativeIntegrationAuthorization(parsed.data.code, masterSecret),
    ).catch(() => null)

    if (!authorization || authorization.integration !== "elus") {
      return c.json({ error: "invalid_code" }, 400)
    }
    if (authorization.expiresAt <= Date.now()) {
      return c.json({ error: "expired_code" }, 400)
    }
    if (!(await verifyNativeIntegrationPkce(parsed.data.codeVerifier, authorization.codeChallenge))) {
      return c.json({ error: "invalid_verifier" }, 400)
    }

    let claimed: string | null
    try {
      claimed = await c
        .get("redis")
        .set(
          `org:system:native-integration:elus:code:${authorization.nonce}`,
          "1",
          "EX",
          Math.max(1, Math.ceil((authorization.expiresAt - Date.now()) / 1000)),
          "NX",
        )
    } catch {
      return c.json({ error: "exchange_temporarily_unavailable" }, 503)
    }
    if (claimed !== "OK") {
      return c.json({ error: "code_already_used" }, 409)
    }

    return c.json({
      organizationId: authorization.organizationId,
      projectId: authorization.projectId,
      projectSlug: authorization.projectSlug,
      ingestUrl: authorization.ingestUrl,
      apiUrl: authorization.apiUrl,
      apiKey: authorization.apiKey,
    })
  })
}
