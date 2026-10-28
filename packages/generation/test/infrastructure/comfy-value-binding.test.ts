import { describe, expect, it } from "vitest"
import type { EngineRequest } from "#domain/generation-engine.port"
import {
  applyBindings,
  type ComfyValueBinding,
} from "#infrastructure/comfy/comfy-value-binding"
import { fakeBinding, portraitId, referenceId } from "../sample"

const request: EngineRequest = {
  idempotencyKey: "key",
  binding: fakeBinding,
  inputs: {
    prompt: "a red door",
    quality: "final",
    references: [referenceId, portraitId],
    empty: [],
  },
  files: [],
  count: 2,
  aspectRatio: "16:9",
  seed: 42,
  outputKind: "image",
}

function fill(
  bindings: ComfyValueBinding[],
  document: Record<string, unknown> = {},
  createMissing = true
): Record<string, unknown> {
  return applyBindings(document, bindings, {
    adapter: "test",
    request,
    createMissing,
    assetValue: (assetId) => `link:${assetId}`,
  })
}

describe("applyBindings", () => {
  it("sets each bound value at its path and leaves the template alone", () => {
    const template = { prompt: "", options: { size: 0 } }
    const filled = fill(
      [
        { from: "input", name: "prompt", path: ["prompt"] },
        { from: "seed", path: ["options", "seed"] },
        { from: "count", path: ["options", "count"] },
        {
          from: "aspectRatio",
          path: ["options", "size"],
          map: { "16:9": 1344 },
        },
        { from: "input", name: "quality", path: ["steps"], map: { final: 40 } },
      ],
      template
    )
    expect(filled).toEqual({
      prompt: "a red door",
      steps: 40,
      options: { size: 1344, seed: 42, count: 2 },
    })
    expect(template).toEqual({ prompt: "", options: { size: 0 } })
  })

  it("binds one asset by index, or every asset as a list", () => {
    const filled = fill([
      { from: "input", name: "references", index: 1, path: ["first"] },
      { from: "input", name: "references", path: ["all"] },
      { from: "input", name: "references", index: 3, path: ["missing"] },
      { from: "input", name: "empty", path: ["none"] },
    ])
    expect(filled).toEqual({
      first: `link:${portraitId}`,
      all: [`link:${referenceId}`, `link:${portraitId}`],
    })
  })

  it("leaves a path alone when the input is absent", () => {
    expect(
      fill([{ from: "input", name: "absent", path: ["x"] }], { x: 1 })
    ).toEqual({
      x: 1,
    })
  })

  it("bounds a value by the length of a text input at the rate another input picks", () => {
    const lengthOf = (
      rate: Record<string, number>,
      max = 40,
      name = "prompt"
    ): ComfyValueBinding => ({
      from: "inputLength",
      name,
      path: ["length"],
      rate: { input: "quality", map: rate },
      plus: 2,
      max,
    })
    expect(fill([lengthOf({ final: 0.12 })])).toEqual({ length: 3.2 })
    expect(fill([lengthOf({ final: 0.3 }, 4)])).toEqual({ length: 4 })
    expect(
      fill([lengthOf({ final: 0.3 }, 40, "absent")], { length: 40 })
    ).toEqual({ length: 40 })
    expect(() => fill([lengthOf({ draft: 0.3 })])).toThrow(
      expect.objectContaining({ code: "ENGINE_BINDING_INVALID" })
    )
  })

  it("writes into a list at a numbered path", () => {
    const filled = fill([{ from: "seed", path: ["seeds", 1] }], {
      seeds: [0, 0],
    })
    expect(filled).toEqual({ seeds: [0, 42] })
  })

  it("refuses a path to nothing when it may not create one", () => {
    expect(() =>
      fill(
        [{ from: "seed", path: ["3", "inputs", "seed"] }],
        { "4": {} },
        false
      )
    ).toThrow(expect.objectContaining({ code: "ENGINE_BINDING_INVALID" }))
  })

  it("refuses a map that has no value for the input", () => {
    expect(() =>
      fill([{ from: "input", name: "quality", path: ["q"], map: { draft: 1 } }])
    ).toThrow(expect.objectContaining({ code: "ENGINE_BINDING_INVALID" }))
  })

  it("refuses a path that crosses a value with no fields", () => {
    expect(() =>
      fill([{ from: "seed", path: ["prompt", "inner"] }], { prompt: "text" })
    ).toThrow(expect.objectContaining({ code: "ENGINE_BINDING_INVALID" }))
  })
})
