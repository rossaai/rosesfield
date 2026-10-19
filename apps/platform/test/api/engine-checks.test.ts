import { describe, expect, it } from "vitest"
import { liveCheckOf, readChecks } from "@/api/engine-checks"

describe("the key check", () => {
  it("reads the live engine's answer and leaves out the demo engine", () => {
    const checks = readChecks({
      checks: [
        { engine: "demo", target: "demo", origin: "demo", check: "valid" },
        {
          engine: "comfy",
          target: "comfy-cloud",
          origin: "live",
          check: "invalid",
        },
      ],
    })
    expect(checks).not.toBeNull()
    expect(liveCheckOf(checks ?? [])).toBe("invalid")
    expect(
      liveCheckOf([{ target: "demo", origin: "demo", check: "valid" }])
    ).toBeNull()
  })

  it("refuses a check result the contract does not hold", () => {
    expect(
      readChecks({
        checks: [{ target: "modal", origin: "live", check: "maybe" }],
      })
    ).toBeNull()
  })
})
