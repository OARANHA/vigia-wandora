import { ProjectRepository } from "@domain/projects"
import { submitApiScoreUseCase, type CustomScore } from "@domain/scores"
import { cuidSchema } from "@domain/shared"
import { createRoute, z } from "@hono/zod-openapi"
import {
  ScoreAnalyticsRepositoryLive,
  SpanRepositoryLive,
  TraceRepositoryLive,
  withClickHouse,
} from "@platform/db-clickhouse"
import { OutboxEventWriterLive, ProjectRepositoryLive, ScoreRepositoryLive, withPostgres } from "@platform/db-postgres"
import { withTracing } from "@repo/observability"
import { Effect, Layer } from "effect"
import { defineOperation } from "../core/define-operation.ts"
import type { OperationModule } from "../core/mount.ts"
import {
  jsonBody,
  PROTECTED_SECURITY,
  ProjectParamsSchema,
  TraceRefSchema,
  traceIdSchema,
  typedResponses,
} from "../openapi/schemas.ts"
import type { OrganizationScopedEnv } from "../types.ts"

export const BUSINESS_EVENT_SOURCE_PREFIX = "vigia.business."

const BusinessEventNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/)
  .describe("Stable machine-readable event name, for example `sale_completed` or `appointment_booked`.")

const CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/)
  .describe("ISO 4217 currency code, for example `BRL` or `USD`.")

const BusinessEventMetadataSchema = z.record(z.string(), z.unknown()).default({})

const CreateBusinessEventBodySchema = z
  .object({
    trace: TraceRefSchema.describe("Trace that produced or influenced this business result."),
    event: BusinessEventNameSchema,
    success: z.boolean().describe("Whether this event represents success for the agent's business objective."),
    label: z
      .string()
      .min(1)
      .max(160)
      .optional()
      .describe("Human-readable label shown in Vigia. Defaults to the event name."),
    value: z
      .number()
      .finite()
      .optional()
      .describe("Optional numeric business value, such as revenue or quantity."),
    currency: CurrencySchema.optional().describe("Currency for value when the number is monetary."),
    occurredAt: z.iso
      .datetime()
      .optional()
      .describe("When the business event actually happened. Defaults to ingestion time when omitted."),
    metadata: BusinessEventMetadataSchema.describe("Additional business context, such as order or customer references."),
  })
  .refine((body) => body.currency === undefined || body.value !== undefined, {
    message: "currency requires value",
    path: ["currency"],
  })
  .openapi("CreateBusinessEventBody")

const BusinessEventResponseSchema = z
  .object({
    id: cuidSchema.describe("Stable Vigia identifier for the persisted business result."),
    traceId: traceIdSchema.describe("Trace correlated with this business result."),
    event: BusinessEventNameSchema,
    success: z.boolean(),
    label: z.string(),
    value: z.number().nullable(),
    currency: CurrencySchema.nullable(),
    occurredAt: z.iso.datetime().nullable(),
    metadata: BusinessEventMetadataSchema,
    createdAt: z.iso.datetime(),
  })
  .openapi("BusinessEventResponse")

const businessEventsPath = "/projects/:projectSlug/events"
const businessEventEndpoint = defineOperation<OrganizationScopedEnv>(businessEventsPath)

const createBusinessEvent = businessEventEndpoint({
  route: createRoute({
    method: "post",
    path: "/",
    name: "createBusinessEvent",
    tags: ["Business Events"],
    group: "businessEvents",
    sdkMethod: "create",
    summary: "Record a business result",
    description:
      "Records what success meant for a concrete agent trace. Vigia persists the result using the engine's native custom-score model, preserving trace/session/span correlation without a parallel event store.",
    security: PROTECTED_SECURITY,
    request: {
      params: ProjectParamsSchema,
      body: jsonBody(CreateBusinessEventBodySchema),
    },
    responses: typedResponses({
      status: 201,
      schema: BusinessEventResponseSchema,
      description: "Business result recorded",
    }),
  }),
  access: "write",
  rateLimitTier: "low",
  execute: (input, ctx) => {
    const body = input.body
    const { projectSlug } = input.params
    const organizationId = ctx.organization.id

    return Effect.gen(function* () {
      const projectRepository = yield* ProjectRepository
      const project = yield* projectRepository.findBySlug(projectSlug)
      const label = body.label ?? body.event
      const sourceId = `${BUSINESS_EVENT_SOURCE_PREFIX}${body.event}`

      const score = (yield* submitApiScoreUseCase({
        source: "custom",
        sourceId,
        trace: body.trace,
        value: body.success ? 1 : 0,
        passed: body.success,
        feedback: label,
        metadata: {
          ...body.metadata,
          vigia: {
            kind: "business_event",
            event: body.event,
            success: body.success,
            label,
            ...(body.value !== undefined ? { value: body.value } : {}),
            ...(body.currency !== undefined ? { currency: body.currency } : {}),
            ...(body.occurredAt !== undefined ? { occurredAt: body.occurredAt } : {}),
          },
        },
        organizationId,
        projectId: project.id,
      })) as CustomScore

      return {
        status: 201,
        body: {
          id: score.id as string,
          traceId: score.traceId as string,
          event: body.event,
          success: body.success,
          label,
          value: body.value ?? null,
          currency: body.currency ?? null,
          occurredAt: body.occurredAt ?? null,
          metadata: body.metadata,
          createdAt: score.createdAt.toISOString(),
        },
      } as const
    }).pipe(
      withPostgres(
        Layer.mergeAll(ProjectRepositoryLive, ScoreRepositoryLive, OutboxEventWriterLive),
        ctx.postgresClient,
        organizationId,
      ),
      withClickHouse(
        Layer.mergeAll(ScoreAnalyticsRepositoryLive, TraceRepositoryLive, SpanRepositoryLive),
        ctx.clickhouse,
        organizationId,
      ),
      withTracing,
    )
  },
})

export const businessEventsModule: OperationModule = {
  path: businessEventsPath,
  operations: [createBusinessEvent],
}
