import { DEFAULT_API_KEY_NAME, type GenerateApiKeyError, generateApiKeyUseCase } from "@domain/api-keys"
import { OutboxEventWriter } from "@domain/events"
import { type CreateProjectError, createProjectUseCase } from "@domain/projects"
import {
  type ConcurrentSqlTransactionError,
  type OrganizationId,
  type RepositoryError,
  SqlClient,
  toRepositoryError,
} from "@domain/shared"
import type { CryptoError } from "@repo/utils"
import { Effect } from "effect"
import { createOrganization } from "../entities/organization.ts"
import type { SlugGenerationError } from "../errors.ts"
import { OrganizationRepository } from "../ports/organization-repository.ts"
import {
  type GenerateOrganizationClaimError,
  generateOrganizationClaimUseCase,
} from "./generate-organization-claim.ts"
import { generateUniqueOrganizationSlugUseCase } from "./generate-unique-organization-slug.ts"

export const CUSTOMER_ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const DEFAULT_CUSTOMER_PROJECT_NAME = "Meu primeiro agente"

export interface ProvisionCustomerOrganizationInput {
  readonly organizationId: OrganizationId
  readonly actorUserId: string
  readonly organizationName: string
  readonly ownerEmail: string
  readonly webUrl: string
  readonly projectName?: string | undefined
}

export interface ProvisionCustomerOrganizationResult {
  readonly organization: {
    readonly id: string
    readonly name: string
    readonly slug: string
  }
  readonly project: {
    readonly id: string
    readonly name: string
    readonly slug: string
  }
  readonly ownerEmail: string
  readonly activationExpiresAt: Date
}

export type ProvisionCustomerOrganizationError =
  | RepositoryError
  | ConcurrentSqlTransactionError
  | GenerateApiKeyError
  | CreateProjectError
  | SlugGenerationError
  | GenerateOrganizationClaimError
  | CryptoError

/**
 * Provisions a paid/customer workspace without creating a user or owner membership.
 * Ownership is transferred only when the purchaser redeems the email-bound claim.
 *
 * Unlike the public temporary bootstrap, the organization itself never expires.
 * Only the activation claim does.
 */
export const provisionCustomerOrganizationUseCase = Effect.fn("organizations.provisionCustomerOrganization")(
  function* (input: ProvisionCustomerOrganizationInput) {
    const sqlClient = yield* SqlClient
    yield* Effect.annotateCurrentSpan("organization.id", input.organizationId)

    const organizationName = input.organizationName.trim()
    const ownerEmail = input.ownerEmail.trim().toLowerCase()
    const projectName = input.projectName?.trim() || DEFAULT_CUSTOMER_PROJECT_NAME
    const activationExpiresAt = new Date(Date.now() + CUSTOMER_ACTIVATION_TTL_MS)

    return yield* sqlClient.transaction(
      Effect.gen(function* () {
        const organizationRepo = yield* OrganizationRepository
        const outboxEventWriter = yield* OutboxEventWriter

        const slug = yield* generateUniqueOrganizationSlugUseCase({ name: organizationName })
        const organization = createOrganization({
          id: input.organizationId,
          name: organizationName,
          slug,
          expiresAt: null,
        })
        yield* organizationRepo.save(organization)

        yield* generateApiKeyUseCase({
          name: DEFAULT_API_KEY_NAME,
          isSandbox: false,
          actorUserId: input.actorUserId,
        })

        const project = yield* createProjectUseCase({
          name: projectName,
          actorUserId: input.actorUserId,
        })

        const { claimUrl } = yield* generateOrganizationClaimUseCase({
          organizationId: input.organizationId,
          email: ownerEmail,
          expiresAt: activationExpiresAt,
          webUrl: input.webUrl,
        })

        const writeEvent = (event: Parameters<typeof outboxEventWriter.write>[0]) =>
          outboxEventWriter.write(event).pipe(Effect.mapError((error) => toRepositoryError(error, "write")))

        yield* writeEvent({
          eventName: "OrganizationCreated",
          aggregateType: "organization",
          aggregateId: organization.id,
          organizationId: organization.id,
          payload: {
            organizationId: organization.id,
            actorUserId: input.actorUserId,
            name: organization.name,
            slug: organization.slug,
          },
        })

        yield* writeEvent({
          eventName: "ClaimEmailRequested",
          aggregateType: "organization",
          aggregateId: organization.id,
          organizationId: "system",
          payload: {
            email: ownerEmail,
            claimUrl,
            organizationName: organization.name,
            expiresAt: activationExpiresAt.toISOString(),
            kind: "commercial",
          },
        })

        return {
          organization: {
            id: organization.id as string,
            name: organization.name,
            slug: organization.slug,
          },
          project: {
            id: project.id as string,
            name: project.name,
            slug: project.slug,
          },
          ownerEmail,
          activationExpiresAt,
        } satisfies ProvisionCustomerOrganizationResult
      }),
    )
  },
)
