import { describe, expect, it } from "vitest"
import { resolveProjectSlugHeader } from "./project.ts"

describe("resolveProjectSlugHeader", () => {
  it("prefers the Vigia product header", () => {
    expect(
      resolveProjectSlugHeader({
        vigiaProject: " atendimento ",
        latitudeProject: "legacy-project",
      }),
    ).toBe("atendimento")
  })

  it("keeps the Latitude header as a compatibility alias", () => {
    expect(resolveProjectSlugHeader({ latitudeProject: "legacy-project" })).toBe("legacy-project")
  })

  it("ignores blank headers", () => {
    expect(resolveProjectSlugHeader({ vigiaProject: "  ", latitudeProject: " " })).toBeUndefined()
  })
})
