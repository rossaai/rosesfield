import { type RunInputs, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { viewsOf } from "#angles/angle-views"
import { app } from "#angles/app"
import { loraPromptOf } from "#angles/comfy/angle-words"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"

type Node = { class_type: string; inputs: Record<string, unknown> }
type Workflow = Record<string, Node>
type Recording = { status: number; json: unknown }
type Sent = { method: string; url: string; body: string | null }

const cloud = "https://cloud.comfy.org"
const jobId = "4a6c8e0b-2d4f-4b6a-8c0e-2f4a6c8e0b2d"
const uploadedId = "6c8e0b2d-4f6a-4c8e-9b2d-4f6a8c0e2b4d"
const photoId = assetIdFormat.parse("2b4d6f8a-0c2e-4a6c-8e0b-2d4f6a8c0e2b")
const [angles] = readApps([{ folder: "angles", app }])

const recordings: Readonly<Record<string, Recording>> = {
  [`POST ${cloud}/api/v2/assets`]: {
    status: 201,
    json: {
      id: uploadedId,
      hash: "blake3:6c8e0b2d",
      size_bytes: 8,
      content_type: "image/png",
      file_path: `${photoId}.png`,
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
    },
  },
  [`POST ${cloud}/api/v2/jobs`]: {
    status: 201,
    json: {
      id: jobId,
      status: "queued",
      created_at: "2026-10-17T09:00:00Z",
      queue_position: 1,
      progress: null,
      outputs: [],
      error: null,
    },
  },
}

function replay(recorded: Readonly<Record<string, Recording>>) {
  const sent: Sent[] = []
  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const recording = recorded[`${method} ${url}`]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { sent, fetch }
}

function requestFor(inputs: Record<string, unknown>): EngineRequest {
  if (angles === undefined) {
    throw new Error("The angles app did not parse")
  }
  const parsed = startRunBodyFor(angles).parse({
    inputs: { image: [photoId], ...inputs },
  })
  const runInputs: RunInputs = { ...parsed.inputs }
  return {
    idempotencyKey: "8e0b2d4f-6a8c-4e0b-a2d4-f6a8c0e2b4d6",
    binding: resolveBinding(angles.engine, parsed.inputs),
    inputs: runInputs,
    files: [
      {
        assetId: photoId,
        kind: "image",
        mime: "image/png",
        bytes: new Uint8Array(8),
      },
    ],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 4242,
    outputKind: "image",
  }
}

async function submitted(
  inputs: Record<string, unknown>,
  recorded = recordings
) {
  const { sent, fetch } = replay(recorded)
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
  const submission = await engine.submit(requestFor(inputs))
  const job = sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  const workflow: Workflow = JSON.parse(job?.body ?? "{}").workflow
  return { sent, submission, workflow }
}

function linkOf(value: unknown): string | null {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
    ? value[0]
    : null
}

function textOf(workflow: Workflow, value: unknown): string {
  const id = linkOf(value)
  if (id === null) {
    return typeof value === "string" ? value : ""
  }
  const node = workflow[id]
  if (node?.class_type !== "StringConcatenate") {
    throw new Error(`Node ${id} is not text`)
  }
  const { string_a, string_b, delimiter } = node.inputs
  return [textOf(workflow, string_a), textOf(workflow, string_b)].join(
    typeof delimiter === "string" ? delimiter : ""
  )
}

function danglingLinks(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.values(node.inputs)
      .map(linkOf)
      .filter((target) => target !== null && workflow[target] === undefined)
      .map((target) => `${id} -> ${target}`)
  )
}

function nodesOf(workflow: Workflow, classType: string): [string, Node][] {
  return Object.entries(workflow)
    .filter(([, node]) => node.class_type === classType)
    .sort(([left], [right]) => Number(left) - Number(right))
}

function batchOrder(workflow: Workflow, from: unknown): string[] {
  const id = linkOf(from)
  const node = id === null ? undefined : workflow[id]
  if (id === null || node === undefined) {
    return []
  }
  if (node.class_type === "ImageBatch") {
    return [
      ...batchOrder(workflow, node.inputs.image1),
      ...batchOrder(workflow, node.inputs.image2),
    ]
  }
  return [id]
}

function sourceOfDecode(workflow: Workflow, decode: string): string {
  const sampler = linkOf(workflow[decode]?.inputs.samples) ?? ""
  const method = linkOf(workflow[sampler]?.inputs.positive) ?? ""
  const encode = linkOf(workflow[method]?.inputs.conditioning) ?? ""
  return textOf(workflow, workflow[encode]?.inputs.prompt)
}

describe("the Angles engine request on qwen-image-edit-2511", () => {
  it("sends one branch per view of the set, in the set's order, with one seed", async () => {
    const { workflow, submission, sent } = await submitted({
      angleSet: "quarters",
      distance: "wide",
    })
    const views = viewsOf({
      mode: "set",
      angleSet: "quarters",
      distance: "wide",
    })
    const saved = batchOrder(workflow, workflow["9"]?.inputs.images)
    expect(saved.map((decode) => sourceOfDecode(workflow, decode))).toEqual(
      views.map(loraPromptOf)
    )
    expect(saved.map((decode) => sourceOfDecode(workflow, decode))).toEqual([
      "<sks> front-right quarter view eye-level shot wide shot",
      "<sks> back-right quarter view eye-level shot wide shot",
      "<sks> back-left quarter view eye-level shot wide shot",
      "<sks> front-left quarter view eye-level shot wide shot",
    ])
    const samplers = nodesOf(workflow, "KSampler")
    expect(samplers).toHaveLength(4)
    expect(samplers.map(([, node]) => node.inputs.seed)).toEqual([
      4242, 4242, 4242, 4242,
    ])
    expect(samplers[0]?.[1].inputs).toMatchObject({
      steps: 4,
      cfg: 1,
      sampler_name: "euler",
      scheduler: "simple",
      negative: ["96", 0],
      latent_image: ["105", 0],
    })
    expect(nodesOf(workflow, "SaveImage")).toHaveLength(1)
    expect(workflow["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(workflow["109"]?.inputs).toMatchObject({
      lora_name: "qwen-image-edit-2511-multiple-angles-lora.safetensors",
      strength_model: 1,
    })
    expect(submission.models).toContain(
      "qwen-image-edit-2511-multiple-angles-lora.safetensors"
    )
    expect(sent.map((one) => `${one.method} ${one.url}`)).toEqual([
      `POST ${cloud}/api/v2/assets`,
      `POST ${cloud}/api/v2/jobs`,
    ])
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("sends the four heights of the front for the heights set", async () => {
    const { workflow } = await submitted({ angleSet: "heights" })
    const saved = batchOrder(workflow, workflow["9"]?.inputs.images)
    expect(saved.map((decode) => sourceOfDecode(workflow, decode))).toEqual([
      "<sks> front view low-angle shot medium shot",
      "<sks> front view eye-level shot medium shot",
      "<sks> front view elevated shot medium shot",
      "<sks> front view high-angle shot medium shot",
    ])
  })

  it("sends one branch for one view, with the side, the height and the distance", async () => {
    const { workflow } = await submitted({
      mode: "single",
      side: "back",
      height: "low",
      distance: "close",
    })
    expect(nodesOf(workflow, "KSampler")).toHaveLength(1)
    expect(nodesOf(workflow, "ImageBatch")).toHaveLength(0)
    expect(workflow["9"]?.inputs.images).toEqual(["103", 0])
    expect(sourceOfDecode(workflow, "103")).toBe(
      "<sks> back view low-angle shot close-up"
    )
    expect(workflow["106"]?.inputs.seed).toBe(4242)
    expect(danglingLinks(workflow)).toEqual([])
  })
})

const openWeightsFiles = [
  "qwen_image_edit_2511_bf16.safetensors",
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_vae.safetensors",
  "qwen-image-edit-2511-multiple-angles-lora.safetensors",
  "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
]

function loadedFiles(workflow: Workflow): string[] {
  return Object.values(workflow).flatMap((node) =>
    Object.entries(node.inputs)
      .filter(([name]) => /^(unet|clip|vae|lora|ckpt)_name$/.test(name))
      .map(([, value]) => String(value))
  )
}

function foreignFiles(workflow: Workflow): string[] {
  return loadedFiles(workflow).filter(
    (file) => !openWeightsFiles.includes(file)
  )
}

describe("the Angles request runs open weights only", () => {
  it.each([
    { mode: "set", workflow: "angles-set-qwen-image-edit-2511" },
    { mode: "single", workflow: "angles-qwen-image-edit-2511" },
  ])(
    "sends $workflow with only its open-weights files in $mode mode",
    async ({ mode, workflow: id }) => {
      const { submission, workflow } = await submitted({ mode })
      expect(Object.keys(workflow).sort()).toEqual(
        Object.keys(findWorkflow(id)?.graph ?? {}).sort()
      )
      expect([...submission.models].sort()).toEqual(
        [...openWeightsFiles].sort()
      )
      expect(loadedFiles(workflow)).toHaveLength(5)
      expect(foreignFiles(workflow)).toEqual([])
    }
  )

  it("finds a planted file outside the open-weights list, the control", async () => {
    const { workflow } = await submitted({ mode: "single" })
    const planted = structuredClone(workflow)
    const lora = planted["109"]
    if (lora === undefined) {
      throw new Error("The workflow has no angles LoRA loader")
    }
    lora.inputs = { ...lora.inputs, lora_name: "planted-closed.safetensors" }
    expect(foreignFiles(planted)).toEqual(["planted-closed.safetensors"])
  })

  it("refuses a model input, because the app has one model", () => {
    expect(() => requestFor({ model: "qwen-image-edit-2511" })).toThrow()
  })
})

describe("the mode rule before any request", () => {
  it("refuses a view input of the other mode and sends nothing, the control", async () => {
    const { sent, fetch } = replay(recordings)
    const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
    const refused = [
      { mode: "single", angleSet: "heights" },
      { mode: "set", side: "back" },
      { height: "low" },
    ]
    for (const inputs of refused) {
      await expect(async () =>
        engine.submit(requestFor(inputs))
      ).rejects.toThrow()
    }
    expect(sent).toEqual([])
  })
})

describe("the controls of the replay", () => {
  it("throws on a request it has no recording for", async () => {
    const withoutUpload = {
      [`POST ${cloud}/api/v2/jobs`]: recordings[`POST ${cloud}/api/v2/jobs`],
    } as Record<string, Recording>
    await expect(submitted({}, withoutUpload)).rejects.toThrow(
      expect.objectContaining({ code: "ENGINE_UNAVAILABLE" })
    )
  })

  it("finds a planted dangling link and a planted swap of the view order", async () => {
    const { workflow } = await submitted({})
    const planted = structuredClone(workflow)
    const first = planted["130"]
    if (first === undefined) {
      throw new Error("The set has no first batch node")
    }
    first.inputs = { ...first.inputs, image2: ["9999", 0] }
    expect(danglingLinks(planted)).toEqual(["130 -> 9999"])
    const swapped = structuredClone(workflow)
    const batch = swapped["130"]
    if (batch === undefined) {
      throw new Error("The set has no first batch node")
    }
    batch.inputs = {
      ...batch.inputs,
      image1: batch.inputs.image2,
      image2: batch.inputs.image1,
    }
    const order = batchOrder(swapped, swapped["9"]?.inputs.images).map(
      (decode) => sourceOfDecode(swapped, decode)
    )
    expect(order).not.toEqual(
      viewsOf({ mode: "set", angleSet: "turnaround" }).map(loraPromptOf)
    )
  })
})
