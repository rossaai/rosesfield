import { describe, expect, it } from "vitest"
import { ListModelsHandler } from "#application/list-models/list-models.handler"
import { EngineNotEnabledError } from "#domain/error/engine-not-enabled.error"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"

const form = { model: "maker/picture-2", fields: [] }

describe("ListModelsHandler", () => {
  it("keeps the other engines' models and names the refusal of one engine", async () => {
    const handler = new ListModelsHandler({
      engines: [
        new FakeGenerationEngine({ listError: new EngineNotEnabledError({}) }),
        new FakeGenerationEngine({ key: "other", forms: [form] }),
      ],
    })
    const { models, refusal } = await handler.execute({})
    expect(models.map((one) => one.id)).toEqual(["maker/picture-2"])
    expect(refusal?.code).toBe("ENGINE_NOT_ENABLED")
  })

  it("throws an error that is not the project's", async () => {
    const handler = new ListModelsHandler({
      engines: [new FakeGenerationEngine({ listError: new TypeError("bad") })],
    })
    await expect(handler.execute({})).rejects.toBeInstanceOf(TypeError)
  })
})
