import type { EngineBinding } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import {
  comfyWorkflowAdapter,
  hostedModelOf,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  imageNode,
  pixal3dBinding,
  pixal3dModels,
  structureSamplerNode,
  threeDEngine,
} from "#three-d/comfy/three-d-engine"
import { graphModel, textModel } from "#three-d/three-d-models"
import { cloudNodes, recordedFrom } from "./cloud-nodes"

const node = z.object({
  class_type: z.string(),
  inputs: z.record(z.string(), z.unknown()),
})

const config = z.object({
  workflow: z.record(z.string(), node),
  bindings: z.array(
    z.looseObject({ from: z.string(), path: z.array(z.string()) })
  ),
  models: z.array(z.string()),
})

type Graph = z.infer<typeof config>["workflow"]

const parsed = config.parse(pixal3dBinding.config)
const graph: Graph = parsed.workflow

const loaderFiles: Readonly<Record<string, string>> = {
  UNETLoader: "unet_name",
  VAELoader: "vae_name",
  CLIPVisionLoader: "clip_name",
  LoadMoGeModel: "model_name",
  LoadBackgroundRemovalModel: "bg_removal_name",
}

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function missingInputs(workflow: Graph): string[] {
  return Object.entries(workflow).flatMap(([id, entry]) => {
    const cloud = cloudNodes[entry.class_type]
    if (cloud === undefined) {
      return [`${id} ${entry.class_type} is no Cloud class`]
    }
    return cloud.required
      .filter((name) => !Object.hasOwn(entry.inputs, name))
      .map((name) => `${id} ${entry.class_type} lacks ${name}`)
  })
}

function brokenLinks(workflow: Graph): string[] {
  return Object.entries(workflow).flatMap(([id, entry]) =>
    Object.entries(entry.inputs).flatMap(([name, value]) => {
      if (!isLink(value)) {
        return []
      }
      const source = workflow[value[0]]
      const outputs =
        source === undefined
          ? []
          : (cloudNodes[source.class_type]?.outputs ?? [])
      return value[1] < outputs.length ? [] : [`${id}.${name} -> ${value[0]}`]
    })
  )
}

function classesOf(workflow: Graph): string[] {
  return Object.values(workflow).map((entry) => entry.class_type)
}

function resolved(
  inputs: Record<string, string>,
  defaultModel = graphModel
): EngineBinding {
  return resolveBinding(threeDEngine(defaultModel), inputs)
}

describe(`the Pixal3D graph against ${recordedFrom}`, () => {
  it("uses only Cloud classes and gives each one every required input", () => {
    expect(missingInputs(graph)).toEqual([])
  })

  it("links each input to a node of the graph and an output that node has", () => {
    expect(brokenLinks(graph)).toEqual([])
  })

  it("saves one GLB and no preview, so a run lands one model", () => {
    const outputs = Object.entries(graph).filter(
      ([, entry]) => cloudNodes[entry.class_type]?.isOutput === true
    )
    expect(outputs.map(([, entry]) => entry.class_type)).toEqual(["SaveGLB"])
  })
})

describe("the Pixal3D graph at its smallest mesh", () => {
  it("decodes the structure at 32, upsamples the shape at 1024 and keeps 20,000 faces", () => {
    expect(graph).toMatchObject({
      "119": {
        class_type: "VaeDecodeStructureTrellis2",
        inputs: { resolution: "32" },
      },
      "94": {
        class_type: "Trellis2UpsampleStage",
        inputs: { target_resolution: 1024 },
      },
      "186": {
        class_type: "DecimateMesh",
        inputs: { mesh: ["92", 0], target_face_count: 20_000 },
      },
      "324": { class_type: "SaveGLB", inputs: { mesh: ["186", 0] } },
    })
  })

  it("runs the shape stages only, with no texture stage and no bake", () => {
    const classes = classesOf(graph)
    for (const skipped of [
      "Trellis2TextureStage",
      "VaeDecodeTextureTrellis",
      "BakeTextureFromVoxel",
      "UnwrapMesh",
      "RemeshMesh",
    ]) {
      expect(classes).not.toContain(skipped)
    }
  })

  it("conditions on Pixal3D with the field of view MoGe reads from your photo", () => {
    expect(graph).toMatchObject({
      "298": {
        class_type: "Pixal3DConditioning",
        inputs: { image: ["312", 0], camera_angle_x: ["242", 0] },
      },
      "312": {
        class_type: "ImageCropToMask",
        inputs: { images: ["122", 0], masks: ["192", 0], pad_factor: 1.1 },
      },
      "3": { inputs: { positive: ["298", 0], negative: ["298", 1] } },
    })
  })

  it("records every file its loaders load, once", () => {
    const loaded = Object.values(graph).flatMap((entry) => {
      const field = loaderFiles[entry.class_type]
      const file = field === undefined ? undefined : entry.inputs[field]
      return typeof file === "string" ? [file] : []
    })
    expect([...loaded].sort()).toEqual([...pixal3dModels].sort())
    expect(parsed.models).toEqual([...pixal3dModels])
  })
})

describe("the 3D engine binding", () => {
  it("binds your photo to the image loader and the seed to the structure sampler", () => {
    expect(parsed.bindings).toEqual([
      expect.objectContaining({
        from: "input",
        name: "image",
        index: 0,
        path: [imageNode, "inputs", "image"],
      }),
      { from: "seed", path: [structureSamplerNode, "inputs", "seed"] },
    ])
    for (const binding of parsed.bindings) {
      const id = binding.path[0] ?? ""
      const field = binding.path[2] ?? ""
      expect(Object.hasOwn(graph[id]?.inputs ?? {}, field)).toBe(true)
    }
    expect(graph[imageNode]?.class_type).toBe("LoadImage")
    expect(graph[structureSamplerNode]?.class_type).toBe("KSampler")
  })

  it("runs the Pixal3D graph when no model is picked and when it is picked", () => {
    const picks: Record<string, string>[] = [{}, { model: graphModel }]
    for (const inputs of picks) {
      const binding = resolved(inputs)
      expect(binding.adapter).toBe(comfyWorkflowAdapter)
      expect(binding.config).toBe(pixal3dBinding.config)
    }
  })

  it("runs Meshy 7.1 on your key through the Router when it is picked", () => {
    const binding = resolved({ model: textModel, prompt: "a wooden chair" })
    expect(hostedModelOf(binding)).toBe("meshy/meshy-7.1")
  })

  it("runs Meshy 7.1 when no model is picked and Meshy 7.1 is the default", () => {
    const binding = resolved({ prompt: "a wooden chair" }, textModel)
    expect(hostedModelOf(binding)).toBe("meshy/meshy-7.1")
  })
})
