import { startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { definition, photoId } from "./relight-requests"

describe("the Relight contract", () => {
  it("refuses the runs the contract refuses before any request", () => {
    const body = startRunBodyFor(definition)
    const refused = (inputs: Record<string, unknown>, count = 1) => {
      const result = body.safeParse({ inputs, count })
      return result.success
        ? []
        : result.error.issues.map((issue) => issue.path.join("."))
    }
    expect(refused({ image: [photoId] })).toEqual([])
    expect(refused({ direction: "left" })).toEqual(["inputs.image"])
    expect(refused({ image: [photoId, photoId] })).toEqual(["inputs.image"])
    expect(refused({ image: [photoId], direction: "below" })).toEqual([
      "inputs.direction",
    ])
    expect(refused({ image: [photoId], softness: "medium" })).toEqual([
      "inputs.softness",
    ])
    expect(refused({ image: [photoId], color: "green" })).toEqual([
      "inputs.color",
    ])
    expect(refused({ image: [photoId], brightness: 3 })).toEqual([
      "inputs.brightness",
    ])
    expect(refused({ image: [photoId], brightness: 0.5 })).toEqual([
      "inputs.brightness",
    ])
    expect(refused({ image: [photoId], prompt: "a".repeat(301) })).toEqual([
      "inputs.prompt",
    ])
    expect(refused({ image: [photoId], quality: "best" })).toEqual([
      "inputs.quality",
    ])
    expect(refused({ image: [photoId], model: "another-model" })).toEqual([
      "inputs.model",
    ])
    expect(
      refused({ image: [photoId], model: "qwen-image-edit-2511" })
    ).toEqual(["inputs.model"])
    expect(refused({ image: [photoId] }, 5)).toEqual(["count"])
    expect(refused({ image: [photoId] }, 0)).toEqual(["count"])
  })
})
