import { describe, expect, it } from "vitest"
import { modelField } from "#comfy/model-catalog.contract"

const frames = {
  kind: "number",
  name: "frames",
  path: "frames",
  required: false,
  min: 9,
  max: 121,
  integer: true,
  default: null,
}

describe("the wire shape of a model's number field", () => {
  it("keeps the field's step, so a client derives values on it", () => {
    expect(modelField.parse({ ...frames, step: 8 })).toMatchObject({ step: 8 })
  })

  it("takes a field with no step and refuses a step that is not above 0", () => {
    expect(modelField.parse(frames)).not.toHaveProperty("step")
    expect(modelField.safeParse({ ...frames, step: 0 }).success).toBe(false)
  })
})
