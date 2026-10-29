import {
  appId,
  assetId,
  type HeldOutput,
  type Run,
  runId,
} from "@rosesfield/contract"
import type {
  PriceRunInput,
  PriceRunOutput,
} from "#application/price-run/price-run.handler"
import type { EndKeySteps } from "#domain/end-key-steps"
import type { RunPrice } from "#domain/generation-engine.port"
import { type ChainRun, RunChain } from "#domain/run-chain.port"

export const draftVideo = assetId.parse("4a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d")
export const lastFrame = assetId.parse("5b2c3d4e-5f6a-4b7c-9d8e-9f0a1b2c3d4e")
export const restoredKey = assetId.parse("6c3d4e5f-6a7b-4c8d-ae9f-0a1b2c3d4e5f")
export const finalVideo = assetId.parse("7d4e5f6a-7b8c-4d9e-bf0a-1b2c3d4e5f6a")

export const lastFrameNode = "1011"

export type Started = { appId: string; request: ChainRun; key: string }

type Ending = {
  status: Run["status"]
  outputs: readonly string[]
  held?: readonly HeldOutput[]
}

export const fullDraft: Ending = {
  status: "done",
  outputs: [draftVideo],
  held: [{ nodeId: lastFrameNode, assetId: lastFrame, kind: "image" }],
}

export class FakeRunChain extends RunChain {
  readonly started: Started[] = []
  private readonly endings: ReadonlyMap<string, Ending>

  constructor(endings: Partial<Record<string, Ending>> = {}) {
    super()
    const all: Partial<Record<string, Ending>> = {
      render: fullDraft,
      restore: {
        status: "done",
        outputs: [],
        held: [{ nodeId: "0", assetId: restoredKey, kind: "image" }],
      },
      final: { status: "done", outputs: [finalVideo] },
      ...endings,
    }
    this.endings = new Map(
      Object.entries(all).flatMap(([name, ending]): [string, Ending][] =>
        ending === undefined ? [] : [[name, ending]]
      )
    )
  }

  async start(app: string, request: ChainRun, key: string): Promise<Run> {
    this.started.push({ appId: app, request, key })
    return runOf(app, key, request)
  }

  async settle(run: Run): Promise<Run> {
    const lead = this.started.find((one) => idOfKey(one.key) === run.id)
    const named = lead === undefined ? null : leadStageOf(lead.key)
    const stage =
      named !== null && this.endings.has(named)
        ? named
        : run.appId === "edit-app"
          ? "restore"
          : stageOf(run)
    const ending = this.endings.get(stage)
    if (ending === undefined) {
      throw new Error(`no ending for ${stage}`)
    }
    return {
      ...run,
      status: ending.status,
      outputs: ending.outputs.map((one) => assetId.parse(one)),
      ...(ending.held === undefined ? {} : { held: [...ending.held] }),
    }
  }
}

function leadStageOf(key: string): string | null {
  const suffix = Object.keys(leadRunIds).find((one) => key.endsWith(one))
  return suffix === undefined ? null : suffix.slice(1)
}

function stageOf(run: Run): string {
  return run.inputs.resolution === "final-size" ? "final" : "render"
}

const leadRunIds: Readonly<Record<string, string>> = {
  "-plan": "2c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f",
  "-read": "3d0e1f2a-3b4c-4d5e-9f6a-7b8c9d0e1f2a",
}

const runIds: Readonly<Record<string, string>> = {
  ...leadRunIds,
  "-draft": "8e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b",
  "-restore": "9f6a7b8c-9d0e-4f1a-9b2c-3d4e5f6a7b8c",
  "-final": "0a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
}

function idOfKey(key: string): string {
  const suffix = Object.keys(runIds).find((one) => key.endsWith(one)) ?? ""
  return runId.parse(runIds[suffix])
}

function runOf(app: string, key: string, request: ChainRun): Run {
  return {
    id: runId.parse(idOfKey(key)),
    appId: appId.parse(app),
    status: "queued",
    inputs: request.inputs,
    count: 1,
    aspectRatio: request.aspectRatio,
    seed: 41,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: null,
  }
}

export const photo = assetId.parse("1e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b")

export const steps: EndKeySteps = {
  draft: {
    appId: "render-app",
    request: {
      inputs: { resolution: "draft-size", photo: [photo] },
      aspectRatio: "2:3",
    },
  },
  frameOf: (draft) =>
    draft.held?.find((one) => one.nodeId === lastFrameNode)?.assetId ?? null,
  restore: (frame) => ({
    appId: "edit-app",
    request: {
      inputs: { images: [frame, photo] },
      aspectRatio: null,
      place: "held",
    },
  }),
  final: (draft, endKey) => ({
    appId: "render-app",
    request: {
      inputs: {
        resolution: "final-size",
        photo: [photo],
        endKey: [endKey],
        seed: draft.seed ?? 0,
      },
      aspectRatio: "2:3",
    },
  }),
}

export class FakeStepPricer {
  readonly asked: { appId: string; inputs: ChainRun["inputs"] }[] = []
  private readonly prices: ReadonlyMap<string, RunPrice>

  constructor(prices: Record<string, RunPrice>) {
    this.prices = new Map(Object.entries(prices))
  }

  async execute(input: PriceRunInput): Promise<PriceRunOutput> {
    this.asked.push({ appId: input.appId, inputs: input.inputs })
    const name =
      input.appId === "edit-app" ? "restore" : String(input.inputs.resolution)
    return {
      price: this.prices.get(name) ?? { source: "unknown", credits: null },
    }
  }
}
