import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { expect } from "vitest"
import { app } from "#layers/app"
import {
  type Recording,
  ReplayFetch,
} from "../../../generation/test/infrastructure/replay-fetch"

const cloudUrl = "https://cloud.comfy.org"
const jobId = "5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6"
export const imageId = assetIdFormat.parse(
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"
)
export const maskId = assetIdFormat.parse(
  "1b2c3d4e-5f6a-4b7c-9d8e-9fa0b1c2d3e4"
)
export const uploadedImage = "c1d2e3f4-a5b6-4c7d-8e9f-a0b1c2d3e4f5"
export const uploadedMask = "d2e3f4a5-b6c7-4d8e-9fa0-b1c2d3e4f5a6"
const runKey = "8b9c0d1e-2f3a-4b4c-8d5e-6f7a8b9c0d1e"

export const definition = appDefinition.parse(app)

const coreNodes = new Set([
  "CFGNorm",
  "CLIPLoader",
  "CLIPTextEncode",
  "EmptyImage",
  "EmptyQwenImageLayeredLatentImage",
  "FluxKontextMultiReferenceLatentMethod",
  "GetImageSize",
  "ImageCompositeMasked",
  "ImageScale",
  "ImageScaleToMaxDimension",
  "ImageScaleToTotalPixels",
  "ImageToMask",
  "InvertMask",
  "JoinImageWithAlpha",
  "KSampler",
  "LatentCut",
  "LatentCutToBatch",
  "LoadImage",
  "LoadImageMask",
  "LoraLoaderModelOnly",
  "MaskComposite",
  "MaskToImage",
  "ModelPatchLoader",
  "ModelSamplingAuraFlow",
  "QwenImageDiffsynthControlnet",
  "ReferenceLatent",
  "SaveImage",
  "SetLatentNoiseMask",
  "StringConcatenate",
  "TextEncodeQwenImageEditPlus",
  "UNETLoader",
  "VAEDecode",
  "VAEEncode",
  "VAELoader",
])

export type Node = { class_type: string; inputs: Record<string, unknown> }

function uploaded(id: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: "image/png", created_new: true },
  }
}

const submitted: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", outputs: [] },
}

function pngFile(assetId: typeof imageId): EngineFile {
  return {
    assetId,
    kind: "image",
    mime: "image/png",
    bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
  }
}

export function requestFor(body: unknown, count?: number): EngineRequest {
  const parsed = startRunBodyFor(definition).parse(body)
  const files = [imageId, maskId]
    .filter((id) => JSON.stringify(parsed.inputs).includes(id))
    .map(pngFile)
  return {
    idempotencyKey: runKey,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files,
    count: count ?? parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: "image",
  }
}

export async function submit(request: EngineRequest) {
  const uploads = request.files.map((file) =>
    uploaded(file.assetId === imageId ? uploadedImage : uploadedMask)
  )
  const replay = new ReplayFetch([...uploads, submitted])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url.endsWith("/api/v2/jobs"))
  const sent: { workflow: Record<string, Node> } = JSON.parse(job?.body ?? "{}")
  expect(replay.unused()).toEqual([])
  expect(job?.headers.get("Idempotency-Key")).toBe(runKey)
  expect(submission.ref).toBe(jobId)
  expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
  expectWhole(sent.workflow)
  return { submission, workflow: sent.workflow }
}

export function asset(id: string) {
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
  for (const [id, node] of Object.entries(workflow)) {
    if ("crop" in node.inputs) {
      expect(node.inputs.crop, `the crop of node ${id}`).toBe("disabled")
    }
  }
  const saves = Object.values(workflow).filter(
    (node) => node.class_type === "SaveImage"
  )
  expect(saves).toHaveLength(1)
}

export async function submitRefused(request: EngineRequest): Promise<void> {
  const replay = new ReplayFetch(
    request.files.map(() => uploaded(uploadedImage))
  )
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit(request)
}
