import { describe, expect, it } from "vitest"
import { MissingPathParamError } from "#missing-path-param.error"
import { buildPath } from "#route.contract"

describe("buildPath", () => {
  it("puts each param in its segment, encoded", () => {
    expect(buildPath("/api/runs/:runId/cancel", { runId: "a b/c" })).toBe(
      "/api/runs/a%20b%2Fc/cancel"
    )
  })

  it("returns a path with no params as it is", () => {
    expect(buildPath("/api/assets", {})).toBe("/api/assets")
  })

  it("throws MissingPathParamError when a param has no value", () => {
    const path: string = "/api/runs/:runId"
    expect(() => buildPath(path, {})).toThrow(MissingPathParamError)
  })
})
