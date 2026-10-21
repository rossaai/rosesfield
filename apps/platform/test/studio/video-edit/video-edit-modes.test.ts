import {
  type AppDefinition,
  type AppListing,
  appDefinition,
  appListing,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf, type FormValues } from "@/screens/app/app-form"
import {
  advancedInputsOf,
  bodyAppFor,
  hasSeed,
  modeOf,
  shownInputsOf,
  type VideoEditMode,
} from "@/studio/video-edit/video-edit-modes"
import { app } from "../../../../../packages/catalog/src/video-edit/app"

function videoEditListing(): AppListing {
  return appListing.parse(app)
}

function videoEditDefinition(): AppDefinition {
  return appDefinition.parse(app)
}

const listing = videoEditListing()
const clip = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const modes: readonly VideoEditMode[] = [
  "extend",
  "reframe",
  "background",
  "frame-rate",
]

const everyInput = {
  source: [clip],
  seconds: 2,
  next: "the door opens",
  aspect: "9-16",
  around: "a brick wall",
  color: "white",
  factor: "4x",
  resolution: "720p",
  seed: 7,
}

function valuesIn(mode: VideoEditMode): FormValues {
  const base = defaultsOf(listing)
  return {
    ...base,
    seedMode: "fixed",
    inputs: { ...base.inputs, ...everyInput, mode },
  }
}

function names(inputs: readonly { name: string }[]): string[] {
  return inputs.map((input) => input.name)
}

describe("the Video edit screen follows the contract's operation rules", () => {
  it("shows each operation's inputs below the clip well, with resolution and the seed under Advanced in Extend and Reframe", () => {
    expect(names(shownInputsOf(listing, "extend"))).toEqual([
      "seconds",
      "next",
      "keepSound",
    ])
    expect(names(shownInputsOf(listing, "reframe"))).toEqual([
      "aspect",
      "around",
      "keepSound",
    ])
    expect(names(shownInputsOf(listing, "background"))).toEqual([
      "color",
      "keepSound",
    ])
    expect(names(shownInputsOf(listing, "frame-rate"))).toEqual([
      "factor",
      "keepSound",
    ])
    expect(names(advancedInputsOf(listing, "extend"))).toEqual(["resolution"])
    expect(names(advancedInputsOf(listing, "reframe"))).toEqual(["resolution"])
    expect(advancedInputsOf(listing, "background")).toEqual([])
    expect(advancedInputsOf(listing, "frame-rate")).toEqual([])
    expect(modes.filter(hasSeed)).toEqual(["extend", "reframe"])
  })

  it.each(modes)(
    "sends a %s run the gateway accepts after every operation was filled",
    (mode) => {
      const body = bodyOf(bodyAppFor(listing, mode), valuesIn(mode))
      const parsed = startRunBodyFor(videoEditDefinition()).safeParse(body)
      expect(parsed.success).toBe(true)
    }
  )

  it("keeps the seed on Extend and Reframe runs and sends none on the others", () => {
    const seedOf = (mode: VideoEditMode) =>
      bodyOf(bodyAppFor(listing, mode), valuesIn(mode)).inputs.seed
    expect(modes.map(seedOf)).toEqual([7, 7, undefined, undefined])
  })

  it.each(modes)(
    "control: a %s body built from every input is refused by the contract",
    (mode) => {
      const body = bodyOf(listing, valuesIn(mode))
      expect(
        startRunBodyFor(videoEditDefinition()).safeParse(body).success
      ).toBe(false)
    }
  )

  it("reads the mode from the form and falls back to Extend", () => {
    expect(modeOf(valuesIn("frame-rate"))).toBe("frame-rate")
    const base = defaultsOf(listing)
    expect(modeOf({ ...base, inputs: { ...base.inputs, mode: "trim" } })).toBe(
      "extend"
    )
  })
})
