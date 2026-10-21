import { type Asset, assetId, type Run, runId } from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { GatewaySpeechChain } from "@/studio/lipsync/gateway-speech-chain"

const realFetch = globalThis.fetch

const speechRun = runId.parse("4d5e6f7a-8b9c-4d0e-9f1a-3b4c5d6e7f80")

const spoken = assetId.parse("5e6f7a8b-9c0d-4e1f-8a2b-4c5d6e7f8091")

type Sent = { url: string; init: RequestInit | undefined }

function runOf(status: Run["status"]): Run {
  return {
    id: speechRun,
    appId: "audio",
    status,
    inputs: { model: "chatterbox", script: "Hello there" },
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: status === "done" ? [spoken] : [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: status === "done" ? { amount: 0.02, currency: "USD" } : null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-21T10:00:00.000Z",
    finishedAt: null,
  }
}

const audioAsset: Asset = {
  id: spoken,
  kind: "audio",
  mime: "audio/wav",
  bytes: 4096,
  width: null,
  height: null,
  durationSeconds: 5.2,
  sourceRunId: speechRun,
  createdAt: "2026-10-21T10:00:05.000Z",
}

function answer(respond: (url: string) => Response): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    sent.push({ url: String(input), init })
    return respond(String(input))
  }
  return sent
}

type Watched = {
  chain: GatewaySpeechChain
  waits: number[]
  seen: Run[]
}

function chainOf(): Watched {
  const waits: number[] = []
  const seen: Run[] = []
  const chain = new GatewaySpeechChain({
    wait: async (ms) => {
      waits.push(ms)
    },
    onRun: (run) => seen.push(run),
  })
  return { chain, waits, seen }
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("the speech chain over the gateway's run API", () => {
  it("starts a run under the key of the press and sends no aspect ratio when none is set", async () => {
    const sent = answer(() =>
      Response.json({ run: runOf("queued") }, { status: 202 })
    )
    const { chain, seen } = chainOf()
    const run = await chain.start(
      "audio",
      {
        inputs: { model: "chatterbox", script: "Hello there" },
        aspectRatio: null,
      },
      "press-1-speech"
    )
    expect(sent[0]?.url).toBe("/api/apps/audio/runs")
    expect(sent[0]?.init?.method).toBe("POST")
    const headers = new Headers(sent[0]?.init?.headers)
    expect(headers.get("Idempotency-Key")).toBe("press-1-speech")
    expect(JSON.parse(String(sent[0]?.init?.body))).toEqual({
      inputs: { model: "chatterbox", script: "Hello there" },
    })
    expect(run.status).toBe("queued")
    expect(seen.map((one) => one.id)).toEqual([speechRun])
  })

  it("sends the aspect ratio of the video run", async () => {
    const sent = answer(() =>
      Response.json({ run: runOf("queued") }, { status: 202 })
    )
    const { chain } = chainOf()
    await chain.start(
      "lipsync",
      { inputs: { audio: [spoken] }, aspectRatio: "1:1" },
      "press-1-video"
    )
    expect(JSON.parse(String(sent[0]?.init?.body))).toEqual({
      inputs: { audio: [spoken] },
      aspectRatio: "1:1",
    })
  })

  it("reads the run once a second until it ends", async () => {
    const statuses: Run["status"][] = ["running", "done"]
    const sent = answer(() =>
      Response.json({ run: runOf(statuses.shift() ?? "done") })
    )
    const { chain, waits } = chainOf()
    const settled = await chain.settle(runOf("queued"))
    expect(settled.status).toBe("done")
    expect(settled.outputs).toEqual([spoken])
    expect(waits).toEqual([1000, 1000])
    expect(sent.map((one) => one.url)).toEqual([
      `/api/runs/${speechRun}`,
      `/api/runs/${speechRun}`,
    ])
  })

  it("reads no run that has already ended", async () => {
    const sent = answer(() => Response.json({ run: runOf("done") }))
    const { chain, waits } = chainOf()
    const settled = await chain.settle(runOf("failed"))
    expect(settled.status).toBe("failed")
    expect(waits).toEqual([])
    expect(sent).toEqual([])
  })

  it("stops reading after its last poll and returns the run still working", async () => {
    answer(() => Response.json({ run: runOf("running") }))
    const { chain, waits } = chainOf()
    const settled = await chain.settle(runOf("queued"))
    expect(settled.status).toBe("running")
    expect(waits).toHaveLength(GatewaySpeechChain.maxPolls)
  })

  it("reads the length of the audio the speech made", async () => {
    const sent = answer(() => Response.json({ asset: audioAsset }))
    const { chain } = chainOf()
    expect(await chain.secondsOf(spoken)).toBe(5.2)
    expect(sent[0]?.url).toBe(`/api/assets/${spoken}`)
  })
})
