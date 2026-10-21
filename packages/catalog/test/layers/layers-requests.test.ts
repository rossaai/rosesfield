import { resolveBinding } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import {
  definition,
  imageId,
  maskId,
  type Node,
  requestFor,
  submit,
} from "./layers-comfy"

type Mode = "split" | "edit" | "relight" | "fill"
type Quality = "draft" | "final"

const everyRequest: ReadonlyArray<{ mode: Mode; quality: Quality }> = (
  ["split", "edit", "relight", "fill"] as const
).flatMap((mode) =>
  (["draft", "final"] as const).map((quality) => ({ mode, quality }))
)

function bodyOf(mode: Mode, quality: Quality): unknown {
  switch (mode) {
    case "split":
      return { inputs: { source: [imageId], count: "4", quality } }
    case "edit":
      return {
        inputs: { mode, layer: [imageId], change: "a red hat", quality },
      }
    case "relight":
      return { inputs: { mode, layer: [imageId], light: "top", quality } }
    case "fill":
      return { inputs: { mode, layer: [imageId], mask: [maskId], quality } }
  }
}

const fillModels = [
  "qwen_image_fp8_e4m3fn.safetensors",
  "qwen_image_inpaint_diffsynth_controlnet.safetensors",
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_vae.safetensors",
]

const editModels = [
  "qwen_image_edit_2511_bf16.safetensors",
  "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_vae.safetensors",
]

const relightModels = [
  "qwen_image_edit_2509_fp8_e4m3fn.safetensors",
  "Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors",
  "Qwen-Image-Edit-2509-Relight.safetensors",
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_vae.safetensors",
]

const splitModels = [
  "qwen_image_layered_bf16.safetensors",
  "qwen_image_layered_vae.safetensors",
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
]

type ModelsByQuality = Readonly<Record<Quality, readonly string[]>>

const modelsOf: Readonly<Record<Mode, ModelsByQuality>> = {
  split: { draft: splitModels, final: splitModels },
  edit: { draft: editModels, final: editModels },
  relight: {
    draft: relightModels,
    final: relightModels.filter((name) => !name.includes("Lightning")),
  },
  fill: { draft: fillModels, final: fillModels },
}

const expectedValues: Readonly<
  Record<Mode, Record<Quality, Record<string, Record<string, unknown>>>>
> = {
  split: {
    draft: { "2": { largest_size: 640 }, "13": { layers: 4 } },
    final: { "2": { largest_size: 1024 }, "13": { layers: 4 } },
  },
  edit: {
    draft: { "6": { strength_model: 1 }, "18": { steps: 4, cfg: 1 } },
    final: { "6": { strength_model: 0 }, "18": { steps: 40, cfg: 4 } },
  },
  relight: {
    draft: { "6": { strength_model: 1 }, "14": { steps: 4, cfg: 1 } },
    final: { "14": { steps: 40, cfg: 4 } },
  },
  fill: {
    draft: { "45": { steps: 20, cfg: 2.5 } },
    final: { "45": { steps: 50, cfg: 4 } },
  },
}

function mismatchesOf(
  workflow: Record<string, Node>,
  mode: Mode,
  quality: Quality
): string[] {
  const found: string[] = []
  for (const [id, values] of Object.entries(expectedValues[mode][quality])) {
    for (const [name, value] of Object.entries(values)) {
      const sent = workflow[id]?.inputs[name]
      if (sent !== value) {
        found.push(
          `node ${id} ${name} is ${String(sent)}, not ${String(value)}`
        )
      }
    }
  }
  const seed = Object.values(workflow).find((node) => "seed" in node.inputs)
  if (seed?.inputs.seed !== 42) {
    found.push("no sampler holds the seed 42")
  }
  return found
}

describe("every engine request Layers sends to Comfy", () => {
  it.each(everyRequest)(
    "sends $mode at $quality with its workflow and its sampler values",
    async ({ mode, quality }) => {
      const { submission, workflow } = await submit(
        requestFor(bodyOf(mode, quality))
      )
      expect(submission.models).toEqual(modelsOf[mode][quality])
      expect(mismatchesOf(workflow, mode, quality)).toEqual([])
    }
  )

  it("sends each mode and quality its own workflow", async () => {
    const hashes = await Promise.all(
      everyRequest.map(
        async ({ mode, quality }) =>
          (await submit(requestFor(bodyOf(mode, quality)))).submission
      )
    )
    expect(new Set(hashes.map((hash) => hash.workflowHash)).size).toBe(8)
  })

  it.each(["split", "edit", "relight", "fill"] as const)(
    "control: a %s request at Final sent with the Draft binding fails the value check",
    async (mode) => {
      const final = requestFor(bodyOf(mode, "final"))
      const draftBinding = resolveBinding(definition.engine, {
        ...final.inputs,
        quality: "draft",
      })
      const { workflow } = await submit({ ...final, binding: draftBinding })
      expect(mismatchesOf(workflow, mode, "final")).not.toEqual([])
    }
  )
})
