import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { findWorkflow } from "#list-workflows"
import { app } from "#try-on/app"
import { type TryOnPart, tryOnPrompts } from "#try-on/comfy/try-on-prompts"
import { type Recording, ReplayFetch } from "./replay-fetch"

const cloudUrl = "https://cloud.comfy.org"
const jobId = "6c2e4f8b-3d5f-4b7c-8e9a-1f2b3c4d5e6f"
const key = "8d7c6b5a-4e3f-4b2a-9c8d-1e2f3a4b5c6d"

const personId = assetIdFormat.parse("3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f")
const clothesId = assetIdFormat.parse("4d5e6f7a-8b9c-4d0e-9f1a-3b4c5d6e7f8a")
const uploadedPerson = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
const uploadedClothes = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"

const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)

const files: readonly EngineFile[] = [
  { assetId: personId, kind: "image", mime: "image/png", bytes: png },
  { assetId: clothesId, kind: "image", mime: "image/png", bytes: png },
]

function uploadRecording(assetId: string, uploadedId: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    filePath: `${assetId}.png`,
    status: 201,
    json: {
      id: uploadedId,
      hash: `blake3:${uploadedId.slice(0, 8)}`,
      size_bytes: png.length,
      content_type: "image/png",
      file_path: `${assetId}.png`,
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
      url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
      url_expires_at: "2026-10-17T10:00:00Z",
    },
  }
}

const submitRecording: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: {
    id: jobId,
    status: "queued",
    created_at: "2026-10-17T09:00:00Z",
    started_at: null,
    completed_at: null,
    expires_at: "2026-10-18T09:00:00Z",
    queue_position: 1,
    progress: null,
    outputs: [],
    error: null,
    urls: {
      self: `/api/v2/jobs/${jobId}`,
      events: `/api/v2/jobs/${jobId}/events`,
      cancel: `/api/v2/jobs/${jobId}/cancel`,
    },
  },
}

type Node = { class_type: string; inputs: Record<string, unknown> }

type Workflow = Record<string, Node>

const sentBody = z.object({
  workflow: z.record(
    z.string(),
    z.object({
      class_type: z.string(),
      inputs: z.record(z.string(), z.unknown()),
    })
  ),
})

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function brokenLinks(workflow: Workflow): string[] {
  const broken: string[] = []
  for (const [id, node] of Object.entries(workflow)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLink(value) && workflow[value[0]] === undefined) {
        broken.push(`${id}.${name} -> ${value[0]}`)
      }
    }
  }
  return broken
}

function emptyInputs(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.entries(node.inputs)
      .filter(([, value]) => value === "")
      .map(([name]) => `${id}.${name}`)
  )
}

const definition = appDefinition.parse(app)

function requestFor(inputs: Record<string, unknown>): EngineRequest {
  const parsed = startRunBodyFor(definition).parse({ inputs })
  return {
    idempotencyKey: key,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files,
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: "image",
  }
}

async function submitted(request: EngineRequest) {
  const replay = new ReplayFetch([
    uploadRecording(personId, uploadedPerson),
    uploadRecording(clothesId, uploadedClothes),
    submitRecording,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url === `${cloudUrl}/api/v2/jobs`)
  const { workflow } = sentBody.parse(JSON.parse(job?.body ?? "{}"))
  return { workflow, replay, submission, job }
}

const person = { __type: "core/ASSET", info: { id: uploadedPerson } }
const clothes = { __type: "core/ASSET", info: { id: uploadedClothes } }
const both = { person: [personId], clothes: [clothesId] }

function expectedGraph(workflowId: string, part: TryOnPart): Workflow {
  const found = findWorkflow(workflowId)
  if (found === null) {
    throw new Error(`workflows/ holds no ${workflowId}`)
  }
  const graph = sentBody.shape.workflow.parse(structuredClone(found.graph))
  const values: Record<string, unknown> = {
    person,
    clothes,
    prompt: tryOnPrompts[part],
    seed: 42,
  }
  for (const [name, target] of Object.entries(found.inputs)) {
    const node = graph[target.nodeId]
    if (node === undefined || !Object.hasOwn(values, name)) {
      throw new Error(
        `${workflowId} binds ${name}, which the test does not set`
      )
    }
    node.inputs[target.inputName] = values[name]
  }
  return graph
}

const models = [
  { model: "qwen-image-edit-2511", workflowId: "try-on-qwen-image-edit-2511" },
  {
    model: "qwen-image-edit-2511-lightning",
    workflowId: "try-on-qwen-image-edit-2511-lightning",
  },
  { model: "flux2-klein-4b", workflowId: "try-on-flux-2-klein-4b" },
]

const parts: readonly TryOnPart[] = ["all", "top", "bottom"]

const engineRequests = models.flatMap((one) =>
  parts.map((part) => ({ ...one, part }))
)

describe("the Try-on engine request", () => {
  it.each(engineRequests)(
    "sends $workflowId from workflows/ with both photos, the $part text, the seed and the key",
    async ({ model, workflowId, part }) => {
      const { workflow, replay, submission, job } = await submitted(
        requestFor({ ...both, part, model })
      )
      expect(workflow).toEqual(expectedGraph(workflowId, part))
      expect(submission.ref).toBe(jobId)
      expect(submission.models).toEqual(findWorkflow(workflowId)?.models)
      expect(job?.headers.get("Idempotency-Key")).toBe(key)
      expect(replay.sent.map((sent) => sent.filePath ?? sent.url)).toEqual([
        `${personId}.png`,
        `${clothesId}.png`,
        `${cloudUrl}/api/v2/jobs`,
      ])
      expect(brokenLinks(workflow)).toEqual([])
    }
  )

  it("sends the Qwen-Image-Edit-2511 workflow with both photos, the Everything text and the seed", async () => {
    const { workflow, replay, submission, job } = await submitted(
      requestFor(both)
    )
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual([
      "qwen_image_edit_2511_fp8mixed.safetensors",
      "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "qwen_image_vae.safetensors",
    ])
    expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
    expect(replay.sent.map((sent) => sent.filePath ?? sent.url)).toEqual(
      expect.arrayContaining([`${personId}.png`, `${clothesId}.png`])
    )
    expect(job?.headers.get("Idempotency-Key")).toBe(key)
    expect(workflow).toMatchObject({
      "41": { class_type: "LoadImage", inputs: { image: person } },
      "83": { class_type: "LoadImage", inputs: { image: clothes } },
      "180": {
        class_type: "ImageScaleToTotalPixels",
        inputs: { image: ["41", 0], megapixels: 1, resolution_steps: 16 },
      },
      "151": {
        class_type: "TextEncodeQwenImageEditPlus",
        inputs: {
          prompt: tryOnPrompts.all,
          image1: ["180", 0],
          image2: ["83", 0],
        },
      },
      "149": { inputs: { prompt: "", image1: ["180", 0], image2: ["83", 0] } },
      "156": { class_type: "VAEEncode", inputs: { pixels: ["180", 0] } },
      "169": {
        class_type: "KSampler",
        inputs: {
          model: ["152", 0],
          latent_image: ["156", 0],
          seed: 42,
          steps: 40,
          cfg: 4,
          sampler_name: "euler",
          scheduler: "simple",
        },
      },
      "9": { class_type: "SaveImage", inputs: { images: ["158", 0] } },
    })
    expect(
      Object.values(workflow).map((node) => node.class_type)
    ).not.toContain("FluxKontextImageScale")
    expect(brokenLinks(workflow)).toEqual([])
    expect(emptyInputs(workflow)).toEqual(["149.prompt"])
  })

  it("writes the Top only and the Bottom only text into the prompt", async () => {
    const top = await submitted(requestFor({ ...both, part: "top" }))
    const bottom = await submitted(requestFor({ ...both, part: "bottom" }))
    expect(top.workflow["151"]?.inputs.prompt).toBe(tryOnPrompts.top)
    expect(bottom.workflow["151"]?.inputs.prompt).toBe(tryOnPrompts.bottom)
    expect(tryOnPrompts.top).not.toBe(tryOnPrompts.bottom)
  })

  it("turns on the 4-step LoRA at CFG 1 for the Lightning model", async () => {
    const { workflow, submission } = await submitted(
      requestFor({ ...both, model: "qwen-image-edit-2511-lightning" })
    )
    expect(workflow).toMatchObject({
      "153": {
        class_type: "LoraLoaderModelOnly",
        inputs: {
          model: ["152", 0],
          lora_name:
            "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
          strength_model: 1,
        },
      },
      "169": { inputs: { model: ["153", 0], steps: 4, cfg: 1, seed: 42 } },
    })
    expect(submission.models).toContain(
      "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors"
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends FLUX.2 Klein 4B with the person and the clothes as two reference latents", async () => {
    const { workflow, submission } = await submitted(
      requestFor({ ...both, part: "top", model: "flux2-klein-4b", seed: 9 })
    )
    expect(submission.models).toEqual([
      "flux-2-klein-4b-fp8.safetensors",
      "qwen_3_4b.safetensors",
      "flux2-vae.safetensors",
    ])
    expect(workflow).toMatchObject({
      "76": { inputs: { image: person } },
      "81": { inputs: { image: clothes } },
      "109": { inputs: { text: tryOnPrompts.top } },
      "111": { inputs: { image: ["76", 0], resolution_steps: 16 } },
      "114": { class_type: "GetImageSize", inputs: { image: ["111", 0] } },
      "117": { inputs: { conditioning: ["109", 0], latent: ["116", 0] } },
      "120": { inputs: { conditioning: ["117", 0], latent: ["119", 0] } },
      "118": { inputs: { conditioning: ["115", 0], latent: ["119", 0] } },
      "113": { inputs: { width: ["114", 0], height: ["114", 1] } },
      "103": {
        inputs: { positive: ["120", 0], negative: ["118", 0], cfg: 1 },
      },
      "106": { inputs: { noise_seed: 42 } },
      "102": { inputs: { steps: 4 } },
    })
    expect(brokenLinks(workflow)).toEqual([])
    expect(emptyInputs(workflow)).toEqual([])
  })

  it("names a link to a node the workflow does not hold", () => {
    const planted: Workflow = {
      "169": { class_type: "KSampler", inputs: { latent_image: ["156", 0] } },
    }
    expect(brokenLinks(planted)).toEqual(["169.latent_image -> 156"])
  })

  it("refuses a part or a model the app does not list before any request", () => {
    expect(() => requestFor({ ...both, part: "shoes" })).toThrow()
    expect(() =>
      requestFor({ ...both, model: "flux2-klein-9b-tryon" })
    ).toThrow()
    expect(() => requestFor({ person: [personId] })).toThrow()
    expect(() => requestFor({ clothes: [clothesId] })).toThrow()
    expect(() =>
      requestFor({ person: [personId], clothes: [clothesId, personId] })
    ).toThrow()
  })
})
