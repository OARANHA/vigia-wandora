import { OrganizationId, ProjectId, SessionId, SpanId, TraceId } from "@domain/shared"
import { type SpanDetail, SpanRepository } from "@domain/spans"
import { stubListSpan } from "@domain/spans/testing"
import { SpanRepositoryLive, withClickHouse } from "@platform/db-clickhouse"
import { eq } from "@platform/db-postgres"
import { outboxEvents } from "@platform/db-postgres/schema/outbox-events"
import { projects } from "@platform/db-postgres/schema/projects"
import { scores as scoresTable } from "@platform/db-postgres/schema/scores"
import { createApiKeyAuthHeaders, type InMemoryPostgres } from "@platform/testkit"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { type ApiTestContext, createTenantSetup, setupTestApi } from "../test-utils/create-test-app.ts"

const createProjectRecord = async (
  database: InMemoryPostgres,
  organizationId: string,
  projectId: string,
): Promise<string> => {
  const slug = `business-${projectId.slice(0, 8)}`
  await database.db.insert(projects).values({
    id: projectId,
    organizationId,
    name: "Business Events",
    slug,
  })
  return slug
}

const seedTrace = async ({
  clickhouse,
  organizationId,
  projectId,
  traceId,
}: {
  readonly clickhouse: ApiTestContext["clickhouse"]
  readonly organizationId: string
  readonly projectId: string
  readonly traceId: string
}) => {
  const span: SpanDetail = {
    ...stubListSpan({
      organizationId: OrganizationId(organizationId),
      projectId: ProjectId(projectId),
      traceId: TraceId(traceId),
      sessionId: SessionId("business-session"),
      spanId: SpanId("abababababababab"),
      operation: "chat",
      startTime: new Date("2026-09-29T12:00:00.000Z"),
      endTime: new Date("2026-09-29T12:00:01.000Z"),
    }),
    inputMessages: [{ role: "user", parts: [{ type: "text", content: "Quero comprar" }] }],
    outputMessages: [{ role: "assistant", parts: [{ type: "text", content: "Pedido concluído" }] }],
    systemInstructions: [],
    toolDefinitions: [],
    toolCallId: "",
    toolName: "",
    toolInput: "",
    toolOutput: "",
  }

  await Effect.runPromise(
    Effect.gen(function* () {
      const spanRepository = yield* SpanRepository
      yield* spanRepository.insert([span])
    }).pipe(withClickHouse(SpanRepositoryLive, clickhouse, OrganizationId(organizationId))),
  )
}

describe("Business Events Routes Integration", () => {
  setupTestApi()

  it<ApiTestContext>("records a business result on a trace using the native custom-score substrate", async ({
    app,
    database,
    clickhouse,
  }) => {
    const tenant = await createTenantSetup(database)
    const projectId = "be11be11be11be11be11be11"
    const traceId = "12121212121212121212121212121212"
    const projectSlug = await createProjectRecord(database, tenant.organizationId, projectId)
    await seedTrace({ clickhouse, organizationId: tenant.organizationId, projectId, traceId })

    const response = await app.fetch(
      new Request(`http://localhost/v1/projects/${projectSlug}/events`, {
        method: "POST",
        headers: {
          ...createApiKeyAuthHeaders(tenant.apiKeyToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traceId,
          event: "sale_completed",
          success: true,
          label: "Venda concluída",
          value: 1480,
          currency: "BRL",
          occurredAt: "2026-09-29T12:00:02.000Z",
          metadata: {
            orderId: "order-smoke-1",
          },
        }),
      }),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body).toMatchObject({
      traceId,
      event: "sale_completed",
      success: true,
      label: "Venda concluída",
      value: 1480,
      currency: "BRL",
      occurredAt: "2026-09-29T12:00:02.000Z",
      metadata: {
        orderId: "order-smoke-1",
      },
    })

    const persistedScores = await database.db
      .select()
      .from(scoresTable)
      .where(eq(scoresTable.organizationId, tenant.organizationId))

    expect(persistedScores).toHaveLength(1)
    expect(persistedScores[0]).toMatchObject({
      projectId,
      traceId,
      sessionId: "business-session",
      spanId: "abababababababab",
      sourceType: "custom",
      sourceId: "vigia.business.sale_completed",
      value: 1,
      passed: true,
      feedback: "Venda concluída",
      metadata: {
        orderId: "order-smoke-1",
        vigia: {
          kind: "business_event",
          event: "sale_completed",
          success: true,
          label: "Venda concluída",
          value: 1480,
          currency: "BRL",
          occurredAt: "2026-09-29T12:00:02.000Z",
        },
      },
    })

    const events = await database.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.organizationId, tenant.organizationId))

    expect(events).toHaveLength(1)
    expect(events[0]?.eventName).toBe("ScoreCreated")
    expect(events[0]?.payload).toMatchObject({
      organizationId: tenant.organizationId,
      projectId,
      scoreId: body.id,
      status: "published",
    })
  })

  it<ApiTestContext>("keeps a negative business result eligible for the engine's normal signal-discovery path", async ({
    app,
    database,
    clickhouse,
  }) => {
    const tenant = await createTenantSetup(database)
    const projectId = "fa11fa11fa11fa11fa11fa11"
    const traceId = "34343434343434343434343434343434"
    const projectSlug = await createProjectRecord(database, tenant.organizationId, projectId)
    await seedTrace({ clickhouse, organizationId: tenant.organizationId, projectId, traceId })

    const response = await app.fetch(
      new Request(`http://localhost/v1/projects/${projectSlug}/events`, {
        method: "POST",
        headers: {
          ...createApiKeyAuthHeaders(tenant.apiKeyToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traceId,
          event: "appointment_failed",
          success: false,
          label: "Agendamento não concluído",
        }),
      }),
    )

    expect(response.status).toBe(201)

    const persistedScores = await database.db
      .select()
      .from(scoresTable)
      .where(eq(scoresTable.organizationId, tenant.organizationId))

    expect(persistedScores).toHaveLength(1)
    expect(persistedScores[0]).toMatchObject({
      sourceType: "custom",
      sourceId: "vigia.business.appointment_failed",
      traceId,
      value: 0,
      passed: false,
      feedback: "Agendamento não concluído",
    })
  })
})
