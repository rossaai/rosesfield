import { describe, expect, it } from "vitest"
import { defaultsOf, type FormValues } from "@/screens/app/app-form"
import {
  checkOf,
  defaultOfMode,
  hostedLayersBody,
  inputsForModel,
  isCountShown,
  layersValuesOf,
  modeGraphsOf,
  modelIndexOf,
  modelsOfMode,
  runModeOf,
} from "@/studio/layers/layers-models"
import type { LayersMode } from "@/studio/layers/layers-modes"
import {
  catalog,
  catalogIndex,
  editGraph,
  fillGraph,
  firstLayer,
  flux3,
  fluxFill,
  layersListing,
  layersRun,
  maskAsset,
  photo,
  relightGraph,
  seedream,
  splitGraph,
} from "./layers-fixtures"

function valuesWith(inputs: FormValues["inputs"]): FormValues {
  const base = defaultsOf(layersListing)
  return { ...base, inputs: { ...base.inputs, ...inputs } }
}

describe("the model picker of each Layers mode", () => {
  it("reads each mode's graph from the catalog's bounds on the model input", () => {
    expect(modeGraphsOf(layersListing)).toEqual({
      split: splitGraph.id,
      edit: editGraph.id,
      relight: relightGraph.id,
      fill: fillGraph.id,
    })
  })

  it("lists each graph under the mode that names it and each hosted model under its task", () => {
    const listed = (mode: LayersMode) =>
      modelsOfMode(catalogIndex, mode).map((model) => model.id)
    expect(listed("split")).toEqual([splitGraph.id, seedream.id])
    expect(listed("edit")).toEqual([editGraph.id, flux3.id])
    expect(listed("relight")).toEqual([relightGraph.id])
    expect(listed("fill")).toEqual([fillGraph.id, fluxFill.id])
  })

  it("control: a graph of the edit task that no mode names lists nowhere", () => {
    const stray = { ...fillGraph, id: "maker/other-graph" }
    const index = modelIndexOf(layersListing, [...catalog, stray])
    expect(index.modes.has(stray.id)).toBe(false)
    expect(modelsOfMode(index, "edit").map((model) => model.id)).toEqual([
      editGraph.id,
      flux3.id,
    ])
  })

  it("opens each mode on its open-weights graph, with the hosted model one choice away", () => {
    const open = (models: typeof catalog, mode: LayersMode) =>
      defaultOfMode(modelIndexOf(layersListing, models), mode)?.id ?? null
    expect(open(catalog, "split")).toBe(splitGraph.id)
    expect(open(catalog, "edit")).toBe(editGraph.id)
    expect(open(catalog, "relight")).toBe(relightGraph.id)
    expect(open(catalog, "fill")).toBe(fillGraph.id)
    expect(open([fluxFill, ...catalog], "fill")).toBe(fillGraph.id)
    expect(open([seedream], "split")).toBe(seedream.id)
    expect(open([], "split")).toBeNull()
  })
})

describe("a split model whose schema takes no layer count", () => {
  it("hides the count field and keeps it for the graph", () => {
    expect(isCountShown("split", splitGraph)).toBe(true)
    expect(isCountShown("split", null)).toBe(true)
    expect(isCountShown("split", seedream)).toBe(false)
    expect(isCountShown("edit", editGraph)).toBe(false)
  })

  it("keeps your image when you pick it", () => {
    const kept = valuesWith({ source: [photo], count: "6" }).inputs
    const inputs = inputsForModel(kept, seedream)
    expect(inputs.source).toEqual([photo])
    expect(inputs.model).toBe(seedream.id)
    expect(inputs.size).toBe("1K")
    expect(inputs.image).toBeUndefined()
  })
})

describe("the body of a hosted Layers run", () => {
  it("sends your image to the split model's image field and nothing it does not take", () => {
    const values = valuesWith({
      ...inputsForModel(valuesWith({ source: [photo] }).inputs, seedream),
    })
    const body = hostedLayersBody(seedream, values, "split", [])
    expect(body.inputs).toEqual({
      model: seedream.id,
      image: [photo],
      size: "1K",
    })
  })

  it("sends the picked layer and the painted mask to a fill model", () => {
    const values = valuesWith({
      ...inputsForModel(valuesWith({ mode: "fill" }).inputs, fluxFill),
      layer: [firstLayer],
      prompt: "a brass handle",
    })
    const body = hostedLayersBody(fluxFill, values, "fill", [maskAsset])
    expect(body.inputs).toEqual({
      model: fluxFill.id,
      prompt: "a brass handle",
      image: [firstLayer],
      mask: [maskAsset],
    })
  })

  it("asks for your image before a hosted split run", () => {
    const check = checkOf(seedream, "split")
    expect(check).not.toBeNull()
    const missing = check?.(valuesWith({ model: seedream.id })) ?? []
    expect(missing.map((one) => one.name)).toEqual(["source"])
    expect(checkOf(splitGraph, "split")).toBeNull()
  })
})

describe("a hosted run in History", () => {
  const hostedSplit = layersRun({
    id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
    minute: 0,
    inputs: { model: seedream.id, image: [photo], size: "2K" },
    outputs: [firstLayer],
  })
  const hostedEdit = layersRun({
    id: "8e2f3041-5b6c-4d7e-9f80-a12b3c4d5e6f",
    minute: 1,
    inputs: { model: flux3.id, inputImage: [firstLayer], prompt: "a hat" },
    outputs: [photo],
  })

  it("reads its mode from its model", () => {
    expect(runModeOf(hostedSplit, catalogIndex)).toBe("split")
    expect(runModeOf(hostedEdit, catalogIndex)).toBe("edit")
    expect(
      runModeOf(
        layersRun({
          id: "9f304152-6c7d-4e8f-a091-b23c4d5e6f70",
          minute: 2,
          inputs: { mode: "relight", layer: [firstLayer] },
          outputs: [photo],
        }),
        catalogIndex
      )
    ).toBe("relight")
  })

  it("fills the form with its image, its model and its settings", () => {
    const values = layersValuesOf(layersListing, hostedSplit, catalogIndex)
    expect(values.inputs.mode).toBe("split")
    expect(values.inputs.model).toBe(seedream.id)
    expect(values.inputs.source).toEqual([photo])
    expect(values.inputs.size).toBe("2K")
  })
})
