import { videoWorkflows, withoutLastFrame } from "#video/comfy/video-workflows"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Node = { class_type: string; inputs: Record<string, unknown> }
type Graph = Record<string, Node>
type Link = [string, number]

export const extendWorkflow = videoWorkflows["ltx-2-5-start-frame"]

export const extendNodes = {
  clip: "1001",
  parts: "1002",
  size: "1003",
  width: "1004",
  height: "1005",
  fullWidth: "1006",
  fullHeight: "1007",
  frames: "1008",
  lastFrame: "1010",
  startFrame: "1011",
  added: "1012",
  joined: "1013",
  keepSound: "1014",
  sound: "1015",
} as const

const ltx = {
  startImage: "401",
  startResize: "351",
  latent: "356",
  conditioning: "365",
  audioLatent: "366",
  decodedAudio: "358",
  decoded: "374",
  video: "370",
  save: "75",
} as const

const fps: Link = [extendNodes.parts, 2]

export function sideExpression(shorterSide: number, side: "a" | "b"): string {
  return `max(32, round(${side} * ${shorterSide} / min(a, b) / 64) * 32)`
}

export function framesExpression(seconds: number): string {
  return `round(${seconds} * a / 8) * 8 + 1`
}

function nodeOf(graph: Graph, id: string): Node {
  const node = graph[id]
  if (node === undefined) {
    throw new WorkflowInvalidError({
      folder: extendWorkflow,
      reason: `it has no node ${id}`,
    })
  }
  return node
}

function link(id: string, slot = 0): Link {
  return [id, slot]
}

function math(expression: string, values: Record<string, Link>): Node {
  const inputs: Record<string, unknown> = { expression }
  for (const [name, value] of Object.entries(values)) {
    inputs[`values.${name}`] = value
  }
  return { class_type: "ComfyMathExpression", inputs }
}

function clipNodes(): Graph {
  const n = extendNodes
  const size = { a: link(n.size, 0), b: link(n.size, 1) }
  return {
    [n.clip]: { class_type: "LoadVideo", inputs: { file: "clip.mp4" } },
    [n.parts]: {
      class_type: "GetVideoComponents",
      inputs: { video: link(n.clip) },
    },
    [n.size]: { class_type: "GetImageSize", inputs: { image: link(n.parts) } },
    [n.width]: math(sideExpression(512, "a"), size),
    [n.height]: math(sideExpression(512, "b"), size),
    [n.fullWidth]: math("a * 2", { a: link(n.width, 1) }),
    [n.fullHeight]: math("a * 2", { a: link(n.height, 1) }),
    [n.frames]: math(framesExpression(2), { a: fps }),
    [n.lastFrame]: {
      class_type: "ImageFromBatch",
      inputs: { image: link(n.parts), batch_index: -1, length: 1 },
    },
    [n.startFrame]: {
      class_type: "ResizeImageMaskNode",
      inputs: {
        input: link(n.lastFrame),
        resize_type: "scale dimensions",
        scale_method: "lanczos",
        "resize_type.width": link(n.fullWidth, 1),
        "resize_type.height": link(n.fullHeight, 1),
        "resize_type.crop": "disabled",
      },
    },
  }
}

function joinNodes(): Graph {
  const n = extendNodes
  return {
    [n.added]: {
      class_type: "ImageFromBatch",
      inputs: { image: link(ltx.decoded), batch_index: 1, length: 4096 },
    },
    [n.joined]: {
      class_type: "BatchImagesNode",
      inputs: {
        "images.image0": link(n.parts),
        "images.image1": link(n.added),
      },
    },
    [n.keepSound]: { class_type: "PrimitiveBoolean", inputs: { value: true } },
    [n.sound]: {
      class_type: "ComfySwitchNode",
      inputs: { switch: link(n.keepSound), on_true: link(n.parts, 1) },
    },
  }
}

function setInputs(
  graph: Graph,
  id: string,
  inputs: Record<string, unknown>
): void {
  const node = nodeOf(graph, id)
  graph[id] = { ...node, inputs: { ...node.inputs, ...inputs } }
}

export function extendGraph(
  workflow: Record<string, unknown>
): Record<string, unknown> {
  const graph: Graph = structuredClone(
    apiGraph.parse(withoutLastFrame(workflow))
  )
  for (const id of [ltx.startImage, ltx.decodedAudio]) {
    nodeOf(graph, id)
    delete graph[id]
  }
  Object.assign(graph, clipNodes(), joinNodes())
  const frames = link(extendNodes.frames, 1)
  setInputs(graph, ltx.startResize, { input: link(extendNodes.startFrame) })
  setInputs(graph, ltx.latent, {
    width: link(extendNodes.width, 1),
    height: link(extendNodes.height, 1),
    length: frames,
  })
  setInputs(graph, ltx.conditioning, { frame_rate: fps })
  setInputs(graph, ltx.audioLatent, { frames_number: frames, frame_rate: fps })
  setInputs(graph, ltx.video, {
    images: link(extendNodes.joined),
    fps,
    audio: link(extendNodes.sound),
  })
  setInputs(graph, ltx.save, {
    filename_prefix: "video-edit/extend",
    format: "mp4",
    "format.codec": "h264",
  })
  return graph
}
