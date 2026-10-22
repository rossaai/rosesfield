import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type {
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { ComfyRouterGenerationEngine } from "#infrastructure/comfy-router-generation-engine"
import { DemoGenerationEngine } from "#infrastructure/demo-generation-engine"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import type { Timer } from "#infrastructure/timer-job-runner"
import { start } from "../sample"
import {
  cloudUrl,
  comfyV2,
  jobId,
  runningJob,
  succeededJob,
} from "./fixtures/comfy-v2"
import { pictureModel, queueStatus, requestId } from "./fixtures/comfy-router"
import { type Recording, ReplayFetch } from "./replay-fetch"

type Frame = { event: string; data: Record<string, unknown> }

const eventsUrl = `${cloudUrl}/api/v2/jobs/${jobId}/events`

const spikeFrames: Frame[] = [
  { event: "status", data: { status: "queued", queue_position: null } },
  { event: "progress", data: { value: 0, nodes_done: 0, nodes_total: 1 } },
  { event: "preview", data: { node_id: "9", data_base64: "/9j/4AAQ" } },
  {
    event: "progress",
    data: { value: 0.8125, nodes_done: 1, nodes_total: 2 },
  },
  { event: "progress", data: { value: 1, nodes_done: 2, nodes_total: 2 } },
  { event: "progress", data: { value: 1, nodes_done: 4, nodes_total: 4 } },
  { event: "status", data: { status: "succeeded", queue_position: null } },
]

function dataOf(frame: Frame): string {
  return JSON.stringify(frame.data)
}

function progressOf(status: EngineStatus): number | null | "end" {
  return "progress" in status ? status.progress : "end"
}

function eventStream(frames: readonly Frame[]): Recording {
  const text = frames
    .map((frame) => `event: ${frame.event}\ndata: ${dataOf(frame)}\n\n`)
    .join("")
  return {
    method: "GET",
    url: eventsUrl,
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
    bytes: new TextEncoder().encode(`: keepalive\n\n${text}`),
  }
}

function countingTimer(onWait: (ms: number) => void = () => undefined): {
  timer: Timer
  asked: number[]
} {
  const asked: number[] = []
  return {
    asked,
    timer: {
      after: (ms, callback) => {
        asked.push(ms)
        onWait(ms)
        queueMicrotask(callback)
        return () => undefined
      },
    },
  }
}

async function statusesOf(
  engine: GenerationEngine,
  ref: string
): Promise<EngineStatus[]> {
  const statuses: EngineStatus[] = []
  for await (const status of engine.watch(ref, new AbortController().signal)) {
    statuses.push(status)
  }
  return statuses
}

function comfyWith(recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const waits = countingTimer()
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
    timer: waits.timer,
  })
  return { engine, replay, asked: waits.asked }
}

describe("ComfyGenerationEngine.watch", () => {
  it("relays the job's event stream with the key and reads the job once at its terminal status", async () => {
    const { engine, replay } = comfyWith([
      eventStream(spikeFrames),
      comfyV2.read(succeededJob),
    ])

    const statuses = await statusesOf(engine, jobId)

    expect(statuses.map((one) => [one.state, progressOf(one)])).toEqual([
      ["queued", null],
      ["running", 0],
      ["running", 0.8125],
      ["running", 1],
      ["running", 1],
      ["succeeded", "end"],
    ])
    expect(replay.sent[0]?.headers.get("Authorization")).toBe(
      "Bearer comfyui-test"
    )
    expect(replay.sent[0]?.headers.get("Accept")).toBe("text/event-stream")
    expect(replay.unused()).toEqual([])
  })

  it("ends without a read when the stream closes before a terminal status", async () => {
    const cut = eventStream(spikeFrames.slice(0, 4))
    const { engine, replay } = comfyWith([cut])

    const statuses = await statusesOf(engine, jobId)

    expect(statuses.map((one) => one.state)).toEqual([
      "queued",
      "running",
      "running",
    ])
    expect(replay.sent).toHaveLength(1)
  })

  it("reads the job every 2 s when the deployment sends no event stream", async () => {
    const { engine, asked } = comfyWith([
      comfyV2.refusal("GET", eventsUrl, 501, "not_implemented"),
      comfyV2.read(runningJob),
      comfyV2.read(succeededJob),
    ])

    const statuses = await statusesOf(engine, jobId)

    expect(statuses.map((one) => one.state)).toEqual(["running", "succeeded"])
    expect(asked).toEqual([2000])
  })
})

describe("ComfyRouterGenerationEngine.watch", () => {
  it("reads a hosted model's status every 2 s until it ends", async () => {
    const replay = new ReplayFetch([
      queueStatus("IN_QUEUE"),
      queueStatus("IN_PROGRESS"),
      queueStatus("COMPLETED"),
    ])
    const waits = countingTimer()
    const engine = new ComfyRouterGenerationEngine({
      apiKey: "key",
      catalog: new RouterCatalog({ clock: new FixedClock({ now: start }) }),
      fetch: replay.fetch,
      timer: waits.timer,
    })

    const statuses = await statusesOf(
      engine,
      `${pictureModel}|queued|${requestId}`
    )

    expect(statuses.map((one) => one.state)).toEqual([
      "queued",
      "running",
      "succeeded",
    ])
    expect(waits.asked).toEqual([2000, 2000])
  })
})

describe("DemoGenerationEngine.watch", () => {
  it("sends a frame every 250 ms until its run is done", async () => {
    const clock = new FixedClock({ now: start })
    const waits = countingTimer((ms) => clock.advance(ms))
    const engine = new DemoGenerationEngine({ clock, timer: waits.timer })
    const submission = await engine.submit({
      idempotencyKey: "demo-key",
      binding: { adapter: "demo", config: {} },
      inputs: {},
      files: [],
      count: 1,
      aspectRatio: null,
      seed: null,
      outputKind: "image",
    })

    const statuses = await statusesOf(engine, submission.ref)

    expect(statuses).toHaveLength(13)
    expect(statuses.at(6)).toEqual({
      state: "running",
      progress: 0.5,
      retryAfterSeconds: 1,
    })
    expect(statuses.at(-1)).toEqual({ state: "succeeded" })
    expect(new Set(waits.asked)).toEqual(new Set([250]))
  })
})
