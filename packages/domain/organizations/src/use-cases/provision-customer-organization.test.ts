import { ApiKeyRepository, DEFAULT_API_KEY_NAME } from "@domain/api-keys"
import { createFakeApiKeyRepository } from "@domain/api-keys/testing"
import { OutboxEventWriter, type OutboxWriteEvent } from "@domain/events"
import { ProjectRepository } from "@domain/projects"
import { createFakeProjectRepository } from "@domain/projects/testing"
import { OrganizationId, SqlClient, type SqlClientShape } from "@domain/shared"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { OrganizationClaimRepository } from "../ports/organization-claim-repository.ts"
import { OrganizationRepository } from "../ports/organization-repository.ts"
import { createFakeOrganizationClaimRepository } from "../testing/fake-organization-claim-repository.ts"
import { createFakeOrganizationRepository } from "../testing/fake-organization-repository.ts"
import {
  CUSTOMER_ACTIVATION_TTL_MS,
  DEFAULT_CUSTOMER_PROJECT_NAME,
  provisionCustomerOrganizationUseCase,
} from "./provision-customer-organization.ts"

const ORG_ID = OrganizationId("oooooooooooooooooooooooo")
const WEB_URL = "https://app-vigia.wandora.com.br"

const setup = () => {
  let inTransaction = false
  const sqlClient: SqlClientShape = {
    organizationId: ORG_ID,
    transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      inTransaction
        ? effect
        : Effect.gen(function* () {
            inTransaction = true
            try {
              return yield* effect
            } finally {
              inTransaction = false
            }
          }),
    query: () => Effect.die(new Error("unexpected query")),
  }

  const { repository: apiKeyRepo, apiKeys } = createFakeApiKeyRepository()
  const { repository: projectRepo, rows: projects } = createFakeProjectRepository()
  const { repository: organizationRepo, organizations } = createFakeOrganizationRepository()
  const { repository: claimRepo, claims } = createFakeOrganizationClaimRepository()
  const events: OutboxWriteEvent[] = []

  const run = () =>
    Effect.runPromise(
      provisionCustomerOrganizationUseCase({
        organizationId: ORG_ID,
        actorUserId: "admin-1",
        organizationName: "  Acme Ltda  ",
        ownerEmail: "  OWNER@ACME.COM  ",
        webUrl: WEB_URL,
      }).pipe(
        Effect.provideService(SqlClient, sqlClient),
        Effect.provideService(ApiKeyRepository, apiKeyRepo),
        Effect.provideService(ProjectRepository, projectRepo),
        Effect.provideService(OrganizationRepository, organizationRepo),
        Effect.provideService(OrganizationClaimRepository, claimRepo),
        Effect.provideService(OutboxEventWriter, {
          write: (event: OutboxWriteEvent) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }),
      ),
    )

  return { run, apiKeys, projects, organizations, claims, events }
}

describe("provisionCustomerOrganizationUseCase", () => {
  it("creates a durable owner-less customer org with project, API key and email-bound activation claim", async () => {
    const { run, apiKeys, projects, organizations, claims, events } = setup()
    const result = await run()

    expect([...organizations.values()]).toHaveLength(1)
    expect(organizations.get(ORG_ID)).toMatchObject({
      id: ORG_ID,
      name: "Acme Ltda",
      slug: "acme-ltda",
      expiresAt: null,
    })

    expect([...apiKeys.values()]).toHaveLength(1)
    expect([...apiKeys.values()][0]?.name).toBe(DEFAULT_API_KEY_NAME)

    expect([...projects.values()]).toHaveLength(1)
    expect([...projects.values()][0]).toMatchObject({
      name: DEFAULT_CUSTOMER_PROJECT_NAME,
      organizationId: ORG_ID,
    })

    expect(claims).toHaveLength(1)
    expect(claims[0]).toMatchObject({
      organizationId: ORG_ID,
      email: "owner@acme.com",
      claimedAt: null,
    })
    const claimTtl = (claims[0]?.expiresAt.getTime() ?? 0) - Date.now()
    expect(claimTtl).toBeGreaterThan(CUSTOMER_ACTIVATION_TTL_MS - 60_000)
    expect(claimTtl).toBeLessThanOrEqual(CUSTOMER_ACTIVATION_TTL_MS)

    expect(events.map((event) => event.eventName)).toEqual([
      "ApiKeyCreated",
      "ProjectCreated",
      "OrganizationCreated",
      "ClaimEmailRequested",
    ])
    expect(events.find((event) => event.eventName === "ApiKeyCreated")?.payload).toMatchObject({
      actorUserId: "admin-1",
    })
    expect(events.find((event) => event.eventName === "ProjectCreated")?.payload).toMatchObject({
      actorUserId: "admin-1",
    })
    expect(events.find((event) => event.eventName === "ClaimEmailRequested")?.payload).toMatchObject({
      email: "owner@acme.com",
      organizationName: "Acme Ltda",
      kind: "commercial",
    })

    expect(result).toMatchObject({
      organization: { id: ORG_ID, name: "Acme Ltda", slug: "acme-ltda" },
      project: { name: DEFAULT_CUSTOMER_PROJECT_NAME },
      ownerEmail: "owner@acme.com",
    })
    expect(result).not.toHaveProperty("apiKey")
    expect(result).not.toHaveProperty("claimUrl")
  })
})
