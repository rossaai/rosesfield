import {
  ComfyGenerationEngine,
  type GenerationEngine,
  RunPodServerlessGenerationEngine,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { findWorkflow, type Workflow } from "#list-workflows"
import { summaryOf } from "../../../../scripts/first-light/first-light"
import { sampleText } from "../../../../scripts/first-light/first-light-request"
import {
  type Report,
  runWorkflow,
} from "../../../../scripts/first-light/first-light-run"
import {
  type FirstLightTarget,
  readTarget,
} from "../../../../scripts/first-light/first-light-target"
import {
  type Recording,
  ReplayFetch,
} from "../../../generation/test/infrastructure/replay-fetch"
import {
  cloudUrl,
  comfy,
  endpointId,
  pngBytes,
  runPod,
  uploadedId,
} from "./first-light-recordings"

const comfyTarget: FirstLightTarget = {
  kind: "comfy",
  label: "Comfy API v2 at https://cloud.comfy.org",
  baseUrl: cloudUrl,
  apiKey: "comfyui-test",
}

const runPodTarget: FirstLightTarget = {
  kind: "runpod",
  label: `RunPod Serverless endpoint ${endpointId}`,
  endpointId,
  apiKey: "runpod-test",
}

function workflowOf(id: string): Workflow {
  const workflow = findWorkflow(id)
  if (workflow === null) {
    throw new Error(`workflows/${id} is not listed`)
  }
  return workflow
}

type Bench = {
  replay: ReplayFetch
  waits: number[]
  run: (workflow: Workflow, samples?: object) => Promise<Report>
}

function bench(
  target: FirstLightTarget,
  recordings: readonly Recording[],
  clock: { step: number; timeoutSeconds?: number } = { step: 1000 }
): Bench {
  const replay = new ReplayFetch(recordings)
  const engine: GenerationEngine =
    target.kind === "comfy"
      ? new ComfyGenerationEngine({
          apiKey: target.apiKey,
          fetch: replay.fetch,
        })
      : new RunPodServerlessGenerationEngine({
          apiKey: target.apiKey,
          endpointId: target.endpointId,
          fetch: replay.fetch,
        })
  const waits: number[] = []
  let time = Date.parse("2026-10-17T09:00:00.000Z")
  let ids = 0
  return {
    replay,
    waits,
    run: async (workflow, samples = {}) =>
      (
        await runWorkflow({
          engine,
          target,
          workflow,
          samples,
          sampleText,
          values: {},
          now: () => {
            time += clock.step
            return time
          },
          sleep: async (milliseconds) => {
            waits.push(milliseconds)
          },
          fetch: replay.fetch,
          pollSeconds: 5,
          timeoutSeconds: clock.timeoutSeconds ?? 1800,
          newId: () =>
            `0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e${String(ids++).padStart(2, "0")}`,
        })
      ).report,
  }
}

function sentWorkflow(
  replay: ReplayFetch
): Record<string, { inputs: Record<string, unknown> }> {
  const job = replay.sent.find((one) => one.url === `${cloudUrl}/api/v2/jobs`)
  return JSON.parse(job?.body ?? "{}").workflow
}

describe("first-light's engine target", () => {
  it("refuses to start with no key and names the missing variable", () => {
    expect(readTarget({})).toMatchObject({
      ok: false,
      problem: expect.stringMatching(/^COMFY_API_KEY is missing/),
    })
    expect(readTarget({ RUNPOD_ENDPOINT_ID: endpointId })).toMatchObject({
      ok: false,
      problem: expect.stringMatching(/^RUNPOD_API_KEY is missing/),
    })
    expect(
      readTarget({
        COMFY_BASE_URL: "http://127.0.0.1:8189",
        RUNPOD_ENDPOINT_ID: "x",
      })
    ).toMatchObject({ ok: false, problem: expect.stringContaining("both set") })
    expect(readTarget({ COMFY_API_KEY: "  " })).toMatchObject({ ok: false })
  })

  it("names Comfy Cloud for a key alone and your own URL when one is set", () => {
    expect(readTarget({ COMFY_API_KEY: "k" })).toEqual({
      ok: true,
      target: {
        kind: "comfy",
        label: `Comfy API v2 at ${cloudUrl}`,
        baseUrl: cloudUrl,
        apiKey: "k",
      },
    })
    expect(
      readTarget({ RUNPOD_API_KEY: "r", RUNPOD_ENDPOINT_ID: endpointId })
    ).toMatchObject({ ok: true, target: { kind: "runpod", endpointId } })
  })
})

describe("one first-light run against recorded responses", () => {
  it("reports the time, the GPU seconds and the output of a Comfy run", async () => {
    const { replay, waits, run } = bench(comfyTarget, [
      comfy.submit(),
      comfy.running(),
      comfy.succeeded(),
      comfy.succeeded(),
      comfy.content(),
      comfy.succeeded(),
    ])
    const report = await run(workflowOf("image-z-image-turbo"))
    expect(report).toMatchObject({
      workflow: "image-z-image-turbo",
      status: "succeeded",
      reason: null,
      seconds: 2,
      queueSeconds: 9,
      gpuSeconds: 42,
      cost: null,
      outputs: [
        {
          file: "image-z-image-turbo-1.png",
          kind: "image",
          mime: "image/png",
          bytes: pngBytes.length,
        },
      ],
    })
    expect(waits).toEqual([5000])
    expect(sentWorkflow(replay)["27"]?.inputs.text).toBe(sampleText)
    expect(replay.sent[0]?.headers.get("Idempotency-Key")).toBe(
      report.idempotencyKey
    )
    expect(replay.unused()).toEqual([])
  })

  it("records the cost when the job's metrics carry one", async () => {
    const { run } = bench(comfyTarget, [
      comfy.submit(),
      comfy.succeeded(),
      comfy.succeeded(),
      comfy.content(),
      comfy.succeeded({ queue_ms: null, execution_ms: 41000, credits: 11 }),
    ])
    const report = await run(workflowOf("image-z-image-turbo"))
    expect(report).toMatchObject({
      gpuSeconds: 41,
      queueSeconds: null,
      cost: { credits: 11 },
    })
  })

  it("uploads the sample photo a workflow takes and skips one with no sample", async () => {
    const skipped = await bench(comfyTarget, []).run(
      workflowOf("background-removal-transparent")
    )
    expect(skipped).toMatchObject({ status: "skipped", ref: null })
    expect(skipped.reason).toContain("image.*")
    const { replay, run } = bench(comfyTarget, [
      comfy.upload(),
      comfy.submit(),
      comfy.succeeded(),
      comfy.succeeded(),
      comfy.content(),
      comfy.succeeded(),
    ])
    const report = await run(workflowOf("background-removal-transparent"), {
      image: { mime: "image/png", bytes: pngBytes },
    })
    expect(report.status).toBe("succeeded")
    expect(sentWorkflow(replay)["1"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
  })

  it("records a failed run with the engine's code", async () => {
    const { run } = bench(comfyTarget, [
      comfy.submit(),
      comfy.failed(),
      comfy.failed(),
    ])
    const report = await run(workflowOf("image-z-image-turbo"))
    expect(report.status).toBe("failed")
    expect(report.reason).toMatch(/^[A-Z_]+: /)
    expect(report.outputs).toEqual([])
  })

  it("cancels a run that passes the time bound", async () => {
    const { replay, run } = bench(
      comfyTarget,
      [
        comfy.submit(),
        comfy.running(),
        comfy.running(),
        comfy.cancel(),
        comfy.running(),
      ],
      { step: 400_000, timeoutSeconds: 600 }
    )
    const report = await run(workflowOf("image-z-image-turbo"))
    expect(report.status).toBe("timed-out")
    expect(replay.sent.some((one) => one.url.endsWith("/cancel"))).toBe(true)
  })

  it("reads the GPU seconds of a RunPod run from its executionTime", async () => {
    const { run } = bench(runPodTarget, [
      runPod.run(),
      runPod.running(),
      runPod.completed(),
      runPod.completed(),
      runPod.completed(),
    ])
    const report = await run(workflowOf("image-z-image-turbo"))
    expect(report).toMatchObject({
      status: "succeeded",
      gpuSeconds: 1.437,
      queueSeconds: 2.624,
      cost: null,
      engine: `RunPod Serverless endpoint ${endpointId}`,
    })
    expect(report.outputs).toHaveLength(1)
  })

  it("writes a summary row for each report", () => {
    const report: Report = {
      workflow: "voice-chatterbox",
      engine: comfyTarget.label,
      status: "succeeded",
      reason: null,
      startedAt: null,
      finishedAt: null,
      seconds: 12,
      queueSeconds: 2,
      gpuSeconds: 8,
      cost: null,
      metricsSource: null,
      idempotencyKey: null,
      ref: null,
      workflowHash: null,
      outputs: [],
    }
    expect(summaryOf([report])).toContain(
      "| `voice-chatterbox` | succeeded | 12 | 8 | not reported | 0 |"
    )
  })
})
