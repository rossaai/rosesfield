import {
  appDefinition,
  appListing,
  type InputDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { app, effectsApp, photoAccept } from "#effects/app"
import { recipeOf } from "#effects/effect-recipes"

const preview = {
  file: "melt-away.mp4",
  runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  seed: 7,
  resolution: "720p" as const,
  aspectRatio: "9:16",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
}

function passed(effect: string) {
  return { ...recipeOf(effect), passed: true, preview }
}

function inputNamed(
  inputs: readonly InputDefinition[],
  name: string
): InputDefinition | undefined {
  return inputs.find((input) => input.name === name)
}

describe("the effects app offers only passed effects", () => {
  it("is closed with its note and offers no effect while none has passed", () => {
    const shipped = appListing.parse(appDefinition.parse(app))
    expect(shipped.closedKey).toBe("effects.closed")
    expect(inputNamed(shipped.inputs, "effect")).toBeUndefined()
    expect(appDefinition.parse(app).engine.config).toMatchObject({
      options: {},
    })
  })

  it("offers the passed effects in their order, with the first as the default", () => {
    const open = appDefinition.parse(
      effectsApp([passed("melt-away"), passed("grow-wings")])
    )
    expect(open.closedKey).toBeNull()
    expect(inputNamed(open.inputs, "effect")).toMatchObject({
      options: [{ value: "melt-away" }, { value: "grow-wings" }],
      default: "melt-away",
    })
  })

  it("refuses a candidate that has not passed before any request", () => {
    const open = appDefinition.parse(effectsApp([passed("melt-away")]))
    const body = startRunBodyFor(open)
    expect(
      body.safeParse({
        inputs: { effect: "melt-away", image: [preview.runId] },
      }).success
    ).toBe(true)
    expect(
      body.safeParse({
        inputs: { effect: "grow-wings", image: [preview.runId] },
      }).success
    ).toBe(false)
  })

  it("declares the formats, the 20 MB and the 480 pixels its photo input takes", () => {
    const image = inputNamed(appDefinition.parse(app).inputs, "image")
    expect(image).toMatchObject({
      accept: {
        formats: ["image/png", "image/jpeg", "image/webp"],
        maxBytes: 20_000_000,
        minShortSide: 480,
      },
    })
    expect(photoAccept.maxBytes).toBe(20_000_000)
  })
})
