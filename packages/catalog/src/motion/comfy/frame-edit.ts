import type { RunInputs } from "@rosesfield/contract"
import type { StepRun } from "@rosesfield/generation/bindings"
import type { AssetId } from "@rosesfield/kernel"
import { app as imageApp } from "#image/app"
import { referenceInput } from "#image/comfy/open-weights"
import { referenceModel } from "#image/image-models"
import type { ClipPlan } from "#motion/clip-plan"
import type { FrameSize } from "#motion/comfy/guide-fit"
import { FrameShapeUnfitError } from "#motion/frame-shape-unfit.error"

export type FrameEditModel = "open" | "hosted"

type Ids = Extract<RunInputs[string], readonly unknown[]>

export type EditAsk = {
  images: Ids
  prompt: string
  size: FrameSize
  seed: number | null
}

/** The one contract of an editor Motion edits a frame with: the first frame and the end key alike. */
export type EditModelBinding = {
  appId: string
  model: string
  mostImages: number
  inputsOf: (ask: EditAsk) => RunInputs
}

export const editAppId = imageApp.id

export const seedInput = "seed"

const squareSpread = 1.1

function hostedSizeOf(size: FrameSize): string {
  const ratio = size.width / size.height
  if (ratio > squareSpread) {
    return "1536x1024"
  }
  return ratio < 1 / squareSpread ? "1024x1536" : "1024x1024"
}

export const frameEditModels: Readonly<
  Record<FrameEditModel, EditModelBinding>
> = {
  open: {
    appId: editAppId,
    model: referenceModel,
    mostImages: 3,
    inputsOf: (ask) => ({
      model: referenceModel,
      prompt: ask.prompt,
      [referenceInput]: ask.images,
      resolution: "1k",
      ...(ask.seed === null ? {} : { [seedInput]: ask.seed }),
    }),
  },
  hosted: {
    appId: editAppId,
    model: "openai/gpt-image-2.5-sunburst",
    mostImages: 16,
    inputsOf: (ask) => ({
      model: "openai/gpt-image-2.5-sunburst",
      prompt: ask.prompt,
      images: ask.images,
      quality: "medium",
      size: hostedSizeOf(ask.size),
    }),
  },
}

export const defaultFrameEditModel: FrameEditModel = "open"

/** The frame shapes GPT Image 2.5 makes, across over down: 1:1, 2:3 and 3:2. */
export const hostedEditShapes: readonly number[] = [1, 2 / 3, 3 / 2]

export const hostedShapeTolerance = 0.01

/** Says whether the hosted editor makes this frame's own shape, so its edit needs no crop. */
export function isHostedEditFit(size: FrameSize): boolean {
  const ratio = size.width / size.height
  return hostedEditShapes.some(
    (shape) => Math.abs(ratio / shape - 1) <= hostedShapeTolerance
  )
}

/** The editors Motion offers for a frame: the hosted one only when it keeps the frame's shape. */
export function frameEditModelsFor(size: FrameSize): FrameEditModel[] {
  return isHostedEditFit(size) ? ["open", "hosted"] : ["open"]
}

/** The editor a frame is edited with: the one asked for, or the default when none is. A hosted ask on a shape it would crop is refused. */
export function frameEditModelOf(
  size: FrameSize,
  asked: FrameEditModel | null
): FrameEditModel {
  if (asked === null) {
    return defaultFrameEditModel
  }
  if (!frameEditModelsFor(size).includes(asked)) {
    throw new FrameShapeUnfitError()
  }
  return asked
}

/** Picks the photos in turn from each target, so each target keeps one when the editor takes few. */
export function editPhotosOf(plan: ClipPlan, most: number): number[] {
  const picked: number[] = []
  const longest = Math.max(...plan.targets.map((one) => one.photos.length))
  for (let at = 0; at < longest; at += 1) {
    for (const target of plan.targets) {
      const photo = target.photos[at]
      if (photo !== undefined && !picked.includes(photo)) {
        picked.push(photo)
      }
    }
  }
  return picked.slice(0, most)
}

export function aspectRatioOf(size: FrameSize): string {
  const ratio = size.width / size.height
  const { output } = imageApp
  const options = "aspectRatios" in output ? output.aspectRatios.options : []
  const distance = (option: string): number => {
    const [wide = 1, high = 1] = option.split(":").map(Number)
    return Math.abs(Math.log(ratio / (wide / high)))
  }
  return [...options].sort((a, b) => distance(a) - distance(b))[0] ?? "1:1"
}

export function frameEditRequestOf(input: {
  firstFrame: AssetId
  frameSize: FrameSize
  photos: readonly AssetId[]
  plan: ClipPlan
  model: FrameEditModel | null
  seed: number
}): StepRun {
  const model = frameEditModelOf(input.frameSize, input.model)
  const editor = frameEditModels[model]
  const photos = editPhotosOf(input.plan, editor.mostImages - 1).flatMap(
    (at) => {
      const photo = input.photos[at]
      return photo === undefined ? [] : [photo]
    }
  )
  return {
    appId: editor.appId,
    request: {
      inputs: editor.inputsOf({
        images: [input.firstFrame, ...photos],
        prompt: input.plan.editPrompt,
        size: input.frameSize,
        seed: input.seed,
      }),
      aspectRatio: model === "open" ? aspectRatioOf(input.frameSize) : null,
      place: "held",
    },
  }
}
