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
  type LipsyncMode,
  modeOf,
  shownInputsOf,
} from "@/studio/lipsync/lipsync-modes"
import { app } from "../../../../../packages/catalog/src/lipsync/app"

const listing: AppListing = appListing.parse(app)
const definition: AppDefinition = appDefinition.parse(app)
const photo = "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
const clip = "7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e"
const audio = "8c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f"

function valuesIn(
  mode: LipsyncMode,
  inputs: Record<string, string | number | string[]>
): FormValues {
  const base = defaultsOf(listing)
  return {
    ...base,
    aspectRatio: "4:3",
    inputs: { ...base.inputs, mode, length: 5, ...inputs },
  }
}

const everyInput = {
  photo: [photo],
  clip: [clip],
  audio: [audio],
  scene: "A small kitchen in morning light",
}

function isAccepted(mode: LipsyncMode, values: FormValues): boolean {
  const body = bodyOf(bodyAppFor(listing, mode), values)
  return startRunBodyFor(definition).safeParse(body).success
}

describe("the Lip sync screen follows the contract's mode rules", () => {
  it("shows the inputs of each mode in the definition's order, without the length or the seed", () => {
    const names = (mode: LipsyncMode) =>
      shownInputsOf(listing, mode).map((input) => input.name)
    expect(names("photo")).toEqual(["mode", "photo", "audio", "scene"])
    expect(names("clip")).toEqual(["mode", "clip", "audio"])
  })

  it.each(["photo", "clip"] as const)(
    "sends a %s run the gateway accepts after the other mode was filled too",
    (mode) => {
      expect(isAccepted(mode, valuesIn(mode, everyInput))).toBe(true)
    }
  )

  it.each(["photo", "clip"] as const)(
    "control: a %s body built from every input is refused by the contract",
    (mode) => {
      const body = bodyOf(listing, valuesIn(mode, everyInput))
      expect(startRunBodyFor(definition).safeParse(body).success).toBe(false)
    }
  )

  it("flags the well the mode needs and not the other mode's", () => {
    const names = (mode: LipsyncMode) =>
      problemsOf(formAppFor(listing, mode), valuesIn(mode, {})).map(
        (problem) => problem.name
      )
    expect(names("photo")).toEqual(["photo", "audio"])
    expect(names("clip")).toEqual(["clip", "audio"])
  })

  it("control: the listing as it stands flags both modes' wells", () => {
    const names = problemsOf(listing, valuesIn("photo", {}))
    expect(names.map((problem) => problem.name)).toEqual([
      "photo",
      "clip",
      "audio",
    ])
  })

  it("reads the mode from the form and falls back to From a photo", () => {
    expect(modeOf(valuesIn("clip", {}))).toBe("clip")
    const base = defaultsOf(listing)
    expect(modeOf({ ...base, inputs: { ...base.inputs, mode: "sing" } })).toBe(
      "photo"
    )
  })
})
