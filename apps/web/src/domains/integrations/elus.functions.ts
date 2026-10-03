import { ApiKeyRepository, generateApiKeyUseCase } from "@domain/api-keys"
import { ProjectRepository } from "@domain/projects"
import { ApiKeyRepositoryLive, OutboxEventWriterLive, ProjectRepositoryLive, withPostgres } from "@platform/db-postgres"
import { parseEnv } from "@platform/env"
import { withTracing } from "@repo/observability"
import { issueNativeIntegrationAuthorization, randomToken } from "@repo/utils"
import { createServerFn } from "@tanstack/react-start"
import { Effect, Layer } from "effect"
import { z } from "zod"
import { requireSession } from "../../server/auth.ts"
import { getPostgresClient } from "../../server/clients.ts"

const ELUS_KEY_PREFIX = "Elus native"

export const authorizeElusIntegrationInputSchema = z.object({
  projectSlug: z.string().min(1).max(256),
  codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  state: z.string().min(1).max(4096),
})

export interface AuthorizeElusIntegrationResult {
  readonly callbackUrl: string
}

export const authorizeElusIntegration = createServerFn({ method: "POST" })
  .inputValidator(authorizeElusIntegrationInputSchema)
  .handler(async ({ data }): Promise<AuthorizeElusIntegrationResult> => {
    const { organizationId, userId } = await requireSession()
    const client = getPostgresClient()

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const projectRepo = yield* ProjectRepository
        const apiKeyRepo = yield* ApiKeyRepository
        const project = yield* projectRepo.findBySlug(data.projectSlug)

        const keyName = `${ELUS_KEY_PREFIX} · ${project.id}`
        const existing = (yield* apiKeyRepo.list()).find((key) => key.name === keyName)
        const apiKey =
          existing ??
          (yield* generateApiKeyUseCase({
            name: keyName,
            isSandbox: false,
            actorUserId: userId,
          }))

        const masterSecret = yield* parseEnv("LAT_MASTER_ENCRYPTION_KEY", "string")
        const ingestUrl = yield* parseEnv("LAT_INGEST_URL", "string", "https://vigia.wandora.com.br")
        const apiUrl = yield* parseEnv("LAT_API_URL", "string", "https://vigia.wandora.com.br")
        const elusUrl = yield* parseEnv("LAT_ELUS_URL", "string", "https://elus.wandora.com.br")

        const code = yield* issueNativeIntegrationAuthorization(
          {
            version: 1,
            integration: "elus",
            nonce: randomToken(32),
            organizationId,
            projectId: project.id as string,
            projectSlug: project.slug,
            apiKey: apiKey.token,
            ingestUrl,
            apiUrl,
            codeChallenge: data.codeChallenge,
            expiresAt: Date.now() + 5 * 60 * 1000,
          },
          masterSecret,
        )

        const callbackUrl = new URL("/api/v1/integrations/vigia/callback", elusUrl)
        callbackUrl.searchParams.set("code", code)
        callbackUrl.searchParams.set("state", data.state)
        return { callbackUrl: callbackUrl.toString() }
      }).pipe(
        withPostgres(
          Layer.mergeAll(ApiKeyRepositoryLive, ProjectRepositoryLive, OutboxEventWriterLive),
          client,
          organizationId,
        ),
        withTracing,
      ),
    )

    return result
  })
