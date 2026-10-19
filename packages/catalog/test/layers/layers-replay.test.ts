import { EngineBindingInvalidError } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { lightSentences, toneSentences } from "#layers/comfy/light-words"
import {
  asset,
  imageId,
  maskId,
  requestFor,
  submit,
  submitRefused,
  uploadedImage,
  uploadedMask,
} from "./layers-comfy"

describe("the engine request Layers sends to Comfy", () => {
  it("splits an image into 6 layers at Final and drops the composite", async () => {
    const { submission, workflow } = await submit(
      requestFor({
        inputs: { source: [imageId], quality: "final", count: "6" },
      })
    )
    expect(submission.models).toContain("qwen_image_layered_bf16.safetensors")
    expect(workflow).toMatchObject({
      "1": { inputs: { image: asset(uploadedImage) } },
      "2": { inputs: { largest_size: 1024 } },
      "13": { inputs: { layers: 6, width: ["3", 0], height: ["3", 1] } },
      "14": { inputs: { seed: 42, steps: 20, cfg: 2.5 } },
      "15": { inputs: { samples: ["14", 0], dim: "t", index: 1 } },
      "18": { inputs: { images: ["17", 0] } },
    })
  })

  it("runs the 640 bucket at Draft", async () => {
    const { workflow } = await submit(
      requestFor({ inputs: { source: [imageId], count: "2" } })
    )
    expect(workflow).toMatchObject({
      "2": { inputs: { largest_size: 640 } },
      "13": { inputs: { layers: 2 } },
    })
  })

  it("edits one layer at Draft with the 4 step LoRA and joins its alpha back", async () => {
    const { submission, workflow } = await submit(
      requestFor({
        inputs: { mode: "edit", layer: [imageId], change: "a red hat" },
        count: 1,
      })
    )
    expect(submission.models).toContain("qwen_image_edit_2511_bf16.safetensors")
    expect(workflow).toMatchObject({
      "1": { inputs: { image: asset(uploadedImage) } },
      "3": { inputs: { batch_size: 1, color: 0x808080 } },
      "6": { inputs: { strength_model: 1 } },
      "7": {
        class_type: "ImageScaleToTotalPixels",
        inputs: { image: ["5", 0], megapixels: 1, resolution_steps: 16 },
      },
      "13": { inputs: { prompt: "a red hat", image1: ["7", 0] } },
      "18": { inputs: { seed: 42, steps: 4, cfg: 1 } },
      "20": { inputs: { width: ["2", 0], height: ["2", 1] } },
      "21": { inputs: { image: ["20", 0], alpha: ["1", 1] } },
    })
  })

  it("edits at Final with the base weights only", async () => {
    const { workflow } = await submit(
      requestFor({
        inputs: {
          mode: "edit",
          layer: [imageId],
          change: "a red hat",
          quality: "final",
        },
        count: 1,
      })
    )
    expect(workflow).toMatchObject({
      "6": { inputs: { strength_model: 0 } },
      "18": { inputs: { steps: 40, cfg: 4 } },
    })
  })

  it("relights from the right with warm light through one sentence", async () => {
    const { workflow } = await submit(
      requestFor({
        inputs: {
          mode: "relight",
          layer: [imageId],
          light: "right",
          tone: "warm",
        },
        count: 1,
      })
    )
    expect(workflow).toMatchObject({
      "13": { inputs: { prompt: ["23", 0] } },
      "23": {
        class_type: "StringConcatenate",
        inputs: {
          string_a: lightSentences.right,
          string_b: toneSentences.warm,
        },
      },
      "21": { inputs: { alpha: ["1", 1] } },
    })
  })

  it("fills a painted area and pastes it back only inside the mask", async () => {
    const { submission, workflow } = await submit(
      requestFor({
        inputs: {
          mode: "fill",
          layer: [imageId],
          mask: [maskId],
          content: "a brass door handle",
        },
        count: 1,
      })
    )
    expect(submission.models).toContain(
      "qwen_image_inpaint_diffsynth_controlnet.safetensors"
    )
    expect(workflow).toMatchObject({
      "1": { inputs: { image: asset(uploadedImage) } },
      "7": { class_type: "ImageScaleToTotalPixels" },
      "30": { inputs: { image: asset(uploadedMask), channel: "red" } },
      "31": { inputs: { image: ["7", 0] } },
      "33": { inputs: { width: ["31", 0], height: ["31", 1] } },
      "47": { inputs: { width: ["2", 0], height: ["2", 1] } },
      "40": { inputs: { text: "a brass door handle" } },
      "42": {
        class_type: "QwenImageDiffsynthControlnet",
        inputs: { mask: ["34", 0] },
      },
      "45": { inputs: { model: ["42", 0], seed: 42, steps: 20 } },
      "48": {
        inputs: { destination: ["1", 0], source: ["47", 0], mask: ["30", 0] },
      },
      "49": {
        inputs: { destination: ["4", 0], source: ["30", 0], operation: "add" },
      },
      "51": { inputs: { image: ["48", 0], alpha: ["50", 0] } },
    })
  })

  it("refuses a count other than 1 for one layer, and 1 for a split", async () => {
    const edit = requestFor(
      { inputs: { mode: "edit", layer: [imageId], change: "x" }, count: 1 },
      5
    )
    await expect(submitRefused(edit)).rejects.toBeInstanceOf(
      EngineBindingInvalidError
    )
    const split = requestFor({ inputs: { source: [imageId] }, count: 4 }, 1)
    await expect(submitRefused(split)).rejects.toBeInstanceOf(
      EngineBindingInvalidError
    )
  })
})
