import {
  type ChainRun,
  type SpeechApp,
  SpeechChain,
  speechModelInput,
  speechTextInput,
} from "@rosesfield/catalog/lipsync"
import { assetId, type Run, runId } from "@rosesfield/contract"
import { appIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import type { StartRunBodyInput } from "@/screens/app/app-form"
import { fieldsOfModel } from "@/studio/lipsync/lipsync-run"
import { chainTargetOf, pressChain } from "@/studio/lipsync/use-chain-run"
import { avatar, ltx, photoApp, photoId } from "./lipsync-models"

const spoken = assetId.parse("6f7a8b9c-0d1e-4f2a-9b3c-5d6e7f8091a2")

const speechApp: SpeechApp = {
  id: appIdFormat.parse("audio"),
  inputs: [
    {
      type: "choice",
      name: "model",
      labelKey: "voice.input.mode.label",
      options: [{ value: "speech-graph", labelKey: "voice.name" }],
      default: "speech-graph",
    },
    {
      type: "prompt",
      name: "script",
      labelKey: "voice.input.script.label",
      presence: "required",
      maxLength: 200,
    },
  ],
}

type Started = { appId: string; request: ChainRun; key: string }

function runOf(app: string, status: Run["status"], order: number): Run {
  return {
    id: runId.parse(`7a8b9c0d-1e2f-4a3b-8c4d-6e7f8091a2b${order}`),
    appId: appIdFormat.parse(app),
    status,
    inputs: {},
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: status === "done" && app === "audio" ? [spoken] : [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: { amount: 0.02, currency: "USD" },
    origin: "demo",
    failure:
      status === "failed" ? { code: "ENGINE_UNAVAILABLE", status: 503 } : null,
    createdAt: "2026-10-21T10:00:00.000Z",
    finishedAt: null,
  }
}

class FakeSpeechChain extends SpeechChain {
  readonly started: Started[] = []
  private readonly speechStatus: Run["status"]

  constructor(options: { speechStatus: Run["status"] }) {
    super()
    this.speechStatus = options.speechStatus
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    this.started.push({ appId, request, key })
    return runOf(appId, "queued", this.started.length)
  }

  async settle(run: Run): Promise<Run> {
    return runOf(run.appId, this.speechStatus, 1)
  }

  async secondsOf(asset: string): Promise<number | null> {
    return asset === spoken ? 4.5 : null
  }
}

const ask: StartRunBodyInput = {
  inputs: {
    model: ltx.id,
    photo: [photoId],
    length: 10,
    [speechTextInput]: "Hello there",
    [speechModelInput]: "",
  },
  aspectRatio: "1:1",
}

const graphTarget = chainTargetOf({
  appId: photoApp.id,
  fields: fieldsOfModel(ltx, photoApp),
  isGraph: true,
})

function pressOf(chain: SpeechChain, onStarted: (run: Run) => void) {
  return {
    speechApp,
    voices: [],
    target: graphTarget,
    ask,
    key: "press-1",
    chain,
    onStarted,
  }
}

describe("Generate on Text", () => {
  it("makes the speech on Audio's default first, then the video from its audio, each keyed from the press", async () => {
    const chain = new FakeSpeechChain({ speechStatus: "done" })
    const first: Run[] = []
    const video = await pressChain(pressOf(chain, (run) => first.push(run)))
    expect(chain.started).toEqual([
      {
        appId: "audio",
        request: {
          inputs: { model: "speech-graph", script: "Hello there" },
          aspectRatio: null,
        },
        key: "press-1-speech",
      },
      {
        appId: photoApp.id,
        request: {
          inputs: {
            model: ltx.id,
            photo: [photoId],
            length: 4.52,
            audio: [spoken],
          },
          aspectRatio: "1:1",
        },
        key: "press-1-video",
      },
    ])
    expect(video.appId).toBe(photoApp.id)
    expect(first.map((run) => run.appId)).toEqual(["audio"])
  })

  it("sends the same keys when the same press runs again", async () => {
    const chain = new FakeSpeechChain({ speechStatus: "done" })
    await pressChain(pressOf(chain, () => undefined))
    await pressChain(pressOf(chain, () => undefined))
    expect(chain.started.map((one) => one.key)).toEqual([
      "press-1-speech",
      "press-1-video",
      "press-1-speech",
      "press-1-video",
    ])
  })

  it("starts no video when the speech fails, and says why it failed", async () => {
    const chain = new FakeSpeechChain({ speechStatus: "failed" })
    const pressed = pressChain(pressOf(chain, () => undefined))
    await expect(pressed).rejects.toBeInstanceOf(GatewayRefusedError)
    await expect(pressed).rejects.toMatchObject({
      code: "ENGINE_UNAVAILABLE",
      status: 503,
    })
    expect(chain.started.map((one) => one.appId)).toEqual(["audio"])
  })

  it("starts no run for a model with no audio input", async () => {
    const chain = new FakeSpeechChain({ speechStatus: "done" })
    const target = chainTargetOf({
      appId: photoApp.id,
      fields: null,
      isGraph: false,
    })
    const pressed = pressChain({ ...pressOf(chain, () => undefined), target })
    await expect(pressed).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(chain.started).toEqual([])
  })

  it("starts no run when a photo is not an asset id", async () => {
    const chain = new FakeSpeechChain({ speechStatus: "done" })
    const pressed = pressChain({
      ...pressOf(chain, () => undefined),
      ask: { ...ask, inputs: { ...ask.inputs, photo: ["not-an-asset"] } },
    })
    await expect(pressed).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(chain.started).toEqual([])
  })
})

describe("the input the spoken audio goes to", () => {
  it("is the graph's audio, with its length set from the speech", () => {
    expect(graphTarget).toEqual({
      appId: photoApp.id,
      audio: "audio",
      length: "length",
    })
  })

  it("is a hosted model's own audio input, with no length to set", () => {
    expect(
      chainTargetOf({
        appId: photoApp.id,
        fields: fieldsOfModel(avatar, photoApp),
        isGraph: false,
      })
    ).toEqual({ appId: photoApp.id, audio: "soundFile", length: null })
  })
})
