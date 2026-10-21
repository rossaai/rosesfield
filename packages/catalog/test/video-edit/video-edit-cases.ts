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
  "CFGGuider",
  "CLIPLoader",
  "CLIPTextEncode",
  "CheckpointLoaderSimple",
  "ComfyMathExpression",
  "ComfySwitchNode",
  "CreateVideo",
  "EmptyImage",
  "EmptyLTXVLatentVideo",
  "FrameInterpolate",
  "FrameInterpolationModelLoader",
  "GetImageSize",
  "GetVideoComponents",
  "ImageCompositeMasked",
  "ImageFromBatch",
  "KSamplerSelect",
  "LTXAVTextEncoderLoader",
  "LTXVAddGuide",
  "LTXVAudioVAELoader",
  "LTXVConcatAVLatent",
  "LTXVConditioning",
  "LTXVCropGuides",
  "LTXVDualCFGGuider",
  "LTXVEmptyLatentAudio",
  "LTXVImgToVideoInplace",
  "LTXVLatentUpsampler",
  "LTXVPreprocess",
  "LTXVSeparateAVLatent",
  "LatentUpscaleModelLoader",
  "LoadBackgroundRemovalModel",
  "LoadVideo",
  "LoraLoaderModelOnly",
  "ManualSigmas",
  "PrimitiveBoolean",
  "PrimitiveInt",
  "RandomNoise",
  "RemoveBackground",
  "ResizeImageMaskNode",
  "SamplerCustomAdvanced",
  "SaveVideo",
  "StringConcatenate",
  "UNETLoader",
  "VAEDecode",
  "VAEDecodeTiled",
  "VAELoader",
])

export const ltxPackNodes = new Set(["LTXAddVideoICLoRAGuide"])

export const clipAsset = { __type: "core/ASSET", info: { id: uploadedClip } }
export const mp4 = { format: "mp4", "format.codec": "h264" }

export const extendFrames: Readonly<Record<number, string>> = {
  2: "round(2 * a / 8) * 8 + 1",
  3: "round(3 * a / 8) * 8 + 1",
  4: "round(4 * a / 8) * 8 + 1",
  5: "round(5 * a / 8) * 8 + 1",
}

export const reframeSizes: Readonly<
  Record<string, Readonly<Record<string, readonly [number, number]>>>
> = {
  "480p": {
    "1-1": [480, 480],
    "4-3": [640, 480],
    "3-4": [480, 640],
    "16-9": [864, 480],
    "9-16": [480, 864],
  },
  "720p": {
    "1-1": [704, 704],
    "4-3": [896, 672],
    "3-4": [672, 896],
    "16-9": [1248, 704],
    "9-16": [704, 1248],
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
  const short = resolution === "480p" ? 512 : 768
  const frames = extendFrames[seconds] ?? ""
  return {
    name: `Extend adds ${seconds} seconds on LTX 2.5 at ${resolution} with sound ${sound}`,
    inputs: {
      mode: "extend",
      model: "ltx-2-5",
      seconds,
      resolution,
      keepSound: sound,
      next: "the dog runs to the gate",
    },
    model: "Lightricks/LTX-2.5",
    expected: {
      "1001": { file: clipAsset },
      "1004": {
        expression: `max(32, round(a * ${short} / min(a, b) / 64) * 32)`,
      },
      "1005": {
        expression: `max(32, round(b * ${short} / min(a, b) / 64) * 32)`,
      },
      "1008": { expression: frames, "values.a": ["1002", 2] },
      "1014": { value: sound === "on" },
      "339": { noise_seed: seed },
      "900": { string_a: "the dog runs to the gate" },
      "75": { filename_prefix: "video-edit/extend", ...mp4 },
    },
    plant: { node: "1008", input: "expression", value: `${frames} + 8` },
  }
}

export function reframeCase(
  resolution: "480p" | "720p",
  aspect: string
): EngineCase {
  const [width, height] = reframeSizes[resolution]?.[aspect] ?? [0, 0]
  return {
    name: `Reframe makes ${aspect} at ${resolution} on LTX 2.3, ${width} by ${height}`,
    inputs: {
      mode: "reframe",
      model: "ltx-2-3-outpaint",
      aspect,
      resolution,
      around: "a brick wall and a street lamp",
    },
    model: "Lightricks/LTX-2.3",
    expected: {
      "1": { file: clipAsset },
      "12": { value: width },
      "13": { value: height },
      "20": { width: ["12", 0], height: ["13", 0], color: 0 },
      "21": { destination: ["20", 0], source: ["16", 0] },
      "5112": { width: ["12", 0], height: ["13", 0], length: ["3", 2] },
      "5117": { noise_seed: seed },
      "5138": { text: "a brick wall and a street lamp" },
      "5142": { image: ["21", 0], strength: 1 },
      "41": { value: true },
      "43": { images: ["5154", 0], fps: ["2", 2] },
      "44": mp4,
    },
    plant: { node: "12", input: "value", value: width + 32 },
  }
}

export function backgroundCase(color: string): EngineCase {
  const value = colors[color] ?? -1
  return {
    name: `Background puts the subject on ${color}`,
    inputs: { mode: "background", model: "birefnet", color },
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
    inputs: { mode: "frame-rate", model: "film", factor },
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
  extendCase(2, "480p", "on"),
  extendCase(3, "480p", "on"),
  extendCase(4, "720p", "on"),
  extendCase(5, "720p", "off"),
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

export function graphProblemsOf(
  workflow: Workflow,
  packNodes: ReadonlySet<string> = new Set()
): string[] {
  const problems: string[] = []
  for (const [id, node] of Object.entries(workflow)) {
    if (!coreNodes.has(node.class_type) && !packNodes.has(node.class_type)) {
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
