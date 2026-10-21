import { describe, expect, it } from "vitest"
import { fieldOfInput } from "@/studio/video/graph-form"

describe("fieldOfInput", () => {
  it("keeps a graph number input's step, so a value derived from the field stays on it", () => {
    const field = fieldOfInput({
      type: "number",
      name: "seconds",
      labelKey: "video.input.seconds.label",
      min: 2,
      max: 10,
      step: 2,
      default: 4,
    })
    expect(field).toMatchObject({
      kind: "number",
      min: 2,
      max: 10,
      integer: true,
      step: 2,
    })
  })
})
