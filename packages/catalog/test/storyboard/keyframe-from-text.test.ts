import type { EngineBinding } from "@rosesfield/contract"
import {
  type ComfyValueBinding,
  comfyWorkflow,
  selectBinding,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  type TextWires,
  textNodeOffset,
  textPassOf,
} from "#storyboard/comfy/keyframe-from-text"
import { WorkflowInvalidError } from "#workflow-invalid.error"

const wires: TextWires = {
  prompt: ["101", 0],
  seed: ["6", 0],
  latent: ["11", 0],
}

function graph(latentClass = "EmptySD3LatentImage"): Record<string, unknown> {
  return {
    "1": {
      class_type: "UNETLoader",
      inputs: { unet_name: "text.safetensors" },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: "", clip: ["4", 0] },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0],
        positive: ["2", 0],
        latent_image: ["5", 0],
        seed: 0,
      },
    },
    "4": {
      class_type: "CLIPLoader",
      inputs: { clip_name: "clip.safetensors" },
    },
    "5": {
      class_type: latentClass,
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    "6": { class_type: "VAEDecode", inputs: { samples: ["3", 0] } },
    "9": { class_type: "SaveImage", inputs: { images: ["6", 0] } },
  }
}

const textBindings: ComfyValueBinding[] = [
  { from: "input", name: "prompt", path: ["2", "inputs", "text"] },
  { from: "seed", path: ["3", "inputs", "seed"] },
  { from: "count", path: ["5", "inputs", "batch_size"] },
  { from: "aspectRatio", path: ["5", "inputs", "width"], map: { "1:1": 1 } },
]

function textBinding(
  options: { latentClass?: string; extra?: ComfyValueBinding[] } = {}
): EngineBinding {
  return comfyWorkflow({
    workflow: graph(options.latentClass),
    bindings: [...textBindings, ...(options.extra ?? [])],
    models: ["text.safetensors", "clip.safetensors"],
  })
}

function renumbered(id: number): string {
  return String(textNodeOffset + id)
}

describe("textPassOf", () => {
  it("renumbers the text graph and wires its prompt, seed and latent to Storyboard's nodes", () => {
    const pass = textPassOf({
      binding: textBinding(),
      wires,
      folder: "storyboard-qwen-image-edit-2511",
    })
    expect(Object.keys(pass.nodes).sort()).toEqual(
      [1, 2, 3, 4, 6].map(renumbered).sort()
    )
    expect(pass.nodes[renumbered(2)]?.inputs).toEqual({
      text: ["101", 0],
      clip: [renumbered(4), 0],
    })
    expect(pass.nodes[renumbered(3)]?.inputs).toEqual({
      model: [renumbered(1), 0],
      positive: [renumbered(2), 0],
      latent_image: ["11", 0],
      seed: ["6", 0],
    })
    expect(pass.keyframe).toEqual([renumbered(6), 0])
    expect(pass.models).toEqual(["text.safetensors", "clip.safetensors"])
  })

  it("refuses a text graph that binds an input Storyboard does not fill", () => {
    const binding = textBinding({
      extra: [
        { from: "input", name: "negative", path: ["2", "inputs", "clip"] },
      ],
    })
    expect(() =>
      textPassOf({ binding, wires, folder: "storyboard-qwen-image-edit-2511" })
    ).toThrow(WorkflowInvalidError)
  })

  it("refuses a text graph whose latent is not the one Storyboard's edits share", () => {
    const binding = textBinding({ latentClass: "EmptyLatentImage" })
    expect(() =>
      textPassOf({ binding, wires, folder: "storyboard-qwen-image-edit-2511" })
    ).toThrow(/EmptySD3LatentImage/)
  })

  it("refuses a text graph that is no single workflow", () => {
    const binding = selectBinding({
      input: "references",
      by: "count",
      options: { "1": textBinding() },
    })
    expect(() =>
      textPassOf({ binding, wires, folder: "storyboard-qwen-image-edit-2511" })
    ).toThrow(/no single workflow/)
  })
})
