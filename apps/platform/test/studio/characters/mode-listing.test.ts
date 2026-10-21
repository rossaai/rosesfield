import type { Mode } from "@rosesfield/catalog/characters"
import {
  type AppDefinition,
  type AppListing,
  appDefinition,
  appListing,
  type Run,
  run,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  bodyOf,
  defaultsOf,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"
import {
  firstModeOf,
  isPanelInput,
  keptInputsOf,
  listingFor,
  randomTraits,
  traitsModelsOf,
} from "@/studio/characters/mode-listing"
import { app } from "../../../../../packages/catalog/src/characters/app"
import { flux, qwenEdit, zImage } from "../image/image-screen"

const listing: AppListing = appListing.parse(app)
const definition: AppDefinition = appDefinition.parse(app)
const character = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"

function namesIn(mode: Mode): string[] {
  return listingFor(listing, mode).inputs.map((input) => input.name)
}

function bodyIn(mode: Mode, inputs: FormValues["inputs"] = {}) {
  const shown = listingFor(listing, mode)
  const base = defaultsOf(shown)
  return bodyOf(shown, { ...base, inputs: { ...base.inputs, ...inputs } })
}

function anglesRun(appId: string = listing.id): Run {
  return run.parse({
    id: "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
    appId,
    status: "done",
    inputs: { mode: "angles", count: "4", character: [character] },
    count: 4,
    aspectRatio: null,
    seed: 12,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T10:00:00.000Z",
    finishedAt: "2026-10-17T10:00:03.000Z",
  })
}

function bodyFromRun(mode: Mode, record: Run) {
  const shown = listingFor(listing, mode)
  return bodyOf(shown, valuesFromRun(shown, record))
}

function isAccepted(body: unknown): boolean {
  return startRunBodyFor(definition).safeParse(body).success
}

describe("the Characters screen follows the contract's modes", () => {
  it("shows only the inputs each mode declares", () => {
    expect(namesIn("traits")).toEqual([
      "mode",
      "count",
      "gender",
      "age",
      "skinTone",
      "bodyType",
      "hairLength",
      "hairStyle",
      "hairColor",
      "eyeColor",
      "outfit",
      "details",
      "framing",
      "plainBackground",
      "model",
      "seed",
    ])
    expect(namesIn("angles")).toEqual([
      "mode",
      "count",
      "character",
      "angleSet",
      "seed",
    ])
  })

  it("fixes angles at 4 views and hides the count there", () => {
    const angles = listingFor(listing, "angles")
    expect(angles.output.count).toEqual({ default: 4, max: 4 })
    const count = angles.inputs.find((input) => input.name === "count")
    expect(count).toMatchObject({ default: "4", options: [{ value: "4" }] })
    expect(
      angles.inputs.filter(isPanelInput).map((input) => input.name)
    ).toEqual(["character", "angleSet"])
    expect(listingFor(listing, "traits").output.count).toEqual({
      default: 2,
      max: 4,
    })
  })

  it("sends a body the gateway accepts in each mode", () => {
    expect(isAccepted(bodyIn("traits"))).toBe(true)
    expect(isAccepted(bodyIn("traits", randomTraits(listing)))).toBe(true)
    expect(isAccepted(bodyIn("angles", { character: [character] }))).toBe(true)
  })

  it("sends a body the gateway refuses once a mode's bound is lost", () => {
    const body = bodyIn("angles", { character: [character] })
    expect(
      isAccepted({ ...body, inputs: { ...body.inputs, count: "2" } })
    ).toBe(false)
    expect(isAccepted({ ...body, count: 2 })).toBe(false)
    const full = defaultsOf(listing)
    const unfiltered = bodyOf(listing, {
      ...full,
      inputs: { ...full.inputs, mode: "angles", character: [character] },
    })
    expect(isAccepted(unfiltered)).toBe(false)
  })

  it("opens on the mode of the run a person reuses", () => {
    const record = anglesRun()
    const first = firstModeOf(listing, { use: undefined }, record)
    expect(first).toBe("angles")
    expect(isAccepted(bodyFromRun(first, record))).toBe(true)
    expect(isAccepted(bodyFromRun("traits", record))).toBe(false)
  })

  it("opens on traits or angles from the other seeds alone", () => {
    expect(firstModeOf(listing, { use: undefined }, null)).toBe("traits")
    expect(firstModeOf(listing, { use: character }, null)).toBe("angles")
    expect(
      firstModeOf(listing, { use: undefined }, anglesRun("another-app"))
    ).toBe("traits")
  })
})

describe("the traits pick their model from the text to image task", () => {
  it("lists only the models that make an image from text", () => {
    const edit = { ...flux, id: "bfl/flux-3-image-edit", task: "image-edit" }
    expect(
      traitsModelsOf([zImage, edit, flux, qwenEdit]).map((model) => model.id)
    ).toEqual([zImage.id, flux.id, qwenEdit.id])
  })

  it("keeps the traits and drops the model and the next model's own inputs on a pick", () => {
    const traits = listingFor(listing, "traits")
    const kept = keptInputsOf(
      traits,
      {
        mode: "traits",
        gender: "woman",
        hairColor: "red",
        model: zImage.id,
        seed: 7,
        prompt: "words",
      },
      flux
    )
    expect(kept).toEqual([
      ["mode", "traits"],
      ["gender", "woman"],
      ["hairColor", "red"],
    ])
    expect(keptInputsOf(traits, { seed: 7 }, zImage)).toEqual([["seed", 7]])
  })
})
