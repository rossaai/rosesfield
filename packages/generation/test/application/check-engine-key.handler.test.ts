import { describe, expect, it } from "vitest"
import { CheckEngineKeyHandler } from "#application/check-engine-key/check-engine-key.handler"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"

describe("CheckEngineKeyHandler", () => {
  it("reports the key check of each engine on this server", async () => {
    const handler = new CheckEngineKeyHandler({
      engines: [
        new FakeGenerationEngine({ key: "first-engine", keyCheck: "invalid" }),
        new FakeGenerationEngine({
          key: "second-engine",
          origin: "demo",
          keyCheck: "unreachable",
        }),
      ],
    })
    expect(await handler.execute({})).toEqual({
      checks: [
        { engine: "first-engine", origin: "live", check: "invalid" },
        { engine: "second-engine", origin: "demo", check: "unreachable" },
      ],
    })
  })
})
