import { describe, expect, it } from "vitest"
import { resolveIngestApiKey } from "./auth.ts"

describe("resolveIngestApiKey", () => {
  it("uses the standard Bearer token when present", () => {
    expect(
      resolveIngestApiKey({
        authorization: "Bearer standard-key",
        apiKey: "phoenix-key",
      }),
    ).toBe("standard-key")
  })

  it("accepts the Flowise Phoenix api_key header when Authorization is absent", () => {
    expect(resolveIngestApiKey({ apiKey: " phoenix-key " })).toBe("phoenix-key")
  })

  it("does not fall back to api_key when an invalid Authorization header is present", () => {
    expect(
      resolveIngestApiKey({
        authorization: "Basic invalid",
        apiKey: "phoenix-key",
      }),
    ).toBeUndefined()
  })

  it("rejects empty credentials", () => {
    expect(resolveIngestApiKey({ authorization: "Bearer   " })).toBeUndefined()
    expect(resolveIngestApiKey({ apiKey: "   " })).toBeUndefined()
  })
})
