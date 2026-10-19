import {
  appDefinition,
  type RunInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#recast/app"
import { type Recording, ReplayFetch } from "./replay-fetch"

const cloudUrl = "https://cloud.comfy.org"
const jobId = "6e2f1a0b-8c7d-4e5f-a123-4b5c6d7e8f90"
const clipId = assetIdFormat.parse("0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d")
const photoId = assetIdFormat.parse("1c2d3e4f-5061-4b7c-9d8e-0f1a2b3c4d5e")
const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"
const uploadedClip = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
const uploadedPhoto = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"
const runKey = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d"

const definition = appDefinition.parse(app)

const openWeightModels: Readonly<Record<"character" | "object", string[]>> = {
  character: [
    "wan2.1_14B_SCAIL_2_fp16.safetensors",
    "wan2.1_SCAIL_2_DPO_lora_bf16.safetensors",
    "lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors",
    "sam3.1_multiplex_fp16.safetensors",
  ],
  object: [
    "wan2.1_vace_14B_fp16.safetensors",
    "sam3.1_multiplex_fp16.safetensors",
  ],
}

const coreNodes = new Set([
  "BasicScheduler",
  "BatchImagesNode",
  "CLIPLoader",
  "CLIPTextEncode",
  "CLIPVisionEncode",
  "CLIPVisionLoader",
  "CheckpointLoaderSimple",
  "ColorTransfer",
  "ComfyMathExpression",
  "ComfySwitchNode",
  "CreateVideo",
  "GetImageSize",
  "GetVideoComponents",
  "GrowMask",
  "ImageCompositeMasked",
  "ImageFromBatch",
  "ImageToMask",
  "InvertMask",
  "KSampler",
  "KSamplerSelect",
  "LoadImage",
  "LoadVideo",
  "LoraLoaderModelOnly",
  "MaskToImage",
  "ModelSamplingSD3",
  "PrimitiveBoolean",
  "RepeatImageBatch",
  "ResizeImageMaskNode",
  "SAM3_Detect",
  "SAM3_VideoTrack",
  "SCAIL2ColoredMask",
  "SamplerCustom",
  "SaveVideo",
  "SolidMask",
  "TrimVideoLatent",
  "UNETLoader",
  "VAEDecode",
  "VAELoader",
  "WanSCAILToVideo",
  "WanVaceToVideo",
])

function uploaded(id: string, mime: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: mime, created_new: true },
  }
}

const submitted: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", outputs: [] },
}

const clipFile: EngineFile = {
  assetId: clipId,
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70),
}

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
}

type Node = { class_type: string; inputs: Record<string, unknown> }

type Mode = "character" | "object"
type Quality = "draft" | "final"

const characterInputs = {
  mode: "character",
  source: [clipId],
  character: [characterId],
}

const objectInputs = {
  mode: "object",
  source: [clipId],
  target: "red mug",
  prompt: "a glass of orange juice",
}

function requestFor(body: unknown): EngineRequest {
  const parsed = startRunBodyFor(definition).parse(body)
  const inputs: RunInputs =
    parsed.inputs.mode === "character"
      ? { ...parsed.inputs, character: [photoId] }
      : parsed.inputs
  return {
    idempotencyKey: runKey,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs,
    files:
      parsed.inputs.mode === "character" ? [clipFile, photoFile] : [clipFile],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: "video",
  }
}

function recordingsFor(mode: Mode): Recording[] {
  return mode === "character"
    ? [
        uploaded(uploadedClip, "video/mp4"),
        uploaded(uploadedPhoto, "image/png"),
        submitted,
      ]
    : [uploaded(uploadedClip, "video/mp4"), submitted]
}

async function submit(request: EngineRequest, recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url.endsWith("/api/v2/jobs"))
  const sent: { workflow: Record<string, Node> } = JSON.parse(job?.body ?? "{}")
  return { submission, replay, job, workflow: sent.workflow }
}

function asset(id: string) {
  return { __type: "core/ASSET", info: { id } }
}

function expectWhole(workflow: Record<string, Node>): void {
  for (const [id, node] of Object.entries(workflow)) {
    expect(coreNodes, `node ${id}`).toContain(node.class_type)
    for (const value of Object.values(node.inputs)) {
      if (Array.isArray(value)) {
        expect(Object.keys(workflow), `a link from node ${id}`).toContain(
          value[0]
        )
      }
    }
  }
}

const sizes: Readonly<
  Record<Mode, Record<Quality, Record<string, [number, number]>>>
> = {
  character: {
    draft: {
      "16:9": [896, 512],
      "9:16": [512, 896],
      "1:1": [512, 512],
      "4:3": [672, 512],
      "3:4": [512, 672],
    },
    final: {
      "16:9": [1248, 704],
      "9:16": [704, 1248],
      "1:1": [704, 704],
      "4:3": [928, 704],
      "3:4": [704, 928],
    },
  },
  object: {
    draft: {
      "16:9": [832, 480],
      "9:16": [480, 832],
      "1:1": [480, 480],
      "4:3": [640, 480],
      "3:4": [480, 640],
    },
    final: {
      "16:9": [1248, 704],
      "9:16": [704, 1248],
      "1:1": [704, 704],
      "4:3": [928, 704],
      "3:4": [704, 928],
    },
  },
}

const samplerValues: Readonly<Record<Mode, Record<Quality, object>>> = {
  character: {
    draft: {
      "17": { inputs: { strength_model: 0.8 } },
      "20": { inputs: { steps: 6 } },
      "34": { inputs: { noise_seed: 42, cfg: 1 } },
      "44": { inputs: { noise_seed: 42, cfg: 1 } },
    },
    final: {
      "17": { inputs: { strength_model: 0 } },
      "20": { inputs: { steps: 40 } },
      "34": { inputs: { noise_seed: 42, cfg: 5 } },
      "44": { inputs: { noise_seed: 42, cfg: 5 } },
    },
  },
  object: {
    draft: {
      "35": { inputs: { seed: 42, steps: 20, cfg: 6 } },
      "65": { inputs: { seed: 42, steps: 20, cfg: 6 } },
    },
    final: {
      "35": { inputs: { seed: 42, steps: 20, cfg: 6 } },
      "65": { inputs: { seed: 42, steps: 20, cfg: 6 } },
    },
  },
}

const cases = (["character", "object"] as const).flatMap((mode) =>
  (["draft", "final"] as const).flatMap((quality) =>
    Object.entries(sizes[mode][quality]).map(([ratio, [width, height]]) => ({
      mode,
      quality,
      ratio,
      width,
      height,
    }))
  )
)

describe("the engine request Recast sends to Comfy", () => {
  it.each(cases)(
    "$mode at $quality in $ratio sends $width by $height with its sampler values",
    async ({ mode, quality, ratio, width, height }) => {
      const inputs = mode === "character" ? characterInputs : objectInputs
      const request = requestFor({
        inputs: { ...inputs, quality },
        aspectRatio: ratio,
      })
      const { submission, replay, job, workflow } = await submit(
        request,
        recordingsFor(mode)
      )
      expect(replay.unused()).toEqual([])
      expect(job?.headers.get("Idempotency-Key")).toBe(runKey)
      expect(submission.ref).toBe(jobId)
      expect([...submission.models].sort()).toEqual(
        [...openWeightModels[mode]].sort()
      )
      expectWhole(workflow)
      expect(workflow).toMatchObject({
        "1": { inputs: { file: asset(uploadedClip) } },
        "3": {
          inputs: {
            "resize_type.width": width,
            "resize_type.height": height,
          },
        },
        "82": { inputs: { value: true } },
        ...samplerValues[mode][quality],
      })
    }
  )

  it("swaps an object with the clip's sound off", async () => {
    const request = requestFor({
      inputs: { ...objectInputs, keepSound: "off" },
      aspectRatio: "9:16",
    })
    const { workflow } = await submit(request, recordingsFor("object"))
    expect(workflow).toMatchObject({
      "82": { inputs: { value: false } },
      "84": { inputs: { audio: ["83", 0] } },
    })
  })

  it("puts a character in a 9:16 clip at Final with the clip's sound off", async () => {
    const request = requestFor({
      inputs: { ...characterInputs, keepSound: "off", quality: "final" },
      aspectRatio: "9:16",
    })
    const { replay, workflow } = await submit(
      request,
      recordingsFor("character")
    )
    expect(replay.sent[0]?.form?.get("file_path")).toBe(`${clipId}.mp4`)
    expect(replay.sent[1]?.form?.get("file_path")).toBe(`${photoId}.png`)
    expect(workflow).toMatchObject({
      "11": { inputs: { image: asset(uploadedPhoto) } },
      "82": { inputs: { value: false } },
      "84": { inputs: { audio: ["83", 0] } },
      "85": { inputs: { format: "mp4", "format.codec": "h264" } },
    })
  })

  it("swaps a named object in a 16:9 clip at Draft with the clip's sound on", async () => {
    const request = requestFor({ inputs: objectInputs, aspectRatio: "16:9" })
    const { workflow } = await submit(request, recordingsFor("object"))
    expect(workflow).toMatchObject({
      "13": { class_type: "CLIPTextEncode", inputs: { text: "red mug" } },
      "14": { class_type: "SAM3_Detect", inputs: { conditioning: ["13", 0] } },
      "25": { inputs: { text: "a glass of orange juice" } },
      "82": { inputs: { value: true } },
      "84": { inputs: { images: ["86", 0] } },
      "85": { inputs: { format: "mp4", "format.codec": "h264" } },
    })
    expect(workflow["26"]?.inputs.text).not.toContain("red mug")
  })

  it("sends the two modes different workflows", async () => {
    const character = await submit(
      requestFor({ inputs: characterInputs }),
      recordingsFor("character")
    )
    const object = await submit(
      requestFor({ inputs: objectInputs }),
      recordingsFor("object")
    )
    expect(character.submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
    expect(character.submission.workflowHash).not.toBe(
      object.submission.workflowHash
    )
  })

  it("control: a request bound for the other quality fails the size and sampler check", async () => {
    const draft = requestFor({
      inputs: { ...characterInputs, quality: "draft" },
      aspectRatio: "16:9",
    })
    const final = requestFor({
      inputs: { ...characterInputs, quality: "final" },
      aspectRatio: "16:9",
    })
    const { workflow } = await submit(
      { ...final, binding: draft.binding },
      recordingsFor("character")
    )
    expect(() =>
      expect(workflow).toMatchObject({
        "3": {
          inputs: { "resize_type.width": 1248, "resize_type.height": 704 },
        },
        ...samplerValues.character.final,
      })
    ).toThrow()
  })
})
