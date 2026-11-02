import type { RunInputs } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { motionEngine } from "#motion/comfy/motion-binding"
import { ltx25GuideModel } from "#motion/motion-models"
import { type Graph, graphSchema } from "./motion-replay"

const photo = assetIdFormat.parse("2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d")
const guide = assetIdFormat.parse("3b4c5d6e-7f8a-4b9c-8d1e-2f3a4b5c6d7e")
const mask = assetIdFormat.parse("4c5d6e7f-8a9b-4c0d-9e2f-3a4b5c6d7e8f")
const endKey = assetIdFormat.parse("5d6e7f8a-9b0c-4d1e-af3a-4b5c6d7e8f9a")

const temporalUpscaler =
  "ltx-2.5-latent-temporal-upscaler-x2-bf16-1.0.safetensors"

function graphOf(inputs: RunInputs): Graph {
  const binding = resolveBinding(motionEngine, {
    model: ltx25GuideModel,
    photo: [photo],
    ...inputs,
  })
  return graphSchema.parse(binding.config.workflow)
}

function ownGraph(extra: RunInputs = {}): Graph {
  return graphOf({ clip: [guide], resolution: "480p", ...extra })
}

function inputOf(graph: Graph, id: string, name: string): unknown {
  return graph[id]?.inputs[name]
}

function linked(graph: Graph, id: string, name: string): string {
  const value = inputOf(graph, id, name)
  if (!Array.isArray(value) || typeof value[0] !== "string") {
    throw new Error(`${id}.${name} holds no link`)
  }
  return value[0]
}

/** How many times longer stage 2's latent is than stage 1's: each temporal upsampler between the spatial one, node 993, and the photo lock, node 994, doubles its frames. */
function framesTimesOf(graph: Graph): number {
  let times = 1
  let at = linked(graph, "994", "latent")
  for (let step = 0; at !== "993" && step < 8; step++) {
    expect(graph[at]?.class_type).toBe("LTXVLatentUpsampler")
    expect(inputOf(graph, at, "upscale_model")).toEqual(["1080", 0])
    times *= 2
    at = linked(graph, at, "samples")
  }
  expect(at).toBe("993")
  return times
}

/** How many times the guide's frame rate stage 2 is conditioned at, read through the end key's guide when the run has one. */
function stageTwoRateOf(graph: Graph): number {
  let at = linked(graph, "998", "positive")
  if (graph[at]?.class_type === "LTXVAddGuide") {
    at = linked(graph, at, "positive")
  }
  expect(graph[at]?.class_type).toBe("LTXVConditioning")
  const rate = linked(graph, at, "frame_rate")
  expect(inputOf(graph, rate, "values.a")).toEqual(["706", 2])
  const expression = String(inputOf(graph, rate, "expression"))
  const found = /^a \* (\d+)$/.exec(expression)
  if (found === null) {
    throw new Error(`no frame rate multiple in ${expression}`)
  }
  return Number(found[1])
}

/** Every how many decoded frames the video keeps one. */
function keptEveryOf(graph: Graph): number {
  const kept = linked(graph, "724", "image")
  expect(graph[kept]?.class_type).toBe("VHS_SelectEveryNthImage")
  expect(inputOf(graph, kept, "images")).toEqual(["105", 0])
  expect(inputOf(graph, kept, "skip_first_images")).toBe(0)
  return Number(inputOf(graph, kept, "select_every_nth"))
}

describe("the temporal pass of the LTX 2.5 depth guide graph", () => {
  it("refines stage 2 on a latent 4 times longer, at 4 times the guide's frame rate, and keeps every fourth frame, in every variant and in the Library example, so a fast face is not drawn at the clip's own rate", () => {
    const graphs = [
      ownGraph(),
      ownGraph({ mask: [mask] }),
      ownGraph({ endKey: [endKey] }),
      ownGraph({ mask: [mask], endKey: [endKey] }),
      graphOf({ example: "grab-and-run", resolution: "480p" }),
      graphOf({
        example: "grab-and-run",
        resolution: "720p",
        endKey: [endKey],
      }),
    ]
    for (const graph of graphs) {
      expect(inputOf(graph, "1080", "model_name")).toBe(temporalUpscaler)
      expect(framesTimesOf(graph)).toBe(4)
      expect(stageTwoRateOf(graph)).toBe(4)
      expect(keptEveryOf(graph)).toBe(4)
      expect(inputOf(graph, "109", "frame_rate")).toEqual(["706", 2])
    }
  })

  it("finds a stage 2 on the latent stage 1 left, a pass that keeps every second frame of a latent 4 times longer, and a stage 2 at twice the frame rate, the control", () => {
    const plain = ownGraph()
    const lock = plain["994"]
    if (lock === undefined) {
      throw new Error("the graph has no node 994")
    }
    lock.inputs.latent = ["993", 0]
    expect(framesTimesOf(plain)).toBe(1)
    const halved = ownGraph()
    const kept = halved["1084"]
    if (kept === undefined) {
      throw new Error("the graph has no node 1084")
    }
    kept.inputs.select_every_nth = 2
    expect(keptEveryOf(halved)).not.toBe(framesTimesOf(halved))
    const slowed = ownGraph()
    const rate = slowed["1086"]
    if (rate === undefined) {
      throw new Error("the graph has no node 1086")
    }
    rate.inputs.expression = "a * 2"
    expect(stageTwoRateOf(slowed)).toBe(2)
  })
})
