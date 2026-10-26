import {
  type AppDefinition,
  type AppListing,
  appDefinition,
  appListing,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  aspectField,
  bodyOf,
  defaultsOf,
  type FormValues,
} from "@/screens/app/app-form"
import { settingId } from "@/screens/app/fields/setting-rows"
import { appSettingsPlan, isSettingInput } from "@/screens/app/settings-plan"
import {
  bodyAppFor,
  hasSeed,
  modeInput,
  modeOf,
  shownInputsOf,
  type VideoEditMode,
} from "@/studio/video-edit/video-edit-modes"
import { tabDefaultsOf } from "@/studio/video-edit/video-edit-tabs"
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
    inputs: {
      ...base.inputs,
      ...everyInput,
      mode,
      model: tabDefaultsOf(listing, mode, null)[0] ?? "",
    },
  }
}

function names(inputs: readonly { name: string }[]): string[] {
  return inputs.map((input) => input.name)
}

describe("the Video edit screen follows the contract's operation rules", () => {
  it("shows each operation's words below the clip well, then its settings in the plan's order, with the seed under Advanced in Extend and Reframe and the clip's sound kept out of sight", () => {
    const inputsOf = (mode: VideoEditMode): string[] =>
      names(shownInputsOf(listing, mode).filter((one) => !isSettingInput(one)))
    const planOf = (mode: VideoEditMode) => {
      const plan = appSettingsPlan(bodyAppFor(listing, mode), [
        modeInput,
        aspectField,
      ])
      return {
        main: plan.main.map(settingId),
        advanced: plan.advanced.map(settingId),
      }
    }
    expect(inputsOf("extend")).toEqual(["next"])
    expect(inputsOf("reframe")).toEqual(["around"])
    expect(inputsOf("background")).toEqual([])
    expect(planOf("extend")).toEqual({
      main: ["input:resolution", "input:seconds"],
      advanced: ["input:seed"],
    })
    expect(planOf("reframe")).toEqual({
      main: ["input:aspect", "input:resolution"],
      advanced: ["input:seed"],
    })
    expect(planOf("background").advanced).toEqual([])
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
