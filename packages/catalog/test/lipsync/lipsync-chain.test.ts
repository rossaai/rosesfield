import {
  type AppDefinition,
  appDefinition,
  appId,
  assetId,
  type Run,
  runId,
} from "@rosesfield/contract"
import { taskBinding } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import type { CatalogModel } from "#comfy/model-catalog.contract"
import {
  lipInputsOf,
  speakThenSync,
  speechPlanOf,
} from "#lipsync/lipsync-chain"
import { type ChainRun, SpeechChain } from "#lipsync/speech-chain.port"

const speechAsset = assetId.parse("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d")
const photoAsset = assetId.parse("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e")

const audio: AppDefinition = appDefinition.parse({
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

const hostedVoice: CatalogModel = {
  id: "hosted/voice",
  kind: "hosted",
  maker: "Maker",
  name: "Voice",
  nameKey: null,
  task: "speech",
  tags: [{ kind: "hosted" }],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 500,
      default: null,
    },
  ],
}

type Started = {
  appId: string
  request: ChainRun
  key: string
}

class FakeSpeechChain extends SpeechChain {
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

const typed: ChainRun = {
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

const graphTarget = { appId: "lipsync", audio: "audio", length: "length" }

describe("Text in Lip sync, which makes the speech first and then the video", () => {
  it("speaks your line on Audio's speech default, then syncs the photo to the audio it made at its length", async () => {
    const chain = new FakeSpeechChain({})
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: typed,
      key: "line-1",
      chain,
    })
    expect(chain.started).toEqual([
      {
        appId: "audio",
        request: {
          inputs: {
            model: "speech-graph",
            script: "Hello there, this is my line",
          },
          aspectRatio: null,
        },
        key: "line-1-speech",
      },
      {
        appId: "lipsync",
        request: {
          inputs: {
            mode: "photo",
            model: "ltx-2-3",
            photo: [photoAsset],
            length: 5.04,
            audio: [speechAsset],
          },
          aspectRatio: "1:1",
        },
        key: "line-1-video",
      },
    ])
    expect(outcome).toMatchObject({
      kind: "started",
      speech: { appId: "audio", status: "done", outputs: [speechAsset] },
      video: { appId: "lipsync" },
    })
  })

  it("speaks your line on the voice you picked, in that voice's own text field", async () => {
    const chain = new FakeSpeechChain({})
    await speakThenSync({
      app: audio,
      voices: [hostedVoice],
      target: { appId: "lipsync", audio: "voiceTrack", length: null },
      request: {
        inputs: { ...typed.inputs, speechModel: "hosted/voice" },
        aspectRatio: null,
      },
      key: "line-2",
      chain,
    })
    expect(chain.started[0]?.request.inputs).toEqual({
      model: "hosted/voice",
      prompt: "Hello there, this is my line",
    })
    expect(chain.started[1]?.request.inputs).toEqual({
      mode: "photo",
      model: "ltx-2-3",
      photo: [photoAsset],
      length: 10,
      voiceTrack: [speechAsset],
    })
  })

  it("keeps the length you set when the speech holds no length", async () => {
    const chain = new FakeSpeechChain({ seconds: null })
    await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: typed,
      key: "line-3",
      chain,
    })
    expect(chain.started[1]?.request.inputs).toMatchObject({ length: 10 })
  })

  it("starts no video when the speech run fails or makes nothing", async () => {
    for (const fake of [
      new FakeSpeechChain({ speechStatus: "failed" }),
      new FakeSpeechChain({ speechOutputs: [] }),
    ]) {
      const outcome = await speakThenSync({
        app: audio,
        voices: [],
        target: graphTarget,
        request: typed,
        key: "line-4",
        chain: fake,
      })
      expect(outcome.kind).toBe("unspoken")
      expect(fake.started.map((one) => one.appId)).toEqual(["audio"])
    }
  })

  it("starts no run at all for an empty line", async () => {
    const chain = new FakeSpeechChain({})
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: {
        inputs: { ...typed.inputs, speechText: "   " },
        aspectRatio: null,
      },
      key: "line-5",
      chain,
    })
    expect(outcome).toEqual({ kind: "unplanned" })
    expect(chain.started).toEqual([])
  })
})

describe("the parts of the Text chain", () => {
  it("drops the line and the voice from the inputs the lip sync run takes", () => {
    expect(lipInputsOf(typed.inputs)).toEqual({
      mode: "photo",
      model: "ltx-2-3",
      photo: [photoAsset],
      length: 10,
    })
  })

  it("plans no speech for an app with no model choice and no voice picked", () => {
    const bare = { id: "audio", inputs: audio.inputs.slice(1) }
    expect(
      speechPlanOf({ app: bare, voices: [], inputs: typed.inputs })
    ).toBeNull()
  })
})
