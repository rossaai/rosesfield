import { describe, expect, it } from "vitest"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { resolveBinding, selectBinding } from "#domain/select-binding"
import { portraitId, referenceId } from "../sample"

const open = { adapter: "engine-a", config: { graph: "a" } }
const hosted = { adapter: "engine-b", config: { model: "b" } }
const byModel = selectBinding({ input: "model", options: { open, hosted } })

describe("resolveBinding", () => {
  it("returns the binding of the option the input holds", () => {
    expect(resolveBinding(byModel, { model: "hosted" })).toEqual(hosted)
    expect(resolveBinding(byModel, { model: "open" })).toEqual(open)
  })

  it("returns a binding that selects nothing as it is", () => {
    expect(resolveBinding(open, { model: "hosted" })).toBe(open)
  })

  it("follows a select inside a select", () => {
    const nested = selectBinding({
      input: "quality",
      options: { final: byModel },
    })
    expect(resolveBinding(nested, { quality: "final", model: "open" })).toEqual(
      open
    )
  })

  it.each([{ model: "other" }, { model: 3 }, {}, { model: "toString" }])(
    "refuses the inputs %j",
    (inputs) => {
      expect(() => resolveBinding(byModel, inputs)).toThrow(
        EngineBindingInvalidError
      )
    }
  )

  it("refuses a select that loops back on itself", () => {
    const loop = selectBinding({ input: "model", options: {} })
    const options = loop.config.options
    if (typeof options !== "object" || options === null) {
      throw new Error("the select has no options")
    }
    Object.assign(options, { open: loop })
    expect(() => resolveBinding(loop, { model: "open" })).toThrow(
      EngineBindingInvalidError
    )
  })

  it("picks by whether an asset input is filled", () => {
    const text = { adapter: "engine-a", config: { graph: "text" } }
    const edit = { adapter: "engine-a", config: { graph: "edit" } }
    const byFill = selectBinding({
      input: "references",
      by: "filled",
      options: { empty: text, filled: edit },
    })
    expect(resolveBinding(byFill, { references: [] })).toEqual(text)
    expect(resolveBinding(byFill, {})).toEqual(text)
    expect(resolveBinding(byFill, { references: [referenceId] })).toEqual(edit)
  })

  it("picks by how many assets an input holds", () => {
    const one = { adapter: "engine-a", config: { slots: 1 } }
    const two = { adapter: "engine-a", config: { slots: 2 } }
    const byCount = selectBinding({
      input: "references",
      by: "count",
      options: { "1": one, "2": two },
    })
    expect(resolveBinding(byCount, { references: [referenceId] })).toEqual(one)
    expect(
      resolveBinding(byCount, { references: [referenceId, portraitId] })
    ).toEqual(two)
    expect(() =>
      resolveBinding(byCount, {
        references: [referenceId, portraitId, referenceId],
      })
    ).toThrow("no option is bound to 3")
    expect(() => resolveBinding(byCount, { references: "a" })).toThrow(
      "holds no assets"
    )
  })

  it("takes a start frame or a clip through two selects", () => {
    const text = { adapter: "engine-a", config: { graph: "text" } }
    const frame = { adapter: "engine-a", config: { graph: "frame" } }
    const clip = { adapter: "engine-a", config: { graph: "clip" } }
    const video = selectBinding({
      input: "startFrame",
      by: "filled",
      options: {
        filled: frame,
        empty: selectBinding({
          input: "clip",
          by: "filled",
          options: { filled: clip, empty: text },
        }),
      },
    })
    expect(resolveBinding(video, { startFrame: [referenceId] })).toEqual(frame)
    expect(resolveBinding(video, { clip: [portraitId] })).toEqual(clip)
    expect(resolveBinding(video, {})).toEqual(text)
  })

  it("refuses a select that picks by anything else", () => {
    const odd = {
      adapter: "select",
      config: { input: "model", by: "size", options: { open } },
    }
    expect(() => resolveBinding(odd, { model: "open" })).toThrow(
      "a select picks by value, filled or count"
    )
  })
})
