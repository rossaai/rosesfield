import { describe, expect, it } from "vitest"
import type { EngineRequest } from "#domain/generation-engine.port"
import { comfyWorkflow } from "#infrastructure/comfy/comfy-workflow-binding"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { writeFlatMp4 } from "#infrastructure/demo/flat-mp4"
import { glbBytes } from "../glb-bytes"
import { pngBytes, referenceId } from "../sample"
import {
  cloudUrl,
  comfyV2,
  comfyV2At,
  failedJob,
  jobId,
  outputId,
  proxyUrl,
  queuedJob,
  refusedJob,
  succeededJob,
  uploadedId,
  workflowBinding,
} from "./fixtures/comfy-v2"
import { type Recording, ReplayFetch } from "./replay-fetch"

const request: EngineRequest = {
  idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
  binding: workflowBinding,
  inputs: { prompt: "a red door in fog", references: [referenceId] },
  files: [
    {
      assetId: referenceId,
      kind: "image",
      mime: "image/png",
      bytes: pngBytes(),
    },
  ],
  count: 1,
  aspectRatio: "1:1",
  seed: 42,
  outputKind: "image",
}

function engineFor(recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  return { engine, replay }
}

function sentWorkflow(replay: ReplayFetch): Record<string, unknown> {
  const body = replay.sent.find((sent) => sent.url.endsWith("/jobs"))?.body
  return JSON.parse(body ?? "{}").workflow
}

describe("ComfyGenerationEngine", () => {
  it("uploads each input and submits the filled workflow with the key", async () => {
    const { engine, replay } = engineFor([comfyV2.upload(), comfyV2.submit()])
    const submission = await engine.submit(request)
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual(["sample-model.safetensors"])
    expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)

    const upload = replay.sent[0]
    expect(upload?.form?.get("content_type")).toBe("image/png")
    expect(upload?.form?.get("file_path")).toBe(`${referenceId}.png`)
    const job = replay.sent[1]
    expect(job?.headers.get("Authorization")).toBe("Bearer comfyui-test")
    expect(job?.headers.get("Idempotency-Key")).toBe(request.idempotencyKey)
    expect(sentWorkflow(replay)).toMatchObject({
      "3": { inputs: { seed: 42, steps: 4 } },
      "6": { inputs: { text: "a red door in fog", clip: ["4", 1] } },
      "10": {
        inputs: { image: { __type: "core/ASSET", info: { id: uploadedId } } },
      },
    })
  })

  it("gives the same workflow hash to two runs of one workflow", async () => {
    const { engine } = engineFor([
      comfyV2.upload(),
      comfyV2.submit(),
      comfyV2.upload(),
      comfyV2.submit(),
    ])
    const first = await engine.submit(request)
    const second = await engine.submit({ ...request, seed: 7 })
    expect(second.workflowHash).toBe(first.workflowHash)
  })

  it("refuses a binding whose path names no node, before any request", async () => {
    const binding = comfyWorkflow({
      workflow: { "6": { class_type: "CLIPTextEncode", inputs: { text: "" } } },
      bindings: [
        { from: "input", name: "prompt", path: ["7", "inputs", "text"] },
      ],
    })
    const { engine, replay } = engineFor([])
    await expect(
      engine.submit({ ...request, binding, files: [] })
    ).rejects.toMatchObject({ code: "ENGINE_BINDING_INVALID" })
    expect(replay.sent).toEqual([])
  })

  it.each([
    { status: 401, code: "unauthorized", expected: "ENGINE_KEY_INVALID" },
    {
      status: 402,
      code: "insufficient_credits",
      expected: "ENGINE_NO_CREDITS",
    },
    { status: 422, code: "invalid_workflow", expected: "RUN_INPUT_REFUSED" },
    { status: 422, code: "idempotency_key_reuse", expected: "RUN_FAILED" },
    { status: 500, code: "upstream_error", expected: "ENGINE_UNAVAILABLE" },
  ])("maps a $status $code refusal to $expected", async (refusal) => {
    const { engine } = engineFor([
      comfyV2.refusal(
        "POST",
        `${cloudUrl}/api/v2/jobs`,
        refusal.status,
        refusal.code
      ),
    ])
    await expect(
      engine.submit({ ...request, files: [], inputs: { prompt: "x" } })
    ).rejects.toMatchObject({ code: refusal.expected })
  })

  it("carries the Retry-After of a full queue", async () => {
    const { engine } = engineFor([
      comfyV2.refusal(
        "POST",
        `${cloudUrl}/api/v2/jobs`,
        429,
        "queue_full",
        "30"
      ),
    ])
    await expect(
      engine.submit({ ...request, files: [], inputs: { prompt: "x" } })
    ).rejects.toMatchObject({
      code: "ENGINE_RATE_LIMITED",
      status: 429,
      retryAfterSeconds: 30,
    })
  })

  it("reports a network failure as an engine that did not answer", async () => {
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: async () => {
        throw new TypeError("fetch failed")
      },
    })
    await expect(engine.read(jobId)).rejects.toMatchObject({
      code: "ENGINE_UNAVAILABLE",
    })
  })

  it.each([
    { job: failedJob, expected: { state: "failed", code: "RUN_FAILED" } },
    {
      job: refusedJob,
      expected: { state: "failed", code: "RUN_INPUT_REFUSED" },
    },
    {
      job: { ...queuedJob, status: "expired" },
      expected: { state: "failed", code: "RUN_FAILED" },
    },
    {
      job: { ...queuedJob, status: "canceled" },
      expected: { state: "cancelled" },
    },
    {
      job: { ...queuedJob, status: "canceling" },
      expected: { state: "running" },
    },
  ])(
    "reads a $job.status job as $expected.state",
    async ({ job, expected }) => {
      const { engine } = engineFor([comfyV2.read(job)])
      const status = await engine.read(jobId)
      expect(status.state).toBe(expected.state)
      if (status.state === "failed") {
        expect(status.error.code).toBe(expected.code)
      }
    }
  )

  it("keeps Comfy's message and the node that failed on the cause of a failed run, and leaves out the traceback", async () => {
    const { engine } = engineFor([comfyV2.read(failedJob)])
    const status = await engine.read(jobId)
    if (status.state !== "failed") {
      throw new Error("The job did not read as failed")
    }
    expect(status.error.cause).toEqual({
      code: "node_execution_error",
      message: "KSampler raised an error",
      node_id: "3",
      class_type: "KSampler",
    })
  })

  it("lists media outputs and leaves out latents", async () => {
    const { engine } = engineFor([
      comfyV2.read(succeededJob),
      comfyV2.content(),
    ])
    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({ kind: "image", mime: "image/png" })
    expect(outputs[0]?.bytes).toEqual(pngBytes())
  })

  it("lists a video that Comfy types as an image by its content type", async () => {
    const video = {
      node_id: "75",
      name: "video/rosesfield-effects_00001_.mp4",
      type: "image",
      content_type: "video/mp4",
      size_bytes: 3033478,
      id: outputId,
      hash: null,
      url: `https://storage.comfy.org/signed/${outputId}`,
      url_expires_at: "2026-10-19T13:16:19Z",
      job_id: jobId,
    }
    const { engine } = engineFor([
      comfyV2.read({ ...succeededJob, outputs: [video] }),
      comfyV2.content(),
    ])
    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({ kind: "video", mime: "video/mp4" })
  })

  it.each([
    { type: "3d", content_type: "application/octet-stream", name: "mesh" },
    { type: "model", content_type: "model/gltf-binary", name: "mesh" },
    { type: "file", content_type: "application/octet-stream", name: "a.glb" },
  ])("keeps a GLB a graph saves as a mesh: %j", async (listed) => {
    const glb = {
      ...listed,
      node_id: "60",
      size_bytes: 28,
      id: outputId,
      hash: null,
      url: `https://storage.comfy.org/signed/${outputId}`,
      url_expires_at: "2026-10-22T13:16:19Z",
      job_id: jobId,
    }
    const { engine } = engineFor([
      comfyV2.read({ ...succeededJob, outputs: [glb] }),
      { ...comfyV2.content(), bytes: glbBytes() },
    ])
    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({
      kind: "mesh",
      mime: "model/gltf-binary",
      width: null,
      height: null,
    })
  })

  it("stores each output with the width and height its file shows", async () => {
    const video = {
      node_id: "75",
      name: "video/rosesfield-video_00001_.mp4",
      type: "video",
      content_type: "video/mp4",
      size_bytes: 4096,
      id: outputId,
      hash: null,
      url: `https://storage.comfy.org/signed/${outputId}`,
      url_expires_at: "2026-10-19T13:16:19Z",
      job_id: jobId,
    }
    const { engine } = engineFor([
      comfyV2.read({ ...succeededJob, outputs: [video] }),
      {
        ...comfyV2.content(),
        bytes: writeFlatMp4({ width: 36, height: 64, seconds: 1 }),
      },
    ])
    const [output] = await engine.listOutputs(jobId)
    expect(output).toMatchObject({ kind: "video", width: 36, height: 64 })
  })

  it("refuses a job answer that breaks the published shape", async () => {
    const { engine } = engineFor([
      comfyV2.read({ id: jobId, status: "paused" }),
    ])
    await expect(engine.read(jobId)).rejects.toMatchObject({
      code: "ENGINE_UNAVAILABLE",
    })
  })

  it("reaches a ComfyUI behind comfy-api-proxy with no key", async () => {
    const proxy = comfyV2At(proxyUrl)
    const replay = new ReplayFetch([proxy.upload(), proxy.submit()])
    const engine = new ComfyGenerationEngine({
      apiKey: null,
      baseUrl: proxyUrl,
      fetch: replay.fetch,
    })
    await engine.submit(request)
    expect(
      replay.sent.map((sent) => sent.headers.get("Authorization"))
    ).toEqual([null, null])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(
      request.idempotencyKey
    )
  })

  it.each([
    { status: 404, code: "not_found", expected: "valid" },
    { status: 401, code: "unauthorized", expected: "invalid" },
    { status: 403, code: "forbidden", expected: "invalid" },
    { status: 429, code: "rate_limited", expected: "unreachable" },
    { status: 500, code: "upstream_error", expected: "unreachable" },
  ])(
    "reads a $status key check as $expected",
    async ({ status, code, expected }) => {
      const { engine } = engineFor([comfyV2.keyCheck(status, code)])
      expect(await engine.checkKey()).toBe(expected)
    }
  )

  it("reads a key check that reaches no server as unreachable", async () => {
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: async () => {
        throw new TypeError("fetch failed")
      },
    })
    expect(await engine.checkKey()).toBe("unreachable")
  })

  it("makes one output per job only when the binding says so", () => {
    const { engine } = engineFor([])
    const perOutput = comfyWorkflow({
      workflow: { "6": { class_type: "CLIPTextEncode", inputs: { text: "" } } },
      bindings: [],
      outputsPerJob: "one",
    })
    expect(engine.outputsPerJob(workflowBinding)).toBe("all")
    expect(engine.outputsPerJob(perOutput)).toBe("one")
  })

  it("refuses a binding that makes one output per job and binds a count", () => {
    const { engine } = engineFor([])
    const contradiction = comfyWorkflow({
      workflow: { "5": { class_type: "EmptyLatentImage", inputs: {} } },
      bindings: [{ from: "count", path: ["5", "inputs", "batch_size"] }],
      outputsPerJob: "one",
    })
    expect(() => engine.outputsPerJob(contradiction)).toThrow(
      "A workflow that makes one output per job binds no count"
    )
  })
})
