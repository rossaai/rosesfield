import {
  appId,
  assetId,
  characterId as characterIdSchema,
  type Run,
  type RunInputs,
  runId,
} from "@rosesfield/contract"
import type { ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { type ChainRun, SpeechChain } from "#lipsync/speech-chain.port"
import { keepSentence } from "#storyboard/comfy/storyboard-nodes"
import {
  keyframeCallsOf,
  runKeyframes,
  type StoryboardAsk,
} from "#storyboard/storyboard-chain"

const referenceId = assetId.parse("1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e")
const photoIds = [
  "2f4b6d8e-0c1a-4b3c-9d5e-7f9a1b3c5d7e",
  "3a5c7e9f-1b2d-4c4e-8f6a-0b2d4f6a8c9e",
  "4b6d8f0a-2c3e-4d5f-9a7b-1c3e5f7a9b0d",
  "5c7e9f1b-3d4f-4e6a-8b8c-2d4f6a8c0e1f",
].map((id) => assetId.parse(id))
const characterId = characterIdSchema.parse(
  "6d8f0a2c-4e5a-4f7b-9c9d-3e5a7b9d1f2a"
)
const scenes = ["a fox wakes", "the fox crosses a river", "the fox sleeps"]
const look = "blue hour"

const fluxForm: readonly ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: null,
    default: null,
  },
  {
    kind: "media",
    name: "images",
    path: "images",
    required: false,
    media: "image",
    min: 1,
    max: 2,
  },
  {
    kind: "choice",
    name: "aspectRatio",
    path: "aspect_ratio",
    required: false,
    options: ["1:1", "16:9"],
    default: "1:1",
  },
]

type Event = { kind: "start" | "settled"; number: number }

type Started = { request: ChainRun; key: string }

class FakeSpeechChain extends SpeechChain {
  readonly events: Event[] = []
  readonly started: Started[] = []
  private readonly firstStatus: Run["status"]
  private releaseFirst: () => void = () => undefined
  private readonly firstHeld: Promise<void>

  constructor(options: { firstStatus?: Run["status"] } = {}) {
    super()
    this.firstStatus = options.firstStatus ?? "done"
    this.firstHeld = new Promise((resolve) => {
      this.releaseFirst = resolve
    })
  }

  release(): void {
    this.releaseFirst()
  }

  async start(appIdOf: string, request: ChainRun, key: string): Promise<Run> {
    const number = Number(key.slice(key.lastIndexOf("-") + 1))
    this.events.push({ kind: "start", number })
    this.started.push({ request, key })
    return runOf(appIdOf, number, "queued", [])
  }

  async settle(run: Run): Promise<Run> {
    const number = numberOf(run)
    if (number === 1) {
      await this.firstHeld
    }
    this.events.push({ kind: "settled", number })
    const status = number === 1 ? this.firstStatus : "done"
    const outputs = status === "done" ? [made(number)] : []
    return runOf(run.appId, number, status, outputs)
  }

  async secondsOf(): Promise<number | null> {
    return null
  }
}

function made(number: number): string {
  return `9a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2${number}`
}

function numberOf(run: Run): number {
  return Number(run.id.slice(-1))
}

function runOf(
  app: string,
  number: number,
  status: Run["status"],
  outputs: readonly string[]
): Run {
  return {
    id: runId.parse(`3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7${number}`),
    appId: appId.parse(app),
    status,
    inputs: {},
    count: 1,
    aspectRatio: null,
    seed: 7,
    outputs: outputs.map((output) => assetId.parse(output)),
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    finishedAt: null,
  }
}

function askOf(
  extra: RunInputs,
  hosted: StoryboardAsk["hosted"] = null
): StoryboardAsk {
  const inputs: RunInputs = {
    sceneCount: String(scenes.length),
    look,
    model: hosted === null ? "qwen-image-edit-2511" : "bfl/flux-3-image",
    keyframe: "3",
    firstKeyframe: [referenceId],
    ...extra,
  }
  scenes.forEach((scene, index) => {
    inputs[`scene${index + 1}`] = scene
  })
  return { inputs, aspectRatio: hosted === null ? "4:3" : null, hosted }
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

describe("a Storyboard chain from a reference", () => {
  it("starts one run per keyframe at once under the press key, each naming its own keyframe", async () => {
    const chain = new FakeSpeechChain()
    const ended = runKeyframes({
      ask: askOf({ reference: [referenceId] }),
      key: "press",
      chain,
    })
    await flush()
    expect(chain.events.slice(0, 3)).toEqual([
      { kind: "start", number: 1 },
      { kind: "start", number: 2 },
      { kind: "start", number: 3 },
    ])
    expect(chain.started.map((one) => one.key)).toEqual([
      "press-keyframe-1",
      "press-keyframe-2",
      "press-keyframe-3",
    ])
    for (const [index, one] of chain.started.entries()) {
      expect(one.request.aspectRatio).toBe("4:3")
      expect(one.request.inputs).toMatchObject({
        keyframe: String(index + 1),
        reference: [referenceId],
        model: "qwen-image-edit-2511",
      })
      expect(one.request.inputs).not.toHaveProperty("firstKeyframe")
    }
    chain.release()
    const runs = await ended
    expect(runs.map((run) => run?.outputs)).toEqual([
      [made(1)],
      [made(2)],
      [made(3)],
    ])
  })
})

describe("a Storyboard chain with no reference and no character", () => {
  it("starts keyframe 1 as a text call alone, then starts every edit of keyframe 1 once it is done", async () => {
    const chain = new FakeSpeechChain()
    const ended = runKeyframes({ ask: askOf({}), key: "press", chain })
    await flush()
    expect(chain.events).toEqual([{ kind: "start", number: 1 }])
    expect(chain.started[0]?.request.inputs).toMatchObject({
      model: "z-image-turbo",
      keyframe: "1",
    })
    expect(chain.started[0]?.request.inputs).not.toHaveProperty(
      "firstKeyframe"
    )
    chain.release()
    const runs = await ended
    expect(chain.events.slice(0, 2)).toEqual([
      { kind: "start", number: 1 },
      { kind: "settled", number: 1 },
    ])
    const edits = chain.started.slice(1)
    expect(edits.map((one) => one.key)).toEqual([
      "press-keyframe-2",
      "press-keyframe-3",
    ])
    for (const one of edits) {
      expect(one.request.inputs).toMatchObject({
        model: "qwen-image-edit-2511",
        firstKeyframe: [made(1)],
      })
    }
    expect(runs.map((run) => run?.status)).toEqual(["done", "done", "done"])
  })

  it("starts no edit when keyframe 1 fails, and returns the failed run alone", async () => {
    const chain = new FakeSpeechChain({ firstStatus: "failed" })
    const ended = runKeyframes({ ask: askOf({}), key: "press", chain })
    chain.release()
    const runs = await ended
    expect(chain.started).toHaveLength(1)
    expect(runs.map((run) => run?.status ?? null)).toEqual([
      "failed",
      null,
      null,
    ])
  })
})

describe("a Storyboard chain on a hosted edit model", () => {
  it("sends each edit the reference and its own prompt, the fixed sentence, the scene and the look, in the model's own inputs", () => {
    const hosted = {
      form: fluxForm,
      settings: { aspectRatio: "16:9" },
      photos: [],
    }
    const calls = keyframeCallsOf(askOf({ reference: [referenceId] }, hosted))
    expect(calls.map((call) => call.request)).toEqual(
      scenes.map((scene) => ({
        inputs: {
          model: "bfl/flux-3-image",
          aspectRatio: "16:9",
          prompt: `${keepSentence} ${scene} ${look}`,
          images: [referenceId],
        },
        aspectRatio: null,
      }))
    )
  })

  it("sends a character's photos up to the model's image limit", () => {
    const hosted = { form: fluxForm, settings: {}, photos: photoIds }
    const [first] = keyframeCallsOf(
      askOf({ character: [characterId] }, hosted)
    )
    expect(first?.request.inputs.images).toEqual(photoIds.slice(0, 2))
  })

  it("makes keyframe 1 on the open-weights text graph in the model's format, then sends keyframe 1 to each edit", async () => {
    const hosted = {
      form: fluxForm,
      settings: { aspectRatio: "1:1" },
      photos: [],
    }
    const chain = new FakeSpeechChain()
    const ended = runKeyframes({ ask: askOf({}, hosted), key: "press", chain })
    chain.release()
    await ended
    const [text, ...edits] = chain.started
    expect(text?.request).toMatchObject({
      inputs: { model: "z-image-turbo", keyframe: "1", scene1: scenes[0] },
      aspectRatio: "1:1",
    })
    expect(edits.map((one) => one.request.inputs.images)).toEqual([
      [made(1)],
      [made(1)],
    ])
  })
})
