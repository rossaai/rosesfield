import { z } from "zod"
import type { EngineOutput } from "#domain/generation-engine.port"

type Graph = Record<string, unknown>

type Link = [string, number]

export type ListedOutput = {
  node_id: string
  name: string
  type: string
}

type Still = { video: string; index: number }

const graphNode = z.object({
  class_type: z.string(),
  inputs: z.record(z.string(), z.unknown()),
})

const link = z.tuple([z.string(), z.number().int().min(0)])

const stillCount = 5
const stillMegapixels = 0.05
const stillPrefix = "rosesfield-stills/rosesfield-still"
const stillName = /(?:^|\/)rosesfield-still-(.+)-(\d+)_[^/]*$/

export function addVideoStills(graph: Graph): Graph {
  const added: Graph = {}
  let next = nextIdOf(graph)
  for (const [video, value] of Object.entries(graph)) {
    const frames = framesOf(graph, value)
    if (frames === null) {
      continue
    }
    const size = String(next)
    next += 1
    added[size] = { class_type: "GetImageSize", inputs: { image: frames } }
    for (let index = 0; index < stillCount; index += 1) {
      Object.assign(added, stillNodes({ video, index, frames, size, next }))
      next += 4
    }
  }
  return { ...graph, ...added }
}

export function withVideoStills(
  listed: readonly ListedOutput[],
  outputs: readonly EngineOutput[]
): EngineOutput[] {
  const stills = new Map<string, Map<number, Uint8Array>>()
  const videos = new Map<string, number>()
  const kept: { output: EngineOutput; node: string }[] = []
  listed.forEach((one, at) => {
    const output = outputs[at]
    const still = one.type === "image" ? stillOf(one.name) : null
    if (output === undefined) {
      return
    }
    if (still === null) {
      kept.push({ output, node: one.node_id })
      const seen = videos.get(one.node_id) ?? 0
      videos.set(one.node_id, seen + (output.kind === "video" ? 1 : 0))
      return
    }
    const found = stills.get(still.video) ?? new Map<number, Uint8Array>()
    found.set(still.index, output.bytes)
    stills.set(still.video, found)
  })
  return kept.map(({ output, node }) => {
    const found = stills.get(node) ?? new Map<number, Uint8Array>()
    const frames = Array.from({ length: stillCount }, (_, at) => found.get(at))
    const whole = frames.filter((frame) => frame !== undefined)
    const isWhole =
      output.kind === "video" &&
      videos.get(node) === 1 &&
      whole.length === stillCount
    return isWhole ? { ...output, stills: whole } : output
  })
}

function stillNodes(place: {
  video: string
  index: number
  frames: Link
  size: string
  next: number
}): Graph {
  const at = String(place.next)
  const frame = String(place.next + 1)
  const small = String(place.next + 2)
  const last = stillCount - 1
  return {
    [at]: {
      class_type: "ComfyMathExpression",
      inputs: {
        expression: `floor((a - 1) * ${place.index} / ${last})`,
        "values.a": [place.size, 2],
      },
    },
    [frame]: {
      class_type: "ImageFromBatch",
      inputs: { image: place.frames, batch_index: [at, 1], length: 1 },
    },
    [small]: {
      class_type: "ImageScaleToTotalPixels",
      inputs: {
        image: [frame, 0],
        upscale_method: "nearest-exact",
        megapixels: stillMegapixels,
        resolution_steps: 1,
      },
    },
    [String(place.next + 3)]: {
      class_type: "SaveImage",
      inputs: {
        images: [small, 0],
        filename_prefix: `${stillPrefix}-${place.video}-${place.index}`,
      },
    },
  }
}

function framesOf(graph: Graph, value: unknown): Link | null {
  const save = graphNode.safeParse(value)
  if (!save.success || save.data.class_type !== "SaveVideo") {
    return null
  }
  const video = link.safeParse(save.data.inputs.video)
  const create = video.success
    ? graphNode.safeParse(graph[video.data[0]])
    : null
  if (create?.success !== true || create.data.class_type !== "CreateVideo") {
    return null
  }
  const frames = link.safeParse(create.data.inputs.images)
  return frames.success ? frames.data : null
}

function nextIdOf(graph: Graph): number {
  const numbers = Object.keys(graph)
    .filter((id) => /^\d+$/.test(id))
    .map(Number)
  return Math.max(0, ...numbers) + 1
}

function stillOf(name: string): Still | null {
  const match = stillName.exec(name)
  const video = match?.[1]
  const index = Number(match?.[2])
  if (video === undefined || !Number.isInteger(index)) {
    return null
  }
  return index < stillCount ? { video, index } : null
}
