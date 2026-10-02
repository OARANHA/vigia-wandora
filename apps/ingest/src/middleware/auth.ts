import { validateApiKey } from "@platform/api-key-auth"
import { withTracing } from "@repo/observability"
import { Effect } from "effect"
import type { MiddlewareHandler } from "hono"
import { getAdminPostgresClient, getRedisClient } from "../clients.ts"
import type { IngestEnv } from "../types.ts"
import { createTouchBuffer } from "./touch-buffer.ts"

export function resolveIngestApiKey({
  authorization,
  apiKey,
}: {
  readonly authorization?: string | undefined
  readonly apiKey?: string | undefined
}): string | undefined {
  if (authorization !== undefined) {
    if (!authorization.startsWith("Bearer ")) return undefined
    const bearer = authorization.slice(7).trim()
    return bearer || undefined
  }

  const phoenixKey = apiKey?.trim()
  return phoenixKey || undefined
}

export const authMiddleware: MiddlewareHandler<IngestEnv> = async (c, next) => {
  const token = resolveIngestApiKey({
    authorization: c.req.header("Authorization"),
    apiKey: c.req.header("api_key"),
  })
  if (!token) {
    return c.json({ error: "Authorization header with Bearer token or api_key header is required" }, 401)
  }
  const adminClient = getAdminPostgresClient()
  const touchBuffer = createTouchBuffer(adminClient)

  const result = await Effect.runPromise(
    validateApiKey(token, {
      redis: getRedisClient(),
      adminClient,
      onKeyValidated: (keyId) => touchBuffer.touch(keyId),
    }).pipe(withTracing),
  )

  if (!result) {
    return c.json({ error: "Invalid API key" }, 401)
  }

  c.set("organizationId", result.organizationId)
  c.set("apiKeyId", result.keyId)
  c.set("isSandbox", result.isSandbox)
  await next()
}
