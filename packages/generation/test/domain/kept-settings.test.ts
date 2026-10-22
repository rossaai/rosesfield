import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { inputsOfKept, keptCountOf, nearestKeptOf } from "#domain/kept-settings"
import type { ModelForm } from "#domain/model-form"

const form: ModelForm = {
  model: "maker/clip-1",
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 500,
      default: null,
    },
    {
      kind: "media",
      name: "images",
      path: "images",
      required: false,
      media: "image",
      min: 0,
      max: 1,
    },
    {
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["16:9", "9:16"],
      default: "16:9",
    },
    {
      kind: "number",
      name: "duration",
      path: "duration",
      required: false,
      min: 1,
      max: 15,
      integer: true,
      default: 5,
    },
    {
      kind: "toggle",
      name: "safe",
      path: "safe",
      required: false,
      default: true,
    },
  ],
}

const sixteen = JSON.stringify([
  ["aspectRatio", null],
  ["aspectRatio", "16:9"],
  ["count", 1],
  ["duration", 8],
  ["images", 1],
  ["safe", true],
])

const nine = JSON.stringify([
  ["aspectRatio", null],
  ["aspectRatio", "9:16"],
  ["count", 2],
  ["duration", 5],
  ["images", 0],
  ["safe", true],
])

describe("the measured runs a quote is held to", () => {
  it("picks the measured run whose settings differ least from the ones asked", () => {
    const asked = JSON.stringify([
      ["aspectRatio", null],
      ["aspectRatio", "9:16"],
      ["count", 1],
      ["duration", 8],
      ["images", 1],
      ["safe", true],
    ])
    const kept = [
      { settings: nine, cost: 2 },
      { settings: sixteen, cost: 1 },
    ]
    expect(nearestKeptOf(asked, kept)?.cost).toBe(1)
    expect(nearestKeptOf(asked, [])).toBeNull()
  })

  it("rebuilds a measured run's inputs from its settings, with one placeholder per media file and no prompt", () => {
    const inputs = inputsOfKept(form, sixteen, {
      model: form.model,
      prompt: "a door",
      duration: 3,
    })
    expect(inputs).toMatchObject({
      model: form.model,
      prompt: "a door",
      aspectRatio: "16:9",
      duration: 8,
    })
    expect(inputs.images).toHaveLength(1)
    expect(inputs).not.toHaveProperty("safe")
    expect(
      inputsOfKept(form, nine, {
        images: [assetIdFormat.parse("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01")],
      })
    ).not.toHaveProperty("images")
    expect(keptCountOf(nine)).toBe(2)
    expect(keptCountOf("not json")).toBe(1)
  })
})
