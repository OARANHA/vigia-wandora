import type { MiddlewareHandler } from "hono"
import type { IngestEnv } from "../types.ts"

export function resolveProjectSlugHeader({
  vigiaProject,
  latitudeProject,
}: {
  readonly vigiaProject?: string
  readonly latitudeProject?: string
}): string | undefined {
  const vigiaSlug = vigiaProject?.trim()
  if (vigiaSlug) return vigiaSlug

  const latitudeSlug = latitudeProject?.trim()
  return latitudeSlug || undefined
}

/**
 * Reads the Vigia product header and exposes it as the per-request default project slug.
 *
 * X-Latitude-Project remains accepted as a compatibility alias for existing Latitude
 * instrumentations, but Vigia customers only need to know X-Vigia-Project.
 *
 * Best-effort: this middleware does not validate the slug or hit Postgres. Per-span resolution
 * and OTLP partial-success accounting continue in the existing ingest use case.
 */
export const projectMiddleware: MiddlewareHandler<IngestEnv> = async (c, next) => {
  const projectSlug = resolveProjectSlugHeader({
    vigiaProject: c.req.header("X-Vigia-Project"),
    latitudeProject: c.req.header("X-Latitude-Project"),
  })

  if (projectSlug) {
    c.set("defaultProjectSlug", projectSlug)
  }
  await next()
}
