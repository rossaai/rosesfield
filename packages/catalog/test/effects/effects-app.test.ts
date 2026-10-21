import {
  appDefinition,
  appListing,
  type InputDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { app, effectsApp, photoAccept } from "#effects/app"
import { passedRecipe, passedRun } from "./passed-recipe"

function inputNamed(
  inputs: readonly InputDefinition[],
  name: string
): InputDefinition | undefined {
  return inputs.find((input) => input.name === name)
}

describe("the effects app offers only passed effects", () => {
  it("is closed with its note and offers no effect while none has passed", () => {
    const closed = appListing.parse(appDefinition.parse(effectsApp([])))
    expect(closed.closedKey).toBe("effects.closed")
    expect(inputNamed(closed.inputs, "effect")).toBeUndefined()
    expect(appDefinition.parse(effectsApp([])).engine.config).toMatchObject({
      options: {},
    })
  })

  it("ships open with Push into eye, the one look that passed, as its default", () => {
    const shipped = appListing.parse(appDefinition.parse(app))
    expect(shipped.closedKey).toBeNull()
    expect(inputNamed(shipped.inputs, "effect")).toMatchObject({
      options: [{ value: "push-into-eye" }],
      default: "push-into-eye",
    })
  })

  it("offers the passed effects in their order, with the first as the default", () => {
    const open = appDefinition.parse(
      effectsApp([passedRecipe("melt-away"), passedRecipe("many-copies")])
    )
    expect(open.closedKey).toBeNull()
    expect(inputNamed(open.inputs, "effect")).toMatchObject({
      options: [{ value: "melt-away" }, { value: "many-copies" }],
      default: "melt-away",
    })
  })

  it("refuses a candidate that has not passed before any request", () => {
    const open = appDefinition.parse(effectsApp([passedRecipe("melt-away")]))
    const body = startRunBodyFor(open)
    expect(
      body.safeParse({
        inputs: { effect: "melt-away", image: [passedRun.runId] },
      }).success
    ).toBe(true)
    expect(
      body.safeParse({
        inputs: { effect: "many-copies", image: [passedRun.runId] },
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
