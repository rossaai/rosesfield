import { describe, expect, it } from "vitest"
import type { EngineRequest } from "#domain/generation-engine.port"
import { RunPodServerlessGenerationEngine } from "#infrastructure/runpod-serverless-generation-engine"
import { pngBytes, referenceId } from "../sample"
import { workflowBinding } from "./fixtures/comfy-v2"
import {
  endpointId,
  endpointUrl,
  outputUrl,
  runPod,
  runPodJobId,
} from "./fixtures/runpod-serverless"
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
  timeoutSeconds: 900,
}

function engineFor(recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new RunPodServerlessGenerationEngine({
    apiKey: "rpa_test",
    endpointId,
    fetch: replay.fetch,
  })
  return { engine, replay }
}

function sentBody(replay: ReplayFetch): Record<string, unknown> {
  return JSON.parse(replay.sent[0]?.body ?? "{}")
}

describe("RunPodServerlessGenerationEngine", () => {
  it("sends the filled workflow, its input files and the run's limit", async () => {
    const { engine, replay } = engineFor([runPod.run()])
    const submission = await engine.submit(request)
    expect(submission.ref).toBe(runPodJobId)
    expect(submission.models).toEqual(["sample-model.safetensors"])
    expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
    const sent = replay.sent[0]
    expect(sent?.url).toBe(`${endpointUrl}/run`)
    expect(sent?.headers.get("Authorization")).toBe("Bearer rpa_test")
    expect(sentBody(replay)).toMatchObject({
      input: {
        workflow: {
          "3": { inputs: { seed: 42 } },
          "6": { inputs: { text: "a red door in fog" } },
          "10": { inputs: { image: `${referenceId}.png` } },
        },
        images: [
          {
            name: `${referenceId}.png`,
            image: btoa(String.fromCharCode(...pngBytes())),
          },
        ],
      },
      policy: { executionTimeout: 900_000, ttl: 900_000 },
    })
  })

  it("sends a run with no files and no limit with the default limit", async () => {
    const { engine, replay } = engineFor([runPod.run()])
    const { timeoutSeconds: _, ...bare } = request
    await engine.submit({ ...bare, files: [], inputs: { prompt: "a door" } })
    const body = sentBody(replay)
    expect(body.policy).toEqual({ executionTimeout: 600_000, ttl: 600_000 })
    expect(body.input).not.toHaveProperty("images")
  })

  it("refuses a request above 10 MB before it sends anything", async () => {
    const { engine, replay } = engineFor([])
    const bytes = new Uint8Array(8_000_000)
    await expect(
      engine.submit({
        ...request,
        files: [
          { assetId: referenceId, kind: "image", mime: "image/png", bytes },
        ],
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_REFUSED" })
    expect(replay.sent).toEqual([])
  })

  it("sends one /run per submit and no second when it fails", async () => {
    const { engine, replay } = engineFor([
      runPod.refusal(`${endpointUrl}/run`, 502),
    ])
    await expect(engine.submit(request)).rejects.toMatchObject({
      code: "ENGINE_UNAVAILABLE",
    })
    expect(replay.sent).toHaveLength(1)
    expect(engine.idempotency).toBe("none")
  })

  it.each([
    { status: 401, expected: "ENGINE_KEY_INVALID" },
    { status: 400, expected: "RUN_INPUT_REFUSED" },
    { status: 413, expected: "RUN_INPUT_REFUSED" },
    { status: 404, expected: "RUN_FAILED" },
    { status: 500, expected: "ENGINE_UNAVAILABLE" },
  ])("maps a $status answer to $expected", async ({ status, expected }) => {
    const { engine } = engineFor([runPod.refusal(`${endpointUrl}/run`, status)])
    await expect(engine.submit(request)).rejects.toMatchObject({
      code: expected,
    })
  })

  it("carries the Retry-After of a 429", async () => {
    const { engine } = engineFor([
      {
        ...runPod.refusal(`${endpointUrl}/run`, 429),
        headers: { "Retry-After": "12" },
      },
    ])
    await expect(engine.submit(request)).rejects.toMatchObject({
      code: "ENGINE_RATE_LIMITED",
      retryAfterSeconds: 12,
    })
  })

  it.each([
    { status: "IN_QUEUE", expected: "queued" },
    { status: "IN_PROGRESS", expected: "running" },
    { status: "COMPLETED", expected: "succeeded" },
    { status: "CANCELLED", expected: "cancelled" },
    { status: "FAILED", expected: "failed" },
    { status: "TIMED_OUT", expected: "failed" },
  ])("reads a $status job as $expected", async ({ status, expected }) => {
    const { engine } = engineFor([
      runPod.status(
        status,
        status === "FAILED" ? { error: "node 3 failed" } : {}
      ),
    ])
    const read = await engine.read(runPodJobId)
    expect(read.state).toBe(expected)
    if (read.state === "failed") {
      expect(read.error.code).toBe("RUN_FAILED")
    }
  })

  it("reads base64 and bucket outputs, sends no key to the bucket", async () => {
    const { engine, replay } = engineFor([
      runPod.completed({
        images: [
          {
            filename: "ComfyUI_00001_.png",
            type: "base64",
            data: `data:image/png;base64,${btoa(String.fromCharCode(...pngBytes()))}`,
          },
          { filename: "ComfyUI_00001_.mp4", type: "s3_url", data: outputUrl },
          { filename: "ComfyUI_00001_.latent", type: "base64", data: "AAAA" },
        ],
      }),
      runPod.download(),
    ])
    const outputs = await engine.listOutputs(runPodJobId)
    expect(outputs.map((output) => [output.kind, output.mime])).toEqual([
      ["image", "image/png"],
      ["video", "video/mp4"],
    ])
    expect(outputs[0]?.bytes).toEqual(pngBytes())
    expect(outputs[1]?.bytes.length).toBe(8)
    const download = replay.sent.find((sent) => sent.url === outputUrl)
    expect(download?.headers.get("Authorization")).toBeNull()
  })

  it("lists no output for a run whose worker returned no images", async () => {
    const { engine } = engineFor([runPod.completed({ images: [] })])
    expect(await engine.listOutputs(runPodJobId)).toEqual([])
  })

  it("refuses a status answer that breaks the published shape", async () => {
    const { engine } = engineFor([runPod.status("PAUSED")])
    await expect(engine.read(runPodJobId)).rejects.toMatchObject({
      code: "ENGINE_UNAVAILABLE",
    })
  })

  it.each([
    { status: 200, expected: "valid" },
    { status: 401, expected: "invalid" },
    { status: 404, expected: "invalid" },
    { status: 500, expected: "unreachable" },
  ])(
    "reads a $status health answer as $expected",
    async ({ status, expected }) => {
      const { engine, replay } = engineFor([runPod.health(status)])
      expect(await engine.checkKey()).toBe(expected)
      expect(replay.sent[0]?.headers.get("Authorization")).toBe(
        "Bearer rpa_test"
      )
    }
  )

  it("reads a key check that reaches no server as unreachable", async () => {
    const engine = new RunPodServerlessGenerationEngine({
      apiKey: "rpa_test",
      endpointId,
      fetch: async () => {
        throw new TypeError("fetch failed")
      },
    })
    expect(await engine.checkKey()).toBe("unreachable")
  })
})
