import type { RunInputs } from "@rosesfield/contract"
import type {
  EngineFile,
  EngineRequest,
  EngineStatus,
  EngineSteps,
  Fetch,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { expect } from "vitest"
import { remakeEngine } from "#remake/comfy/remake-engine"
import { RouterPlanTurn } from "#remake/comfy/router-plan-turn"
import { RemakeGenerationEngine } from "#remake/remake-generation-engine"
import { type Recording, ReplayFetch } from "../motion/motion-replay"
import { FakeAssetStore } from "./fake-asset-store"
import { FakeShotEngine } from "./fake-generation-engine"
import { FakeMediaTool, scoresOf } from "./fake-media-tool"

export const planUrl =
  "https://api.comfy.org/v2/models/vertexai/gemini-3.1-flash-lite"
const referenceId = assetIdFormat.parse("2c3d4e5f-6071-4c8d-9e0f-a1b2c3d4e5f6")
const photoId = assetIdFormat.parse("3d4e5f60-7182-4d9e-8f1a-b2c3d4e5f6a7")

type People = "none" | "one" | "several"

function planned(people: readonly People[]): Recording {
  const shots = people.map((one) =>
    one === "one"
      ? { people: one, words: null, cameraMove: null }
      : { people: one, words: "A wet street at night.", cameraMove: "push-in" }
  )
  return {
    method: "POST",
    url: planUrl,
    status: 200,
    json: {
      candidates: [
        { content: { parts: [{ text: JSON.stringify({ shots }) }] } },
      ],
    },
  }
}

const referenceFile: EngineFile = {
  assetId: referenceId,
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(1, 2, 3),
}

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71),
}

export function requestOf(inputs: RunInputs = {}): EngineRequest {
  return {
    idempotencyKey: "run-1",
    binding: remakeEngine,
    inputs: {
      reference: [referenceId],
      character: [photoId],
      instructions: "Warm light.",
      otherShots: "rebuild",
      keepSound: "on",
      quality: "draft",
      seed: 41,
      ...inputs,
    },
    files: [referenceFile, photoFile],
    count: 1,
    aspectRatio: "16:9",
    seed: 41,
    outputKind: "video",
  }
}

type Setup = {
  scores: string
  people?: readonly People[]
  hasSound?: boolean
  isAlone?: boolean
  isNow?: boolean
  credits?: number
  planCredits?: number
}

export function planFetchOf(
  replay: ReplayFetch,
  credits: number | null
): Fetch {
  return async (input, init) => {
    const response = await replay.fetch(input, init)
    if (credits === null) {
      return response
    }
    const headers = new Headers(response.headers)
    headers.set("x-comfy-credits-used", String(credits))
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers,
    })
  }
}

export function setup(options: Setup) {
  const media = new FakeMediaTool(options.scores, options.hasSound ?? true)
  const shots = new FakeShotEngine({
    isAlone: options.isAlone ?? false,
    isNow: options.isNow ?? false,
    credits: options.credits ?? null,
  })
  const replay = new ReplayFetch(
    options.people === undefined ? [] : [planned(options.people)]
  )
  const store = new FakeAssetStore()
  const engine = new RemakeGenerationEngine({
    engines: [shots],
    media,
    plan: new RouterPlanTurn({
      apiKey: "comfyui-owner",
      fetch: planFetchOf(replay, options.planCredits ?? null),
    }),
    store,
  })
  return { media, shots, replay, store, engine }
}

export async function readUntilDone(
  engine: RemakeGenerationEngine,
  ref: string
): Promise<EngineStatus> {
  for (let read = 0; read < 12; read += 1) {
    const status = await engine.read(ref)
    if (status.state !== "running" && status.state !== "queued") {
      return status
    }
  }
  return expect.unreachable("the run never ended")
}

export function filterOf(args: readonly string[]): string {
  return args[args.indexOf("-filter_complex") + 1] ?? ""
}

export function inputsOf(args: readonly string[]): string[] {
  return args.filter((_, index) => args[index - 1] === "-i")
}

export const threeShots = scoresOf(168, [60, 132])

export function stepsOf(status: EngineStatus): EngineSteps | undefined {
  return "steps" in status ? status.steps : undefined
}

export function resumedOf(steps: EngineSteps | undefined): EngineRequest {
  return steps === undefined ? requestOf() : { ...requestOf(), steps }
}

export function restarted(
  media: FakeMediaTool,
  shots: FakeShotEngine,
  store: FakeAssetStore
) {
  const replay = new ReplayFetch([])
  const engine = new RemakeGenerationEngine({
    engines: [shots],
    media,
    plan: new RouterPlanTurn({ apiKey: "comfyui-owner", fetch: replay.fetch }),
    store,
  })
  return { engine, replay }
}
