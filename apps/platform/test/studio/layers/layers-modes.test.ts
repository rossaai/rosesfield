import {
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
  countRangeOf,
  formAppFor,
  type LayersMode,
  layerCountOf,
  layersBodyOf,
  shownInputsOf,
} from "@/studio/layers/layers-modes"
import { app } from "../../../../../packages/catalog/src/layers/app"

const listing: AppListing = appListing.parse(app)
const contract = startRunBodyFor(appDefinition.parse(app))

const image = "0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"
const mask = "1b2c3d4e-5f6a-4b7c-9d8e-9fa0b1c2d3e4"

const everyInput = {
  count: "6",
  source: [image],
  layer: [image],
  change: "a red hat",
  light: "top",
  tone: "warm",
  mask: [mask],
  content: "a brass handle",
}

function valuesIn(
  mode: LayersMode,
  inputs: Record<string, string | string[]>
): FormValues {
  const base = defaultsOf(listing)
  return { ...base, inputs: { ...base.inputs, mode, ...inputs } }
}

const modes: readonly LayersMode[] = ["split", "edit", "relight", "fill"]

describe("the Layers screen follows the contract's mode rules", () => {
  it("shows the inputs of each mode beside its own controls", () => {
    const names = (mode: LayersMode) =>
      shownInputsOf(listing, mode).map((input) => input.name)
    expect(names("split")).toEqual(["source", "quality"])
    expect(names("edit")).toEqual(["change", "quality"])
    expect(names("relight")).toEqual(["light", "tone", "quality"])
    expect(names("fill")).toEqual(["content", "quality"])
  })

  it("reads the layer count's range from the contract", () => {
    expect(countRangeOf(listing, "split")).toEqual({ min: 2, max: 8 })
    expect(countRangeOf(listing, "edit")).toEqual({ min: 1, max: 1 })
  })

  it.each(modes)(
    "sends a %s run the contract accepts after every mode was filled",
    (mode) => {
      const body = layersBodyOf(listing, mode, valuesIn(mode, everyInput))
      const parsed = contract.safeParse(body)
      expect(parsed.success).toBe(true)
      expect(parsed.data?.count).toBe(mode === "split" ? 6 : 1)
    }
  )

  it("sends 4 layers in a split that comes after an edit", () => {
    const values = valuesIn("split", { source: [image], count: "1" })
    expect(layerCountOf(listing, "split", values)).toBe(4)
    expect(contract.safeParse(layersBodyOf(listing, "split", values))).toEqual(
      expect.objectContaining({ success: true })
    )
  })

  it.each(modes)(
    "control: a %s body built from every input is refused by the contract",
    (mode) => {
      const body = bodyOf(listing, valuesIn(mode, everyInput))
      expect(contract.safeParse(body).success).toBe(false)
    }
  )

  it("flags only the current mode's empty inputs, and leaves the area to the brush", () => {
    const flagged = (mode: LayersMode) =>
      problemsOf(formAppFor(listing, mode), valuesIn(mode, {})).map(
        (problem) => problem.name
      )
    expect(flagged("split")).toEqual(["source"])
    expect(flagged("edit")).toEqual(["layer", "change"])
    expect(flagged("relight")).toEqual(["layer"])
    expect(flagged("fill")).toEqual(["layer"])
  })

  it("control: the listing without the mode filter flags every mode's inputs", () => {
    const names = problemsOf(listing, valuesIn("split", {})).map(
      (problem) => problem.name
    )
    expect(names).toEqual(["source", "layer", "change", "mask"])
  })
})
