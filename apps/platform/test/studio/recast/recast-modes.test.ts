import {
  type AppDefinition,
  type AppListing,
  appDefinition,
  appListing,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  bodyOf,
  defaultsOf,
  type FormValues,
  problemsOf,
} from "@/screens/app/app-form"
import {
  bodyAppFor,
  formAppFor,
  modeOf,
  type RecastMode,
  shownInputsOf,
} from "@/studio/recast/recast-modes"
import { app } from "../../../../../packages/catalog/src/recast/app"

function recastListing(): AppListing {
  return appListing.parse(app)
}

function recastDefinition(): AppDefinition {
  return appDefinition.parse(app)
}

const listing = recastListing()
const clip = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const character = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"

function valuesIn(
  mode: RecastMode,
  inputs: Record<string, string | string[]>
): FormValues {
  const base = defaultsOf(listing)
  return { ...base, inputs: { ...base.inputs, mode, ...inputs } }
}

const everyInput = {
  source: [clip],
  character: [character],
  target: "red mug",
  prompt: "a glass of orange juice",
}

function accepted(mode: RecastMode, values: FormValues): boolean {
  const body = bodyOf(bodyAppFor(listing, mode), values)
  return startRunBodyFor(recastDefinition()).safeParse(body).success
}

describe("the Recast screen follows the contract's mode rules", () => {
  it("shows the inputs of each mode in the definition's order", () => {
    expect(
      shownInputsOf(listing, "character").map((input) => input.name)
    ).toEqual(["mode", "source", "character", "keepSound", "quality"])
    expect(shownInputsOf(listing, "object").map((input) => input.name)).toEqual(
      ["mode", "source", "target", "prompt", "keepSound", "quality"]
    )
  })

  it.each(["character", "object"] as const)(
    "sends a %s run the gateway accepts after the other mode was filled too",
    (mode) => {
      expect(accepted(mode, valuesIn(mode, everyInput))).toBe(true)
    }
  )

  it.each(["character", "object"] as const)(
    "control: a %s body built from every input is refused by the contract",
    (mode) => {
      const body = bodyOf(listing, valuesIn(mode, everyInput))
      expect(startRunBodyFor(recastDefinition()).safeParse(body).success).toBe(
        false
      )
    }
  )

  it("flags the inputs the mode needs and none of the other mode's", () => {
    const empty = { source: [clip] }
    const names = (mode: RecastMode) =>
      problemsOf(formAppFor(listing, mode), valuesIn(mode, empty)).map(
        (problem) => problem.name
      )
    expect(names("character")).toEqual(["character"])
    expect(names("object")).toEqual(["target", "prompt"])
  })

  it("control: the listing as it stands flags both modes' inputs", () => {
    const names = problemsOf(listing, valuesIn("character", { source: [clip] }))
    expect(names.map((problem) => problem.name)).toEqual([
      "character",
      "target",
      "prompt",
    ])
  })

  it("reads the mode from the form and falls back to Put in a character", () => {
    expect(modeOf(valuesIn("object", {}))).toBe("object")
    const base = defaultsOf(listing)
    expect(modeOf({ ...base, inputs: { ...base.inputs, mode: "sing" } })).toBe(
      "character"
    )
  })
})
