import { sixteenFpsOutput } from "#video-edit/comfy/clip-at-sixteen-fps"

export type Node = { class_type: string; inputs: Record<string, unknown> }
export type Workflow = Record<string, Node>
export type Expected = Readonly<
  Record<string, Readonly<Record<string, unknown>>>
>

export type EngineCase = {
  name: string
  inputs: Record<string, unknown>
  model: string
  expected: Expected
  plant: { node: string; input: string; value: unknown }
}

export const uploadedClip = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b"
export const seed = 42

export const coreNodes = new Set([
  "BatchImagesNode",
  "CLIPLoader",
  "CLIPTextEncode",
  "ComfyMathExpression",
  "ComfySwitchNode",
  "CreateVideo",
  "EmptyImage",
  "FrameInterpolate",
  "FrameInterpolationModelLoader",
  "GetImageSize",
  "GetVideoComponents",
  "ImageCompositeMasked",
  "ImageFromBatch",
  "ImagePadForOutpaint",
  "ImageToMask",
  "KSampler",
  "KSamplerAdvanced",
  "LoadBackgroundRemovalModel",
  "LoadVideo",
  "MaskToImage",
  "ModelSamplingSD3",
  "PrimitiveBoolean",
  "PrimitiveInt",
  "RemoveBackground",
  "RepeatImageBatch",
  "ResizeImageMaskNode",
  "SaveVideo",
  "TrimVideoLatent",
  "UNETLoader",
  "VAEDecode",
  "VAELoader",
  "WanImageToVideo",
  "WanVaceToVideo",
])

export const clipAsset = { __type: "core/ASSET", info: { id: uploadedClip } }
export const mp4 = { format: "mp4", "format.codec": "h264" }

export const extendFrames: Readonly<Record<number, number>> = {
  1: 17,
  2: 33,
  3: 49,
  4: 65,
}

export const reframeSizes: Readonly<
  Record<string, Readonly<Record<string, readonly [number, number]>>>
> = {
  "480p": {
    "1-1": [480, 480],
    "4-3": [640, 480],
    "3-4": [480, 640],
    "16-9": [848, 480],
    "9-16": [480, 848],
  },
  "720p": {
    "1-1": [720, 720],
    "4-3": [960, 720],
    "3-4": [720, 960],
    "16-9": [1280, 720],
    "9-16": [720, 1280],
  },
}

export const colors: Readonly<Record<string, number>> = {
  green: 0x00b140,
  white: 0xffffff,
  black: 0x000000,
}

export function extendCase(
  seconds: number,
  resolution: "480p" | "720p",
  sound: "on" | "off"
): EngineCase {
  const frames = extendFrames[seconds] ?? 0
  return {
    name: `Extend adds ${seconds} seconds at ${resolution} with sound ${sound}`,
    inputs: {
      mode: "extend",
      seconds,
      resolution,
      keepSound: sound,
      next: "the dog runs to the gate",
    },
    model: "Wan-AI/Wan2.2-I2V-A14B",
    expected: {
      "1": { file: clipAsset },
      "10": {
        input: [sixteenFpsOutput, 0],
        "resize_type.shorter_size": resolution === "480p" ? 480 : 720,
      },
      "13": { batch_index: -1, length: 1 },
      "20": { image: ["87", 0], batch_index: 1 },
      "21": { "images.image0": ["11", 0], "images.image1": ["20", 0] },
      "22": { value: sound === "on" },
      "24": { fps: 16, audio: ["23", 0] },
      "25": mp4,
      "86": { noise_seed: seed },
      "93": { text: "the dog runs to the gate" },
      "98": { length: frames, start_image: ["13", 0] },
    },
    plant: { node: "98", input: "length", value: frames + 1 },
  }
}

export function reframeCase(
  resolution: "480p" | "720p",
  aspect: string
): EngineCase {
  const [width, height] = reframeSizes[resolution]?.[aspect] ?? [0, 0]
  return {
    name: `Reframe makes ${aspect} at ${resolution}, ${width} by ${height}`,
    inputs: {
      mode: "reframe",
      aspect,
      resolution,
      around: "a brick wall and a street lamp",
    },
    model: "Wan-AI/Wan2.1-VACE-14B",
    expected: {
      "1": { file: clipAsset },
      "12": { value: width },
      "13": { value: height },
      "16": { input: [sixteenFpsOutput, 0] },
      "21": { feathering: 0 },
      "34": { text: "a brick wall and a street lamp" },
      "36": { width: ["12", 0], height: ["13", 0], length: 81 },
      "37": { seed },
      "40": { length: ["10", 2] },
      "41": { value: true },
      "43": { fps: 16 },
      "44": mp4,
    },
    plant: { node: "12", input: "value", value: width + 16 },
  }
}

export function backgroundCase(color: string): EngineCase {
  const value = colors[color] ?? -1
  return {
    name: `Background puts the subject on ${color}`,
    inputs: { mode: "background", color },
    model: "ZhengPeng7/BiRefNet",
    expected: {
      "1": { file: clipAsset },
      "8": { bg_removal_name: "birefnet.safetensors" },
      "9": { image: ["6", 0] },
      "10": { color: value, batch_size: ["7", 2] },
      "11": { mask: ["9", 0], source: ["6", 0] },
      "12": { value: true },
      "14": { fps: ["2", 2] },
      "15": mp4,
    },
    plant: { node: "10", input: "color", value: value + 1 },
  }
}

export function frameRateCase(factor: "2x" | "4x"): EngineCase {
  const times = factor === "2x" ? 2 : 4
  return {
    name: `Frame rate raises the rate ${times} times`,
    inputs: { mode: "frame-rate", factor },
    model: "google-research/frame-interpolation",
    expected: {
      "1": { file: clipAsset },
      "8": { model_name: "film_net_fp16.safetensors" },
      "9": { multiplier: times, images: ["6", 0] },
      "10": { expression: `a * ${times}`, "values.a": ["2", 2] },
      "11": { value: true },
      "13": { fps: ["10", 0] },
      "14": mp4,
    },
    plant: { node: "9", input: "multiplier", value: times === 2 ? 4 : 2 },
  }
}

export const engineCases: readonly EngineCase[] = [
  extendCase(1, "480p", "on"),
  extendCase(2, "480p", "on"),
  extendCase(3, "480p", "on"),
  extendCase(4, "720p", "off"),
  ...(["480p", "720p"] as const).flatMap((resolution) =>
    ["1-1", "4-3", "3-4", "16-9", "9-16"].map((aspect) =>
      reframeCase(resolution, aspect)
    )
  ),
  backgroundCase("green"),
  backgroundCase("white"),
  backgroundCase("black"),
  frameRateCase("2x"),
  frameRateCase("4x"),
]

export function graphProblemsOf(workflow: Workflow): string[] {
  const problems: string[] = []
  for (const [id, node] of Object.entries(workflow)) {
    if (!coreNodes.has(node.class_type)) {
      problems.push(`node ${id} is ${node.class_type}, not a core node`)
    }
    for (const value of Object.values(node.inputs)) {
      if (Array.isArray(value) && workflow[String(value[0])] === undefined) {
        problems.push(`node ${id} links to the missing node ${value[0]}`)
      }
    }
  }
  return problems
}

export function valueProblemsOf(
  workflow: Workflow,
  expected: Expected
): string[] {
  const problems: string[] = []
  for (const [id, inputs] of Object.entries(expected)) {
    const node = workflow[id]
    if (node === undefined) {
      problems.push(`node ${id} is missing`)
      continue
    }
    for (const [name, value] of Object.entries(inputs)) {
      const sent = node.inputs[name]
      if (JSON.stringify(sent) !== JSON.stringify(value)) {
        problems.push(
          `node ${id} ${name} is ${JSON.stringify(sent)}, not ${JSON.stringify(value)}`
        )
      }
    }
  }
  return problems
}

export function planted(
  workflow: Workflow,
  plant: EngineCase["plant"]
): Workflow {
  const copy: Workflow = structuredClone(workflow)
  const node = copy[plant.node]
  if (node !== undefined) {
    node.inputs[plant.input] = plant.value
  }
  return copy
}
