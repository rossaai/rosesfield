import type { RunInputs } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { heldFilesOf, isHeldOnCloud } from "#comfy/cloud-weights"
import { findWorkflow } from "#list-workflows"
import { motionAspectRatios } from "#motion/app"
import {
  ltx25GuideWorkflow,
  ltx25ShortSides,
} from "#motion/comfy/guide-ltx-2-5-binding"
import { motionEngine } from "#motion/comfy/motion-binding"
import { ltx25GuideModel } from "#motion/motion-models"
import { type Graph, graphSchema } from "./motion-replay"

const photo = assetIdFormat.parse("2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d")
const guide = assetIdFormat.parse("3b4c5d6e-7f8a-4b9c-8d1e-2f3a4b5c6d7e")
const mask = assetIdFormat.parse("4c5d6e7f-8a9b-4c0d-9e2f-3a4b5c6d7e8f")
const endKey = assetIdFormat.parse("5d6e7f8a-9b0c-4d1e-af3a-4b5c6d7e8f9a")

const effectsWorkflow = "effects-ltx-2-5"

const loudnessNodes = ["359", "360", "361"]

const controlWords =
  /\b(depth|guide|control|pose|mask|attention|ic-?lora|motion|camera)\b/i

function fileOf(id: string): Graph {
  const workflow = findWorkflow(id)
  if (workflow === null) {
    throw new Error(`workflows/${id} is not listed`)
  }
  return graphSchema.parse(structuredClone(workflow.graph))
}

function valueOf(
  expression: string,
  values: Readonly<Record<string, number>>
): number {
  const names = Object.keys(values)
  const evaluate = new Function(
    ...names,
    "max",
    "min",
    "round",
    `return ${expression}`
  )
  return Number(
    evaluate(...names.map((name) => values[name]), Math.max, Math.min, Math.round)
  )
}

function boundGraph(extra: RunInputs = {}): Graph {
  const binding = resolveBinding(motionEngine, {
    model: ltx25GuideModel,
    photo: [photo],
    clip: [guide],
    scene: "A man runs down a cobbled street.",
    resolution: "480p",
    ...extra,
  })
  return graphSchema.parse(binding.config.workflow)
}

function pathsOf(extra: RunInputs = {}): Record<string, unknown> {
  const binding = resolveBinding(motionEngine, {
    model: ltx25GuideModel,
    photo: [photo],
    clip: [guide],
    resolution: "480p",
    ...extra,
  })
  const bindings = Array.isArray(binding.config.bindings)
    ? binding.config.bindings
    : []
  return Object.fromEntries(
    bindings.flatMap(
      (one: { from?: unknown; name?: unknown; path?: unknown }) =>
        one.from === "input" && Array.isArray(one.path) && one.path.length === 3
          ? [[String(one.name), one.path]]
          : []
    )
  )
}

function shortSideMap(name: string): Record<string, unknown> {
  const binding = resolveBinding(motionEngine, {
    model: ltx25GuideModel,
    photo: [photo],
    clip: [guide],
    resolution: "480p",
  })
  const bindings = Array.isArray(binding.config.bindings)
    ? binding.config.bindings
    : []
  const found = bindings.find(
    (one: { name?: unknown; path?: unknown }) =>
      one.name === name && Array.isArray(one.path) && one.path[0] === "702"
  )
  return found?.map ?? {}
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

function solidOf(graph: Graph, id: string): number {
  expect(graph[id]?.class_type).toBe("SolidMask")
  return Number(inputOf(graph, id, "value"))
}

function compose(graph: Graph, id: string, destination: number): number {
  const node = graph[id]
  expect(node?.class_type).toBe("MaskComposite")
  const source = solidOf(graph, linked(graph, id, "source"))
  const operation = inputOf(graph, id, "operation")
  const value =
    operation === "multiply"
      ? destination * source
      : operation === "add"
        ? destination + source
        : Number.NaN
  return Math.min(Math.max(value, 0), 1)
}

function attentionOn(graph: Graph, people: number): number {
  const final = linked(graph, "115", "attention_mask")
  const scaled = linked(graph, final, "destination")
  const inverted = linked(graph, scaled, "destination")
  expect(graph[inverted]?.class_type).toBe("InvertMask")
  return compose(graph, final, compose(graph, scaled, 1 - people))
}

function sideOf(expression: unknown, side: number, short: number, c: number) {
  const found = /^round\(([ab]) \* c \/ min\(a, b\) \/ (\d+)\) \* (\d+)$/.exec(
    String(expression)
  )
  if (found === null) {
    throw new Error(`no side expression in ${String(expression)}`)
  }
  return Math.round((side * c) / short / Number(found[2])) * Number(found[3])
}

describe("the LTX 2.5 depth guide graph", () => {
  it("is Motion's model ltx-2-5-guide, and every file it loads is held on Comfy Cloud", () => {
    const binding = resolveBinding(motionEngine, {
      model: ltx25GuideModel,
      photo: [photo],
      clip: [guide],
      resolution: "480p",
    })
    const models = findWorkflow(ltx25GuideWorkflow)?.models ?? []
    expect(binding.config.models).toEqual(models)
    expect(models).toContain(
      "ltx-2.5-22b-distilled-transformer-bf16.safetensors"
    )
    expect(models).toContain(
      "ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors"
    )
    expect(isHeldOnCloud(models, heldFilesOf())).toBe(true)
    const graph = fileOf(ltx25GuideWorkflow)
    const loaded = Object.values(graph).flatMap((node) =>
      Object.values(node.inputs).filter(
        (value): value is string =>
          typeof value === "string" && value.endsWith(".safetensors")
      )
    )
    expect([...new Set(loaded)].sort()).toEqual([...models].sort())
  })

  it("holds the guide at attention 1.0 on the set and 0.2 inside the people mask, grown 6 px and feathered", () => {
    const graph = boundGraph({ mask: [mask] })
    expect(attentionOn(graph, 0)).toBeCloseTo(1, 6)
    expect(attentionOn(graph, 1)).toBeCloseTo(0.2, 6)
    expect(pathsOf({ mask: [mask], endKey: [endKey] })).toMatchObject({
      photo: ["200", "inputs", "image"],
      clip: ["199", "inputs", "file"],
      mask: ["950", "inputs", "file"],
      endKey: ["1002", "inputs", "image"],
    })
    expect(Object.keys(pathsOf())).not.toContain("mask")
    expect(Object.keys(pathsOf())).not.toContain("endKey")
    expect(inputOf(graph, "956", "image")).toEqual(["967", 0])
    expect(inputOf(graph, "967", "image")).toEqual(["955", 0])
    expect(inputOf(graph, "967", "length")).toEqual(["716", 1])
    expect(inputOf(graph, "957", "mask")).toEqual(["956", 0])
    expect(inputOf(graph, "957", "expand")).toEqual(["969", 1])
    expect(inputOf(graph, "968", "image")).toEqual(["952", 0])
    const grow = String(inputOf(graph, "969", "expression"))
    expect(valueOf(grow, { a: 240, b: 360 })).toBe(6)
    expect(valueOf(grow, { a: 512, b: 768 })).toBe(13)
    expect(valueOf(grow, { a: 1152, b: 768 })).toBe(19)
    expect(inputOf(graph, "959", "sigma")).toBe(4)
    expect(inputOf(graph, "955", "image1")).toEqual(["952", 0])
    expect(inputOf(graph, "953", "batch_index")).toEqual(["714", 1])
    expect(inputOf(graph, "954", "amount")).toEqual(["715", 1])
  })

  it("applies the guide's attention everywhere when a run has no mask", () => {
    const graph = boundGraph()
    expect(graph["115"]?.inputs).not.toHaveProperty("attention_mask")
    const left = Object.keys(graph).filter(
      (id) => Number(id) >= 950 && Number(id) <= 969
    )
    expect(left).toEqual([])
    expect(inputOf(graph, "115", "image")).toEqual(["725", 0])
  })

  it("renders exactly the guide's frames when they count 8 n + 1, and pads the rest up to the next 8 n + 1", () => {
    const graph = boundGraph({ mask: [mask] })
    const frames = String(inputOf(graph, "716", "expression"))
    expect(valueOf(frames, { a: 97 })).toBe(97)
    expect(valueOf(frames, { a: 121 })).toBe(121)
    expect(valueOf(frames, { a: 100 })).toBe(105)
    expect(valueOf(frames, { a: 98 })).toBe(105)
    expect(inputOf(graph, "725", "image")).toEqual(["719", 0])
    expect(inputOf(graph, "725", "batch_index")).toBe(0)
    expect(inputOf(graph, "725", "length")).toEqual(["716", 1])
    expect(inputOf(graph, "108", "length")).toEqual(["716", 1])
    expect(inputOf(graph, "101", "frames_number")).toEqual(["716", 1])
  })

  it("renders LTX 2.5 in two stages: half size with the guide, the guide frames cropped, the latent doubled, the photo locked again and refined", () => {
    const graph = boundGraph({ mask: [mask], endKey: [endKey] })
    expect(inputOf(graph, "195", "model")).toEqual(["384", 0])
    expect(inputOf(graph, "384", "unet_name")).toBe(
      "ltx-2.5-22b-distilled-transformer-bf16.safetensors"
    )
    expect(inputOf(graph, "115", "iclora_parameters")).toEqual(["196", 0])
    expect(inputOf(graph, "115", "strength")).toBe(1)
    expect(inputOf(graph, "704", "latent_image")).toEqual(["119", 0])
    expect(inputOf(graph, "106", "latent")).toEqual(["121", 0])
    expect(inputOf(graph, "993", "samples")).toEqual(["106", 2])
    expect(inputOf(graph, "994", "latent")).toEqual(["993", 0])
    expect(inputOf(graph, "999", "latent_image")).toEqual(["995", 0])
    expect(inputOf(graph, "999", "sigmas")).toEqual(["997", 0])
    expect(inputOf(graph, "997", "sigmas")).toBe(
      "0.909375, 0.725, 0.421875, 0.0"
    )
    expect(inputOf(graph, "1000", "av_latent")).toEqual(["999", 0])
    expect(inputOf(graph, "108", "width")).toEqual(["990", 1])
    expect(inputOf(graph, "108", "height")).toEqual(["991", 1])
    for (const [resolution, short] of Object.entries(ltx25ShortSides)) {
      expect(shortSideMap("resolution")[resolution]).toBe(short)
      expect(shortSideMap("shortSide")[String(short)]).toBe(short)
      for (const aspect of motionAspectRatios) {
        const [across = 1, down = 1] = aspect.split(":").map(Number)
        const shortSide = Math.min(across, down) * 256
        const half = [
          sideOf(
            inputOf(graph, "990", "expression"),
            across * 256,
            shortSide,
            short
          ),
          sideOf(
            inputOf(graph, "991", "expression"),
            down * 256,
            shortSide,
            short
          ),
        ]
        expect(half.map((side) => side % 64)).toEqual([0, 0])
        expect(Math.min(...half) * 2).toBe(short)
      }
    }
  })

  it("puts the photo at frame 0 in both stages", () => {
    const graph = boundGraph()
    for (const lock of ["198", "994"]) {
      expect(inputOf(graph, lock, "image")).toEqual(["200", 0])
      expect(inputOf(graph, lock, "strength")).toBe(1)
    }
    expect(inputOf(graph, "198", "latent")).toEqual(["108", 0])
    expect(inputOf(graph, "724", "batch_index")).toBe(1)
  })

  it("guides the end key at the last frame at 0.9 in both stages, and a draft with no end key renders without it and saves its last frame", () => {
    const keyed = boundGraph({ endKey: [endKey] })
    for (const [guideNode, latent] of [
      ["1001", ["115", 2]],
      ["1003", ["994", 0]],
    ] as const) {
      expect(inputOf(keyed, guideNode, "frame_idx")).toBe(-1)
      expect(inputOf(keyed, guideNode, "strength")).toBe(0.9)
      expect(inputOf(keyed, guideNode, "image")).toEqual(["1005", 0])
      expect(inputOf(keyed, guideNode, "latent")).toEqual(latent)
    }
    expect(inputOf(keyed, "1005", "image")).toEqual(["1002", 0])
    expect(inputOf(keyed, "119", "video_latent")).toEqual(["1001", 2])
    expect(inputOf(keyed, "995", "video_latent")).toEqual(["1003", 2])
    expect(inputOf(keyed, "105", "samples")).toEqual(["1004", 2])
    expect(keyed).not.toHaveProperty("1011")
    const draft = boundGraph()
    for (const id of ["1001", "1002", "1003", "1004", "1005"]) {
      expect(draft).not.toHaveProperty(id)
    }
    expect(inputOf(draft, "119", "video_latent")).toEqual(["115", 2])
    expect(inputOf(draft, "983", "positive")).toEqual(["115", 0])
    expect(inputOf(draft, "995", "video_latent")).toEqual(["994", 0])
    expect(inputOf(draft, "998", "positive")).toEqual(["106", 0])
    expect(inputOf(draft, "105", "samples")).toEqual(["1000", 0])
    expect(draft["1011"]?.class_type).toBe("SaveImage")
    expect(inputOf(draft, "1011", "images")).toEqual(["1010", 0])
    expect(inputOf(draft, "1010", "image")).toEqual(["724", 0])
    expect(inputOf(draft, "1010", "batch_index")).toEqual(["714", 1])
    expect(inputOf(draft, "714", "expression")).toBe("a - 1")
  })

  it("carries LTX's own sound through the Effects loudness chain, node for node", () => {
    const graph = boundGraph()
    const effects = fileOf(effectsWorkflow)
    expect(inputOf(graph, "122", "audio")).toEqual(["361", 0])
    expect(inputOf(graph, "361", "audio")).toEqual(["360", 0])
    expect(inputOf(graph, "360", "audio")).toEqual(["359", 0])
    expect(inputOf(graph, "359", "audio")).toEqual(["358", 0])
    expect(inputOf(graph, "358", "samples")).toEqual(["1000", 1])
    expect(inputOf(graph, "358", "audio_vae")).toEqual(["386", 0])
    for (const id of loudnessNodes) {
      const { audio: _ours, ...ours } = graph[id]?.inputs ?? {}
      const { audio: _theirs, ...theirs } = effects[id]?.inputs ?? {}
      expect([graph[id]?.class_type, ours]).toEqual([
        effects[id]?.class_type,
        theirs,
      ])
    }
  })

  it("puts a fixed sentence before the scene that names no control", () => {
    const graph = boundGraph()
    expect(inputOf(graph, "128", "text")).toEqual(["900", 0])
    const sentence = String(inputOf(graph, "900", "string_a"))
    expect(sentence.length).toBeGreaterThan(0)
    expect(sentence).not.toMatch(controlWords)
    expect(
      "The depth guide holds the camera.".match(controlWords)
    ).not.toBeNull()
  })
})
