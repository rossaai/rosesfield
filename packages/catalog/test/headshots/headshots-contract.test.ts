import {
  type AppDefinition,
  appDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#headshots/app"
import { readApps } from "#list-apps"

const photoId = assetIdFormat.parse("3c5e7a9b-1d3f-4b5d-9f1c-3e5a7b9d1f3c")
const otherId = assetIdFormat.parse("5e7a9b1d-3f5b-4d9f-8c3e-5a7b9d1f3c5e")
const [headshots] = readApps([{ folder: "headshots", app }])

function definition(): AppDefinition {
  if (headshots === undefined) {
    throw new Error("The headshots app did not parse")
  }
  return headshots
}

function takes(read: AppDefinition, body: unknown): boolean {
  return startRunBodyFor(read).safeParse(body).success
}

const photo = { image: [photoId] }

const refused: readonly [string, unknown][] = [
  ["no photo", { inputs: {} }],
  ["an empty photo list", { inputs: { image: [] } }],
  ["two photos", { inputs: { image: [photoId, otherId] } }],
  ["a background off the list", { inputs: { ...photo, background: "beach" } }],
  ["clothes off the list", { inputs: { ...photo, clothes: "suit" } }],
  ["a framing off the list", { inputs: { ...photo, framing: "full" } }],
  [
    "a glasses value other than on or off",
    { inputs: { ...photo, keepGlasses: "yes" } },
  ],
  ["a model input", { inputs: { ...photo, model: "nano-banana-pro" } }],
  ["a prompt input", { inputs: { ...photo, prompt: "smile" } }],
  ["a seed past 2147483647", { inputs: { ...photo, seed: 2_147_483_648 } }],
  ["a count of 0", { inputs: photo, count: 0 }],
  ["a count of 5", { inputs: photo, count: 5 }],
  ["the format 16:9", { inputs: photo, aspectRatio: "16:9" }],
  ["the format 4:5", { inputs: photo, aspectRatio: "4:5" }],
]

describe("the Headshots run body every client reads", () => {
  it("declares no modes and no input that bounds another", () => {
    const read = definition()
    const ruled = read.inputs.filter(
      (input) =>
        (input.type !== "seed" && input.when !== undefined) ||
        ("bounds" in input && input.bounds !== undefined)
    )
    expect(ruled).toEqual([])
    expect(read.inputs.some((input) => input.name === "mode")).toBe(false)
    const counting = read.inputs.filter(
      (input) =>
        input.type === "choice" &&
        input.options.some((option) => option.count !== undefined)
    )
    expect(counting).toEqual([])
  })

  it("fills the defaults for a run with only a photo", () => {
    expect(startRunBodyFor(definition()).parse({ inputs: photo })).toEqual({
      inputs: {
        image: [photoId],
        background: "grey",
        clothes: "keep",
        framing: "standard",
        keepGlasses: "on",
      },
      count: 2,
      aspectRatio: "1:1",
    })
  })

  it.each([1, 2, 3, 4])("takes a count of %i", (count) => {
    expect(takes(definition(), { inputs: photo, count })).toBe(true)
  })

  it.each(["1:1", "3:4", "4:3"])("takes the format %s", (aspectRatio) => {
    expect(takes(definition(), { inputs: photo, aspectRatio })).toBe(true)
  })

  it.each(refused)("refuses %s", (_, body) => {
    expect(takes(definition(), body)).toBe(false)
  })

  it("takes a count of 5 and two photos on a planted definition with wider bounds, the control", () => {
    const planted = appDefinition.parse({
      ...definition(),
      inputs: definition().inputs.map((input) =>
        input.type === "image" ? { ...input, max: 2 } : input
      ),
      output: {
        kind: "image",
        count: { default: 2, max: 5 },
        aspectRatios: { options: ["1:1", "3:4", "4:3"], default: "1:1" },
      },
    })
    expect(takes(planted, { inputs: photo, count: 5 })).toBe(true)
    expect(takes(planted, { inputs: { image: [photoId, otherId] } })).toBe(true)
  })
})
