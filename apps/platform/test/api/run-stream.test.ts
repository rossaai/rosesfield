import { type Run, run } from "@rosesfield/contract"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runQuery, runsQuery } from "@/api/queries"
import { type Wait, watchRunStream } from "@/api/run-stream"

const runId = "12982553-b781-4739-b338-a325bcd075e8"
const eventsPath = `/api/runs/${runId}/events`

afterEach(() => {
  vi.unstubAllGlobals()
})

function runOf(status: Run["status"], progress: number | null): Run {
  const isEnded = status !== "queued" && status !== "running"
  return run.parse({
    id: runId,
    appId: "image",
    status,
    inputs: { prompt: "a door" },
    count: 1,
    aspectRatio: "3:4",
    seed: 7,
    outputs: status === "done" ? ["562a2fed-3919-423e-af30-3e8b95c05e40"] : [],
    progress,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T22:54:53.722Z",
    finishedAt: isEnded ? "2026-10-20T22:55:10.000Z" : null,
  })
}

function streamOf(runs: readonly Run[]): Response {
  const text = runs
    .map((one) => `event: run\ndata: ${JSON.stringify({ run: one })}\n\n`)
    .join("")
  return new Response(`: keepalive\n\n${text}`, {
    headers: { "Content-Type": "text/event-stream" },
  })
}

type Sent = { url: string; headers: Headers }

function answer(responses: Array<() => Response>): Sent[] {
  const sent: Sent[] = []
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    sent.push({ url: input, headers: new Headers(init?.headers) })
    const next = responses.shift()
    if (next === undefined) {
      throw new Error(`No answer for ${input}`)
    }
    return next()
  })
  return sent
}

function progressOf(runs: readonly Run[]): (number | string | null)[] {
  return runs.map((one) => (one.status === "done" ? "done" : one.progress))
}

describe("watchRunStream", () => {
  it("hands each frame of one stream to the page and stops at the run's end", async () => {
    const sent = answer([
      () =>
        streamOf([
          runOf("queued", null),
          runOf("running", 0.25),
          runOf("done", 1),
        ]),
    ])
    const seen: Run[] = []

    await watchRunStream({
      runId,
      signal: new AbortController().signal,
      onRun: (one) => seen.push(one),
    })

    expect(progressOf(seen)).toEqual([null, 0.25, "done"])
    expect(sent.map((one) => one.url)).toEqual([eventsPath])
    expect(sent[0]?.headers.get("Accept")).toBe("text/event-stream")
  })

  it("opens the stream again when it drops, and takes the run's state from its first frame", async () => {
    const sent = answer([
      () => streamOf([runOf("running", 0.2), runOf("running", 0.4)]),
      () => streamOf([runOf("running", 0.7), runOf("done", 1)]),
    ])
    const seen: Run[] = []

    await watchRunStream({
      runId,
      signal: new AbortController().signal,
      onRun: (one) => seen.push(one),
    })

    expect(progressOf(seen)).toEqual([0.2, 0.4, 0.7, "done"])
    expect(sent.map((one) => one.url)).toEqual([eventsPath, eventsPath])
  })

  it("reads the run once after 3 failed opens in a row and tries the stream again 10 s later", async () => {
    const refused = () => Response.json({}, { status: 503 })
    const sent = answer([
      refused,
      refused,
      refused,
      () => Response.json({ run: runOf("running", 0.5) }),
      () => streamOf([runOf("done", 1)]),
    ])
    const waited: number[] = []
    const wait: Wait = async (ms) => {
      waited.push(ms)
    }
    const seen: Run[] = []

    await watchRunStream({
      runId,
      signal: new AbortController().signal,
      onRun: (one) => seen.push(one),
      wait,
    })

    expect(sent.map((one) => one.url)).toEqual([
      eventsPath,
      eventsPath,
      eventsPath,
      `/api/runs/${runId}`,
      eventsPath,
    ])
    expect(waited).toEqual([10_000])
    expect(progressOf(seen)).toEqual([0.5, "done"])
  })

  it("stops when the gateway does not hold the run", async () => {
    const sent = answer([
      () =>
        Response.json(
          { error: { code: "RUN_NOT_FOUND", status: 404 } },
          { status: 404 }
        ),
    ])

    await watchRunStream({
      runId,
      signal: new AbortController().signal,
      onRun: () => undefined,
    })

    expect(sent).toHaveLength(1)
  })
})

describe("the run queries", () => {
  it("poll neither the run list nor a run on a timer", () => {
    expect(runsQuery(null).refetchInterval).toBeUndefined()
    expect(runQuery(runId).refetchInterval).toBeUndefined()
  })
})
