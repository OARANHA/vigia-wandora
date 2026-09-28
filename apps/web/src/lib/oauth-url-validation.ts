const UNSAFE_REDIRECT_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:", "file:"])

const parseAbsoluteUrl = (value: string, options: { readonly allowCredentials?: boolean } = {}): URL | null => {
  try {
    const url = new URL(value)
    if (!options.allowCredentials && (url.username || url.password)) return null
    return url
  } catch {
    return null
  }
}

export const isSafeOAuthIconUrl = (value: string | null | undefined): value is string => {
  if (!value) return false

  const url = parseAbsoluteUrl(value)
  if (!url) return false

  return url.protocol === "https:" || url.protocol === "http:"
}

export const isSafeOAuthRedirectUrl = (value: string | null | undefined): value is string => {
  if (!value) return false
  if (value.includes("*") || value.includes(",")) return false

  const url = parseAbsoluteUrl(value)
  if (!url) return false

  return !UNSAFE_REDIRECT_PROTOCOLS.has(url.protocol)
}

export const validateOAuthClientRegistrationMetadata = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null) {
    return "Client registration body must be a JSON object"
  }

  const fields = body as { readonly redirect_uris?: unknown; readonly logo_uri?: unknown }

  if (Array.isArray(fields.redirect_uris)) {
    for (const redirectUri of fields.redirect_uris) {
      if (typeof redirectUri === "string" && !isSafeOAuthRedirectUrl(redirectUri)) {
        return "redirect_uris must not use executable or embedded URL schemes"
      }
    }
  }

  if (typeof fields.logo_uri === "string" && !isSafeOAuthIconUrl(fields.logo_uri)) {
    return "logo_uri must use an HTTP or HTTPS URL"
  }

  return null
}
