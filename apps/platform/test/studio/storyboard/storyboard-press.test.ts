import { type ChainRun, SpeechChain } from "@rosesfield/catalog/lipsync"
import type { KeptKeyframe } from "@rosesfield/catalog/storyboard"
import { assetId, type Run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { FormValues } from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { withScenes } from "@/studio/storyboard/storyboard-form"
import { inputsForModel } from "@/studio/storyboard/storyboard-model"
import {
  pressKeyframes,
  seededValues,
} from "@/studio/storyboard/use-storyboard-start"
import {
  fluxImage,
  openingValues,
  qwenEdit,
  storyboard,
  storyboardRun,
} from "./storyboard-screen"

const characterId = "4c6e8a0c-2e4a-4b6c-9d0e-6a8c0e2a4c6e"
const photos = [
  "1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e",
  "2f4b6d8e-0c1a-4b3c-9d5e-7f9a1b3c5d7e",
].map((id) => assetId.parse(id))

class FakeSpeechChain extends SpeechChain {
  readonly started: { request: ChainRun; key: string }[] = []

  async start(_appId: string, request: ChainRun, key: string): Promise<Run> {
    this.started.push({ request, key })
    const number = this.started.length
    return storyboardRun({
      id: `7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a0${number}`,
      status: "queued",
      finishedAt: null,
    })
  }

  async settle(run: Run): Promise<Run> {
    const [made] = photos
    return { ...run, status: "done", outputs: made === undefined ? [] : [made] }
  }

  async secondsOf(): Promise<number | null> {
    return null
  }
}

function modelOn(chosen: HostedState["chosen"]): HostedState {
  return {
    isTaskApp: true,
    models: [qwenEdit, fluxImage],
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: qwenEdit.id,
    chosen,
    fields: chosen?.form ?? null,
    ranBefore: [],
    choose: () => undefined,
  }
}

function threeScenes(values: FormValues = openingValues()): FormValues {
  return withScenes(values, ["the door", "the stairs", "the roof"])
}

describe("a press of Generate in Storyboard", () => {
  it("picks one seed for every call when the seed is random, and keeps a seed you fixed", () => {
    const random = seededValues(threeScenes())
    expect(random.seedMode).toBe("fixed")
    expect(typeof random.inputs.seed).toBe("number")
    const fixed: FormValues = { ...threeScenes(), seedMode: "fixed" }
    const kept = { ...fixed, inputs: { ...fixed.inputs, seed: 5 } }
    expect(seededValues(kept)).toBe(kept)
  })

  it("starts one run per scene under one press key and one seed, and tells the screen once when the first starts", async () => {
    const chain = new FakeSpeechChain()
    const started: Run[] = []
    const values = threeScenes()
    const runs = await pressKeyframes({
      app: storyboard,
      values: {
        ...values,
        inputs: { ...values.inputs, reference: [photos[1] ?? ""] },
      },
      model: modelOn(qwenEdit),
      key: "press-1",
      chain,
      photosOf: async () => [],
      keep: () => undefined,
      onStarted: (run) => started.push(run),
    })
    expect(chain.started.map((one) => one.key)).toEqual([
      "press-1-keyframe-1",
      "press-1-keyframe-2",
      "press-1-keyframe-3",
    ])
    const seeds = chain.started.map((one) => one.request.inputs.seed)
    expect(typeof seeds[0]).toBe("number")
    expect(new Set(seeds).size).toBe(1)
    expect(started).toHaveLength(1)
    expect(runs.map((run) => run?.status)).toEqual(["done", "done", "done"])
  })

  it("sends a hosted model the character's photos it reads for the press", async () => {
    const chain = new FakeSpeechChain()
    const asked: string[] = []
    const kept: (KeptKeyframe & { runId: string })[] = []
    const values = threeScenes()
    await pressKeyframes({
      app: storyboard,
      values: {
        ...values,
        inputs: {
          ...inputsForModel(values.inputs, fluxImage),
          character: [characterId],
        },
      },
      model: modelOn(fluxImage),
      key: "press-2",
      chain,
      photosOf: async (id) => {
        asked.push(id)
        return photos
      },
      keep: (run, keyframe) => kept.push({ runId: run.id, ...keyframe }),
      onStarted: () => undefined,
    })
    expect(asked).toEqual([characterId])
    expect(new Set(kept.map((one) => one.press))).toEqual(new Set(["press-2"]))
    expect(kept.map((one) => one.runId.slice(-1))).toEqual(["1", "2", "3"])
    kept.forEach((one, index) => {
      expect(one.inputs).toMatchObject({
        keyframe: String(index + 1),
        scene1: "the door",
        scene2: "the stairs",
        scene3: "the roof",
        sceneCount: "3",
        character: [characterId],
        model: fluxImage.id,
      })
    })
    expect(chain.started.map((one) => one.request.inputs.images)).toEqual([
      photos,
      photos,
      photos,
    ])
  })
})
