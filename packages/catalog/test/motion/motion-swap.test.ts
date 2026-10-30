import { type RunInputs, startRunBodyFor } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import { motionEngine } from "#motion/comfy/motion-binding"
import { swapWorkflow } from "#motion/comfy/swap-ltx-2-3-binding"
import { graphModel, swapModel } from "#motion/motion-models"
import { clipId, type Graph, graphSchema, motion } from "./motion-replay"

const reference = assetIdFormat.parse("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f")
const second = assetIdFormat.parse("4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a")

const scene =
  "A woman in a red coat dances on a rooftop at dusk, her arms wide."

const swapRun = {
  example: "own",
  model: swapModel,
  clip: [clipId],
  photo: [reference, second],
  target: "the dancer",
  scene,
  seed: 7,
}

type Bound = { from?: unknown; name?: unknown; index?: unknown; path?: unknown }

function boundOf(inputs: RunInputs) {
  const binding = resolveBinding(motionEngine, inputs)
  const bindings: Bound[] = Array.isArray(binding.config.bindings)
    ? binding.config.bindings
    : []
  return {
    graph: graphSchema.parse(binding.config.workflow),
    paths: bindings.map((one) => [one.from, one.name, one.index, one.path]),
    models: Array.isArray(binding.config.models) ? binding.config.models : [],
    results: binding.config.results,
  }
}

function linkOf(graph: Graph, id: string, name: string): string {
  const value = graph[id]?.inputs[name]
  if (!Array.isArray(value) || typeof value[0] !== "string") {
    throw new Error(`${id}.${name} holds no link`)
  }
  return value[0]
}

function classOf(graph: Graph, id: string): string | undefined {
  return graph[id]?.class_type
}

const weightFile = /\.(safetensors|sft|ckpt|pt|pth)$/

function weightsOf(graph: Graph): string[] {
  return Object.values(graph).flatMap((node) =>
    Object.values(node.inputs).flatMap((value) =>
      typeof value === "string" && weightFile.test(value) ? [value] : []
    )
  )
}

describe("Motion's LTX 2.3 swap", () => {
  it("binds your clip, your first photo as the reference, who to replace, your scene as the prompt and the seed to the nodes that read them", () => {
    const { paths, graph, results } = boundOf(swapRun)
    expect(paths).toEqual([
      ["input", "clip", 0, ["1", "inputs", "file"]],
      ["input", "photo", 0, ["2", "inputs", "image"]],
      ["input", "target", undefined, ["3", "inputs", "text"]],
      ["input", "scene", undefined, ["4", "inputs", "text"]],
      ["seed", undefined, undefined, ["5", "inputs", "noise_seed"]],
    ])
    expect(results).toEqual(["121"])
    expect(classOf(graph, "1")).toBe("LoadVideo")
    expect(classOf(graph, "2")).toBe("LoadImage")
    expect(classOf(graph, linkOf(graph, "3", "clip"))).toBe(
      "CheckpointLoaderSimple"
    )
    expect(linkOf(graph, "30", "conditioning")).toBe("3")
    expect(graph["30"]?.inputs.max_objects).toBe(1)
    expect(linkOf(graph, "71", "positive")).toBe("4")
    expect(classOf(graph, "5")).toBe("RandomNoise")
    expect(linkOf(graph, "79", "noise")).toBe("5")
    expect(linkOf(graph, "88", "noise")).toBe("5")
  })

  it("puts your reference in the guide of both passes and saves the video with your clip's sound", () => {
    const { graph } = boundOf(swapRun)
    const reference = linkOf(graph, "42", "source")
    expect(reference).toBe("2")
    for (const composer of ["43", "44"]) {
      expect(classOf(graph, composer)).toBe("ReservedRegionFrameComposer")
      expect(linkOf(graph, composer, "face_images")).toBe("42")
      expect(graph[composer]?.inputs.chroma_g).toBe(255)
    }
    expect(linkOf(graph, "73", "num_guides.image_1")).toBe("45")
    expect(linkOf(graph, "45", "image")).toBe("43")
    expect(linkOf(graph, "83", "num_guides.image_1")).toBe("44")
    expect(graph["35"]?.inputs.color).toBe(16711935)
    expect(linkOf(graph, "120", "audio")).toBe("11")
    expect(classOf(graph, linkOf(graph, "11", "video"))).toBe("Video Slice")
    expect(linkOf(graph, "121", "video")).toBe("120")
  })

  it("reads the clip at 24 frames a second and keeps the whole render, which LTX returns as the clip without the panel", () => {
    const { graph } = boundOf(swapRun)
    expect(graph["13"]?.inputs.expression).toBe("min(24, a)")
    expect(classOf(graph, "15")).toBe("VideoFrameSample")
    expect(graph["15"]?.inputs.strategy).toBe("uniform")
    expect(linkOf(graph, "15", "num_frames")).toBe("14")
    for (const [node, input] of [
      ["71", "frame_rate"],
      ["74", "frame_rate"],
      ["120", "fps"],
    ] as const) {
      expect(linkOf(graph, node, input)).toBe("13")
    }
    expect(classOf(graph, linkOf(graph, "99", "image"))).toBe("VAEDecodeTiled")
    expect(
      Object.values(graph).some((node) => node.class_type === "ImageCrop")
    ).toBe(false)
    expect(linkOf(graph, "98", "input")).toBe("99")
    expect(linkOf(graph, "99", "length")).toBe("14")
  })

  it("loads the LoRA on the LTX 2.3 transformer, and records every weight file the graph loads as a model of the run", () => {
    const { graph, models } = boundOf(swapRun)
    expect(graph["101"]?.inputs.lora_name).toBe(
      "ltx23_inpaint_masked_r2v_rank32_v1_3000steps.safetensors"
    )
    expect(linkOf(graph, "101", "model")).toBe("100")
    const loaded = weightsOf(graph)
    expect([...loaded].sort()).toEqual([...models].sort())
    expect(findWorkflow(swapWorkflow)?.models).toEqual(models)
  })

  it("runs alone in one run on your own video, with none of the guided render's chain inputs", () => {
    const body = startRunBodyFor(motion)
    const parsed = body.safeParse({ inputs: swapRun, count: 1 })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.inputs).not.toHaveProperty("firstFrame")
    expect(parsed.data?.inputs).not.toHaveProperty("guide")
    expect(parsed.data?.inputs).not.toHaveProperty("plannedScene")
    expect(body.safeParse({ inputs: { ...swapRun, photo: [] } }).success).toBe(
      false
    )
    expect(
      body.safeParse({ inputs: { ...swapRun, model: graphModel } }).success
    ).toBe(false)
  })
})
