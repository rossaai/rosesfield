import {
  type AssetKind,
  appId,
  assetId,
  type Run,
  runId,
} from "@rosesfield/contract"
import { EndKeyChain } from "#domain/end-key-chain.port"
import type { EndKeySteps } from "#domain/end-key-steps"
import type { RunPrice } from "#domain/generation-engine.port"
import type { ChainRun } from "#domain/run-chain.port"

export const draftVideo = assetId.parse("4a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d")
export const lastFrame = assetId.parse("5b2c3d4e-5f6a-4b7c-9d8e-9f0a1b2c3d4e")
export const restoredKey = assetId.parse("6c3d4e5f-6a7b-4c8d-ae9f-0a1b2c3d4e5f")
export const finalVideo = assetId.parse("7d4e5f6a-7b8c-4d9e-bf0a-1b2c3d4e5f6a")

const kinds: ReadonlyMap<string, AssetKind> = new Map([
  [draftVideo, "video"],
  [lastFrame, "image"],
  [restoredKey, "image"],
  [finalVideo, "video"],
])

export type Started = { appId: string; request: ChainRun; key: string }

type Ending = { status: Run["status"]; outputs: readonly string[] }

export const fullDraft: Ending = {
  status: "done",
  outputs: [draftVideo, lastFrame],
}

export class FakeEndKeyChain extends EndKeyChain {
  readonly started: Started[] = []
  private readonly endings: ReadonlyMap<string, Ending>

  constructor(endings: Partial<Record<string, Ending>> = {}) {
    super()
    const all: Partial<Record<string, Ending>> = {
      render: fullDraft,
      restore: { status: "done", outputs: [restoredKey] },
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
    const stage = run.appId === "edit-app" ? "restore" : stageOf(run)
    const ending = this.endings.get(stage)
    if (ending === undefined) {
      throw new Error(`no ending for ${stage}`)
    }
    return {
      ...run,
      status: ending.status,
      outputs: ending.outputs.map((one) => assetId.parse(one)),
    }
  }

  async kindOf(id: string): Promise<AssetKind | null> {
    return kinds.get(id) ?? null
  }
}

function stageOf(run: Run): string {
  return run.inputs.resolution === "final-size" ? "final" : "render"
}

const runIds: Readonly<Record<string, string>> = {
  "-draft": "8e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a7b",
  "-restore": "9f6a7b8c-9d0e-4f1a-9b2c-3d4e5f6a7b8c",
  "-final": "0a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
}

function runOf(app: string, key: string, request: ChainRun): Run {
  const suffix = Object.keys(runIds).find((one) => key.endsWith(one)) ?? ""
  return {
    id: runId.parse(runIds[suffix]),
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
  restore: (frame) => ({
    appId: "edit-app",
    request: { inputs: { images: [frame, photo] }, aspectRatio: null },
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

  async execute(input: {
    appId: string
    inputs: ChainRun["inputs"]
  }): Promise<{ price: RunPrice }> {
    this.asked.push({ appId: input.appId, inputs: input.inputs })
    const name =
      input.appId === "edit-app" ? "restore" : String(input.inputs.resolution)
    return {
      price: this.prices.get(name) ?? { source: "unknown", credits: null },
    }
  }
}
