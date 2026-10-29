import {
  EndKeyLoopHandler,
  motionEndKeySteps,
  readClipOf,
  renderHandOffOf,
} from "@rosesfield/catalog/motion"
import { type Run, runId } from "@rosesfield/contract"
import { type AssetId, appIdFormat, assetIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { GatewayRunChain } from "@/api/gateway-run-chain"
import { GatewayStepPricer } from "@/api/gateway-step-pricer"

const realFetch = globalThis.fetch

function idOf(n: number): AssetId {
  return assetIdFormat.parse(`${n}d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a`)
}

const draftVideo = idOf(1)
const lastFrame = idOf(2)
const endKey = idOf(3)
const finalVideo = idOf(4)
const photo = idOf(5)

const runIds = {
  draft: runId.parse("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"),
  restore: runId.parse("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"),
  final: runId.parse("3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f"),
}

type Stage = keyof typeof runIds

type Sent = { method: string; url: string; key: string | null; body: unknown }

function runOf(stage: Stage, body: unknown): Run {
  const inputs =
    typeof body === "object" && body !== null && "inputs" in body
      ? (body.inputs as Run["inputs"])
      : {}
  const done: Record<Stage, Pick<Run, "outputs" | "held">> = {
    draft: {
      outputs: [draftVideo],
      held: [{ nodeId: "1011", assetId: lastFrame, kind: "image" }],
    },
    restore: {
      outputs: [],
      held: [{ nodeId: "0", assetId: endKey, kind: "image" }],
    },
    final: { outputs: [finalVideo] },
  }
  return {
    id: runIds[stage],
    appId: appIdFormat.parse(stage === "restore" ? "image" : "motion"),
    status: "done",
    inputs,
    count: 1,
    aspectRatio: null,
    seed: 9,
    ...done[stage],
    progress: 1,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: "2026-10-29T10:01:00.000Z",
  }
}

function gateway(): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const body = init?.body === undefined ? null : JSON.parse(String(init.body))
    const key = new Headers(init?.headers).get("Idempotency-Key")
    sent.push({ method: init?.method ?? "GET", url, key, body })
    if (url.endsWith("/price")) {
      return Response.json({ price: { source: "measured", credits: 3.36 } })
    }
    const stage = (["draft", "restore", "final"] as const).find(
      (one) => key?.endsWith(`-${one}`) === true
    )
    if (stage === undefined) {
      return new Response(null, { status: 404 })
    }
    return Response.json({ run: runOf(stage, body) }, { status: 202 })
  }
  return sent
}

function stepsOf() {
  const inputs = renderHandOffOf({
    read: readClipOf([
      { nodeId: "13", assetId: idOf(6), kind: "video" },
      { nodeId: "28", assetId: idOf(7), kind: "video" },
      { nodeId: "31", assetId: idOf(8), kind: "image" },
    ]),
    editedFrame: idOf(9),
    endKey: null,
    plan: {
      targets: [
        { find: "the man", becomes: "the man of photo 1", photos: [0] },
      ],
      editPrompt: "Make the man the man of image 2.",
      scene: "A man walks down a street.",
      unusedPhotos: [],
    },
    quality: "draft",
    seed: 9,
  })
  return motionEndKeySteps({
    inputs,
    photos: [photo],
    aspectRatio: "9:16",
    frameSize: { width: 432, height: 768 },
  })
}

function loopOf(): EndKeyLoopHandler {
  return new EndKeyLoopHandler({
    chain: new GatewayRunChain({
      wait: async () => undefined,
      onRun: () => undefined,
    }),
    prices: new GatewayStepPricer(),
  })
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("the end-key loop over the gateway's start-run route", () => {
  it("starts the draft, then on a yes the held restore, then on a second yes the final, each under its own key", async () => {
    const sent = gateway()
    const loop = loopOf()
    const steps = stepsOf()
    const key = "press-7"
    const made = await loop.draft({ steps, key })
    expect(made).toMatchObject({ frame: lastFrame, awaits: "yes" })
    const restored = await loop.restore({
      steps,
      key,
      draft: made.draft,
      answer: "yes",
    })
    if (restored.status !== "restored") {
      throw new Error(`the restore ended ${restored.status}`)
    }
    const ended = await loop.final({
      steps,
      key,
      draft: made.draft,
      endKey: restored.endKey,
      answer: "yes",
    })
    expect(ended.status === "done" ? ended.final.outputs : []).toEqual([
      finalVideo,
    ])
    const starts = sent.filter((one) => one.method === "POST")
    expect(starts.map((one) => [one.url, one.key])).toEqual([
      ["/api/apps/motion/runs", "press-7-draft"],
      ["/api/apps/image/runs", "press-7-restore"],
      ["/api/apps/motion/runs", "press-7-final"],
    ])
    expect(starts[0]?.body).toMatchObject({
      inputs: { model: "ltx-2-5-guide", resolution: "480p", seed: 9 },
      aspectRatio: "9:16",
    })
    expect(starts[0]?.body).not.toHaveProperty("place")
    expect(starts[1]?.body).toMatchObject({
      inputs: { images: [lastFrame, photo] },
      place: "held",
    })
    expect(starts[2]?.body).toMatchObject({
      inputs: { resolution: "720p", seed: 9, endKey: [endKey] },
    })
  })

  it("starts nothing past the draft without a yes, the control", async () => {
    const sent = gateway()
    const loop = loopOf()
    const steps = stepsOf()
    const made = await loop.draft({ steps, key: "press-8" })
    await loop.restore({
      steps,
      key: "press-8",
      draft: made.draft,
      answer: "not-yet",
    })
    expect(sent.filter((one) => one.method === "POST")).toHaveLength(1)
  })

  it("prices the draft and Make final through the price route", async () => {
    const sent = gateway()
    const loop = loopOf()
    const steps = stepsOf()
    expect(await loop.priceDraft(steps)).toEqual({
      source: "measured",
      credits: 3.36,
    })
    const made = await loop.draft({ steps, key: "press-9" })
    const sum = await loop.priceMakeFinal(steps, made.draft)
    expect(sum.credits).toBeCloseTo(6.72, 6)
    expect(
      sent.filter((one) => one.url.endsWith("/price")).map((one) => one.url)
    ).toEqual([
      "/api/apps/motion/price",
      "/api/apps/image/price",
      "/api/apps/motion/price",
    ])
  })
})
