import { describe, expect, it } from "vitest"
import {
  cloudWeights,
  cloudWeightsFile,
  heldFilesOf,
  isHeldOnCloud,
} from "#comfy/cloud-weights"

const sample = cloudWeightsFile.parse({
  source: "GET /api/object_info on Comfy Cloud",
  readOn: "2026-10-21",
  recipe: "the options of each loader's weight input",
  loaders: {
    UNETLoader: { input: "unet_name", files: ["a.safetensors"] },
    VAELoader: { input: "vae_name", files: ["b.safetensors"] },
  },
})

describe("the weights Comfy Cloud holds", () => {
  it("reads the files of every loader object_info listed, with the day it was read", () => {
    expect(cloudWeights.source).toBe("GET /api/object_info on Comfy Cloud")
    expect(cloudWeights.readOn).toBe("2026-10-21")
    expect([...heldFilesOf(sample)].sort()).toEqual([
      "a.safetensors",
      "b.safetensors",
    ])
    expect(heldFilesOf().has("z_image_turbo_bf16.safetensors")).toBe(true)
    expect(
      heldFilesOf().has("ming_image_0.1_design_int8_convrot.safetensors")
    ).toBe(false)
  })

  it("holds a graph only when every file it loads is held", () => {
    const held = heldFilesOf(sample)
    expect(isHeldOnCloud(["a.safetensors", "b.safetensors"], held)).toBe(true)
    expect(isHeldOnCloud(["a.safetensors", "c.safetensors"], held)).toBe(false)
    expect(isHeldOnCloud(["c.safetensors"], held)).toBe(false)
  })

  it("refuses a reading with no day or a loader with no weight input, the control", () => {
    const loaders = { UNETLoader: { input: "unet_name", files: [] } }
    expect(
      cloudWeightsFile.safeParse({ source: "a", recipe: "b", loaders }).success
    ).toBe(false)
    expect(
      cloudWeightsFile.safeParse({
        source: "a",
        readOn: "2026-10-21",
        recipe: "b",
        loaders: { UNETLoader: { files: [] } },
      }).success
    ).toBe(false)
  })
})
