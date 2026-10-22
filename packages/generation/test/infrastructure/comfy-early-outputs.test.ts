import { describe, expect, it } from "vitest"
import type { EngineStatus } from "#domain/generation-engine.port"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import {
  cloudUrl,
  comfyV2,
  jobId,
  outputId,
  succeededJob,
} from "./fixtures/comfy-v2"
import { type Recording, ReplayFetch } from "./replay-fetch"

type Frame = { event: string; data: Record<string, unknown> }

const eventsUrl = `${cloudUrl}/api/v2/jobs/${jobId}/events`
const contentUrl = `${cloudUrl}/api/v2/assets/${outputId}/content`
const jobUrl = `${cloudUrl}/api/v2/jobs/${jobId}`

const outputFrame: Frame = {
  event: "output",
  data: {
    id: outputId,
    node_id: "9",
    name: "ComfyUI_00001_.png",
    type: "image",
    content_type: "image/png",
  },
}

const doneFrame: Frame = {
  event: "status",
  data: { status: "succeeded", queue_position: null },
}

function dataOf(frame: Frame): string {
  return JSON.stringify(frame.data)
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
    bytes: new TextEncoder().encode(text),
  }
}

function engineWith(recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  return { engine, replay }
}

async function watchAll(
  engine: ComfyGenerationEngine
): Promise<EngineStatus[]> {
  const statuses: EngineStatus[] = []
  const signal = new AbortController().signal
  for await (const status of engine.watch(jobId, signal)) {
    statuses.push(status)
  }
  return statuses
}

function sentTo(replay: ReplayFetch, url: string): number {
  return replay.sent.filter((one) => one.url === url).length
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("ComfyGenerationEngine, the outputs of a finished job", () => {
  it("starts downloading an output on its output event, before the outputs are listed", async () => {
    const { engine, replay } = engineWith([
      eventStream([outputFrame, doneFrame]),
      comfyV2.read(succeededJob),
      comfyV2.content(),
    ])

    const statuses = await watchAll(engine)
    await settle()

    expect(statuses.at(-1)?.state).toBe("succeeded")
    expect(sentTo(replay, contentUrl)).toBe(1)

    const outputs = await engine.listOutputs(jobId)
    expect(outputs.map((one) => [one.kind, one.mime])).toEqual([
      ["image", "image/png"],
    ])
    expect(sentTo(replay, contentUrl)).toBe(1)
    expect(sentTo(replay, jobUrl)).toBe(1)
    expect(replay.unused()).toEqual([])
  })

  it("lists the outputs from the terminal status it read, and downloads the one no event named", async () => {
    const { engine, replay } = engineWith([
      eventStream([doneFrame]),
      comfyV2.read(succeededJob),
      comfyV2.content(),
    ])

    await watchAll(engine)
    await settle()
    expect(sentTo(replay, contentUrl)).toBe(0)

    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(sentTo(replay, contentUrl)).toBe(1)
    expect(sentTo(replay, jobUrl)).toBe(1)
    expect(replay.unused()).toEqual([])
  })

  it("downloads an output again at the list when its early download failed", async () => {
    const { engine, replay } = engineWith([
      eventStream([outputFrame, doneFrame]),
      comfyV2.read(succeededJob),
      comfyV2.refusal("GET", contentUrl, 404, "not_found"),
      comfyV2.content(),
    ])

    await watchAll(engine)
    await settle()

    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(sentTo(replay, contentUrl)).toBe(2)
    expect(replay.unused()).toEqual([])
  })
})
