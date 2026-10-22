import {
  type AppDefinition,
  appDefinition,
  appId,
  assetId,
  type Run,
  runId,
} from "@rosesfield/contract"
import { taskBinding } from "@rosesfield/generation/bindings"
import { type ChainRun, SpeechChain } from "#lipsync/speech-chain.port"
import { findApp } from "#list-apps"

export const speechAsset = assetId.parse("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d")
export const photoAsset = assetId.parse("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e")

export const audio: AppDefinition = appDefinition.parse({
  id: "audio",
  nameKey: "name",
  category: "audio",
  inputs: [
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [{ value: "speech-graph", labelKey: "model.speechGraph" }],
      default: "speech-graph",
    },
    {
      type: "prompt",
      name: "script",
      labelKey: "inputs.script",
      presence: "required",
      maxLength: 200,
    },
  ],
  output: { kind: "audio", count: { default: 1, max: 1 } },
  engine: taskBinding({
    tasks: ["speech"],
    input: "model",
    default: "speech-graph",
    fallback: { adapter: "demo", config: {} },
  }),
  limits: { timeoutSeconds: 60, maxRetries: 0 },
})

type Started = {
  appId: string
  request: ChainRun
  key: string
}

export class FakeSpeechChain extends SpeechChain {
  readonly started: Started[] = []
  private readonly speechStatus: Run["status"]
  private readonly speechOutputs: readonly string[]
  private readonly seconds: number | null

  constructor(options: {
    speechStatus?: Run["status"]
    speechOutputs?: readonly string[]
    seconds?: number | null
  }) {
    super()
    this.speechStatus = options.speechStatus ?? "done"
    this.speechOutputs = options.speechOutputs ?? [speechAsset]
    this.seconds = options.seconds === undefined ? 5.01 : options.seconds
  }

  async start(appIdOf: string, request: ChainRun, key: string): Promise<Run> {
    this.started.push({ appId: appIdOf, request, key })
    return runOf(appIdOf, "queued", [], this.started.length)
  }

  async settle(run: Run): Promise<Run> {
    return run.appId === "audio"
      ? runOf("audio", this.speechStatus, this.speechOutputs, 1)
      : { ...run, status: "done" }
  }

  async secondsOf(asset: string): Promise<number | null> {
    return asset === speechAsset ? this.seconds : null
  }
}

function runOf(
  app: string,
  status: Run["status"],
  outputs: readonly string[],
  order: number
): Run {
  return {
    id: runId.parse(`3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7${order}`),
    appId: appId.parse(app),
    status,
    inputs: {},
    count: 1,
    aspectRatio: null,
    seed: 7,
    outputs: outputs.map((output) => assetId.parse(output)),
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: { amount: 0.01, currency: "USD" },
    origin: "demo",
    failure: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    finishedAt: null,
  }
}

export const typed: ChainRun = {
  inputs: {
    mode: "photo",
    model: "ltx-2-3",
    photo: [photoAsset],
    length: 10,
    speechText: "  Hello there, this is my line ",
    speechModel: "",
  },
  aspectRatio: "1:1",
}

export const lipsync = findApp("lipsync")!

export const graphCheck = { app: lipsync, form: null }

export const graphTarget = {
  appId: "lipsync",
  audio: "audio",
  length: "length",
  check: graphCheck,
}
