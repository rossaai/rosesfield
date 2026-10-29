import {
  type ChainRun,
  type EditModelBinding,
  EndKeyLoopHandler,
  exampleInput,
  finalAt,
  ltx25GuideModel,
  motionAppId,
  motionEndKeySteps,
  OwnVideoLead,
  ownVideo,
  photoInput,
} from "@rosesfield/catalog/motion"
import type { Run, RunInputs, RunRequest } from "@rosesfield/contract"
import type { PriceRunHandler } from "@rosesfield/generation"
import { AspectRatio, type AssetId, assetIdFormat } from "@rosesfield/kernel"
import type {
  GetAssetHandler,
  ReadAssetContentHandler,
} from "@rosesfield/library"
import type { KeyframeHandlers } from "#infrastructure/pi-keyframe-chain"
import {
  type RunPoll,
  type RunWait,
  readRunToEnd,
} from "#infrastructure/pi-library-tools"

/** The input of Motion's tool that names the draft a final is made from. */
export const draftInput = "draft"

const modelInput = "model"
const clipInput = "clip"
const sceneInput = "scene"
const resolutionInput = "resolution"
const seedInput = "seed"
const finalResolution = "720p"
const seedSpan = 2_147_483_647

export type OwnVideoHandlers = KeyframeHandlers & {
  priceRun: PriceRunHandler
  getAsset: GetAssetHandler
  readAssetContent: ReadAssetContentHandler
}

export type OwnVideoRuns = {
  handlers: OwnVideoHandlers
  request: RunRequest
  key: string
  wait: RunWait
  signal: AbortSignal | undefined
  poll?: RunPoll
  /** The editor that restores the draft's last frame, the one Motion's binding names when none is given. */
  editor?: EditModelBinding
}

/** What one call of Motion's tool on your own video made: the 480p draft and the final's price, or the run that stopped the chain. */
export type OwnVideoAnswer = {
  run: Run
  finalCredits?: number | null
  leftOutPhotos?: readonly number[]
}

function textOf(value: RunInputs[string] | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null
}

function idsOf(value: RunInputs[string] | undefined): AssetId[] {
  return Array.isArray(value) ? value.filter(assetIdFormat.is) : []
}

/** Says whether a call of Motion's tool changes your own video on the LTX 2.5 guided render, which runs the chain. */
export function isOwnVideoRun(appId: string, inputs: RunInputs): boolean {
  if (appId !== motionAppId) {
    return false
  }
  const example = textOf(inputs[exampleInput]) ?? ownVideo
  const model = textOf(inputs[modelInput]) ?? ltx25GuideModel
  return example === ownVideo && model === ltx25GuideModel
}

/** The draft a call names for its final, or null when it names none. */
export function namedDraftOf(inputs: RunInputs): string | null {
  return textOf(inputs[draftInput])
}

function chainOf(runs: OwnVideoRuns) {
  const { handlers, wait, signal, poll } = runs
  return {
    start: async (appId: string, request: ChainRun, key: string) => {
      const { run } = await handlers.startRun.execute({
        appId,
        body: {
          inputs: request.inputs,
          ...(request.aspectRatio === null
            ? {}
            : { aspectRatio: request.aspectRatio }),
          ...(request.place === undefined ? {} : { place: request.place }),
        },
        idempotencyKey: key,
        seed: null,
      })
      return run
    },
    settle: async (run: Run) =>
      (await readRunToEnd(handlers.getRun, run.id, wait, signal, poll)).run,
  }
}

function loopOf(runs: OwnVideoRuns): EndKeyLoopHandler {
  return new EndKeyLoopHandler({
    chain: chainOf(runs),
    prices: runs.handlers.priceRun,
  })
}

function seedOf(inputs: RunInputs): number {
  const seed = inputs[seedInput]
  return typeof seed === "number"
    ? seed
    : (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % seedSpan
}

function resolutionOf(inputs: RunInputs): string {
  return textOf(inputs[resolutionInput]) ?? finalResolution
}

function leadOf(runs: OwnVideoRuns): OwnVideoLead {
  const { inputs } = runs.request
  const { handlers } = runs
  const [clip] = idsOf(inputs[clipInput])
  if (clip === undefined) {
    throw new Error("The call names no video")
  }
  return new OwnVideoLead({
    ask: {
      clip,
      frames: [],
      photos: idsOf(inputs[photoInput]),
      sentence: textOf(inputs[sceneInput]) ?? "",
      frameSize: null,
      aspectRatio: null,
      resolution: resolutionOf(inputs),
      seed: seedOf(inputs),
    },
    heldText: async (assetId) => {
      const { bytes } = await handlers.readAssetContent.execute({ assetId })
      return new TextDecoder().decode(bytes)
    },
    heldSize: async (assetId) => {
      const { asset } = await handlers.getAsset.execute({ assetId })
      return asset.width === null || asset.height === null
        ? null
        : { width: asset.width, height: asset.height }
    },
  })
}

/** The credits the draft costs before anything runs: the plan, the read, the edit and the 480p draft, or null when one is unpriced. */
export async function ownVideoCreditsOf(
  handlers: OwnVideoHandlers,
  request: RunRequest
): Promise<number | null> {
  const runs: OwnVideoRuns = {
    handlers,
    request,
    key: "price",
    wait: async () => undefined,
    signal: undefined,
  }
  const price = await loopOf(runs).priceLead(leadOf(runs))
  return price.credits
}

/** Plans, reads and edits your own video held, then makes the 480p draft, and prices the final the draft offers. */
export async function ownVideoDraftOf(
  runs: OwnVideoRuns
): Promise<OwnVideoAnswer> {
  const loop = loopOf(runs)
  const lead = leadOf(runs)
  const led = await loop.lead({ lead, key: runs.key })
  if (led.status === "stopped") {
    return { run: led.run }
  }
  const made = await loop.draft({ steps: led.steps, key: runs.key })
  if (made.frame === null) {
    return { run: made.draft }
  }
  const price = await loop
    .priceMakeFinal(led.steps, made.draft)
    .catch(() => ({ credits: null }))
  return {
    run: made.draft,
    finalCredits: price.credits,
    leftOutPhotos: lead.plan?.unusedPhotos ?? [],
  }
}

function frameOfShape(shape: string | null): { width: number; height: number } {
  const ratio = AspectRatio.parse(shape ?? "1:1")
  return { width: ratio.width, height: ratio.height }
}

/** Restores the named draft's last frame with your photos, held, then renders the final at your resolution with the draft's seed. No read and no plan runs again. */
export async function ownVideoFinalOf(
  runs: OwnVideoRuns,
  draftId: string
): Promise<OwnVideoAnswer> {
  const loop = loopOf(runs)
  const { run: draft } = await runs.handlers.getRun.execute({
    runId: draftId,
  })
  const steps = finalAt(
    motionEndKeySteps(
      {
        inputs: draft.inputs,
        photos: idsOf(runs.request.inputs[photoInput]),
        aspectRatio: draft.aspectRatio,
        frameSize: frameOfShape(draft.aspectRatio),
      },
      runs.editor
    ),
    resolutionOf(runs.request.inputs)
  )
  const restored = await loop.restore({
    steps,
    key: runs.key,
    draft,
    answer: "yes",
  })
  if (restored.status !== "restored") {
    return { run: restored.status === "stopped" ? restored.run : draft }
  }
  const ended = await loop.final({
    steps,
    key: runs.key,
    draft,
    endKey: restored.endKey,
    answer: "yes",
  })
  switch (ended.status) {
    case "done":
      return { run: ended.final }
    case "stopped":
      return { run: ended.run }
    default:
      return { run: draft }
  }
}
