import { describe, expect, it } from "vitest"
import {
  factorOfScale,
  factorOfValue,
  fileOf,
  inputsForModel,
  modelForTab,
  modelsOfTab,
  modeOfModel,
  restFieldsOf,
  scaleOf,
  tabsOfModel,
  wellNameOf,
} from "@/studio/upscale/upscale-models"
import {
  bria,
  catalog,
  flashVsr,
  fluxVideo,
  graph,
  upscaleListing,
  waveSpeed,
} from "./upscale-fixtures"

const ids = (models: readonly { id: string }[]) => models.map((one) => one.id)

describe("the models of each Upscale tab", () => {
  it("lists a graph on both tabs and a hosted model on the tab of the file it takes", () => {
    expect(tabsOfModel(graph)).toEqual(["image", "video"])
    expect(tabsOfModel(waveSpeed)).toEqual(["image"])
    expect(tabsOfModel(fluxVideo)).toEqual(["video"])
  })

  it("lists the image models on Image and the video models on Video", () => {
    expect(ids(modelsOfTab(catalog, "image"))).toEqual([
      graph.id,
      bria.id,
      waveSpeed.id,
    ])
    expect(ids(modelsOfTab(catalog, "video"))).toEqual([
      graph.id,
      fluxVideo.id,
      flashVsr.id,
    ])
  })

  it("keeps the chosen model on a tab that has it, then the default, then the first", () => {
    const video = modelsOfTab(catalog, "video")
    expect(modelForTab(video, [fluxVideo.id, graph.id])?.id).toBe(fluxVideo.id)
    expect(modelForTab(video, [waveSpeed.id, graph.id])?.id).toBe(graph.id)
    expect(modelForTab(video, [waveSpeed.id, null])?.id).toBe(graph.id)
    expect(modelForTab([], [graph.id])).toBeNull()
  })

  it("moves to the tab a hosted model serves", () => {
    expect(modeOfModel(fluxVideo, "image")).toBe("video")
    expect(modeOfModel(graph, "video")).toBe("video")
    expect(modeOfModel(null, "image")).toBe("image")
  })
})

describe("the scales a model declares", () => {
  it("reads 2x and 4x and the 3840 pixel cap from the graph", () => {
    expect(scaleOf(graph, upscaleListing())).toEqual({
      name: "scale",
      options: [
        { value: "2x", factor: 2 },
        { value: "4x", factor: 4 },
      ],
      initial: "2x",
      maxLongSide: 3840,
    })
  })

  it("reads the target resolutions of WaveSpeed SeedVR2, with no factor and no cap", () => {
    expect(scaleOf(waveSpeed, upscaleListing())).toEqual({
      name: "targetResolution",
      options: [
        { value: "2k", factor: null },
        { value: "4k", factor: null },
        { value: "8k", factor: null },
      ],
      initial: "4k",
      maxLongSide: null,
    })
  })

  it("offers 2x and the top of a factor range, and 2x and 4x when a factor has no range", () => {
    expect(scaleOf(fluxVideo, upscaleListing())?.options).toEqual([
      { value: 2, factor: 2 },
      { value: 3, factor: 3 },
    ])
    expect(scaleOf(bria, upscaleListing())?.options).toEqual([
      { value: 2, factor: 2 },
      { value: 4, factor: 4 },
    ])
  })

  it("never offers the top of a range past 4x, so one press cannot ask for a factor of 200", () => {
    const wide = {
      ...fluxVideo,
      id: "fal/crystal-upscaler",
      form: (fluxVideo.form ?? []).map((field) =>
        field.kind === "number" ? { ...field, min: 1, max: 200 } : field
      ),
    }
    expect(scaleOf(wide, upscaleListing())?.options).toEqual([
      { value: 2, factor: 2 },
      { value: 4, factor: 4 },
    ])
  })

  it("has no scale for a model that declares none", () => {
    expect(scaleOf(flashVsr, upscaleListing())).toBeNull()
  })

  it("reads the factor of a scale value", () => {
    expect(factorOfValue("2x")).toBe(2)
    expect(factorOfValue("x4")).toBe(4)
    expect(factorOfValue(3)).toBe(3)
    expect(factorOfValue("4k")).toBeNull()
    const spec = scaleOf(graph, upscaleListing())
    expect(factorOfScale(spec, "4x")).toBe(4)
    expect(factorOfScale(spec, "16x")).toBe(2)
  })
})

describe("the inputs on a change of model", () => {
  const file = ["photo-1"]

  it("puts your file in the file input of a hosted model and keeps the tab", () => {
    const inputs = inputsForModel(
      upscaleListing(),
      waveSpeed,
      { mode: "image", image: file, scale: "4x", model: graph.id },
      "image",
      file
    )
    expect(inputs).toEqual({
      image: file,
      video: [],
      inputImage: file,
      targetResolution: "4k",
      outputFormat: "jpeg",
      mode: "image",
      model: waveSpeed.id,
    })
    expect(wellNameOf(waveSpeed, "image")).toBe("inputImage")
    expect(fileOf(inputs, waveSpeed, "image")).toEqual(file)
  })

  it("keeps your files, the scale and the seed on the graph", () => {
    const inputs = inputsForModel(
      upscaleListing(),
      graph,
      {
        mode: "image",
        inputImage: file,
        video: ["clip-1"],
        scale: "4x",
        seed: 7,
        model: waveSpeed.id,
      },
      "image",
      file
    )
    expect(inputs).toMatchObject({
      mode: "image",
      image: file,
      video: ["clip-1"],
      scale: "4x",
      seed: 7,
      model: graph.id,
    })
  })

  it("leaves the file and the scale out of the other fields of a hosted model", () => {
    expect(restFieldsOf(waveSpeed).map((field) => field.name)).toEqual([
      "outputFormat",
    ])
    expect(restFieldsOf(flashVsr).map((field) => field.name)).toEqual([
      "duration",
    ])
    expect(restFieldsOf(graph)).toEqual([])
  })
})
