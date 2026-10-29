import type { RunInputs } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { app as imageApp } from "#image/app"
import { referenceInput } from "#image/comfy/open-weights"
import { referenceModel } from "#image/image-models"
import type { ClipPlan } from "#motion/clip-plan"
import {
  type MotionStepRequest,
  stepKeyOf,
} from "#motion/comfy/read-clip-binding"

export type FrameEditModel = "open" | "hosted"

export type FrameSize = { width: number; height: number }

type EditModelBinding = {
  model: string
  mostImages: number
  inputsOf: (images: AssetId[], prompt: string, size: FrameSize) => RunInputs
}

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
    model: referenceModel,
    mostImages: 3,
    inputsOf: (images, prompt) => ({
      model: referenceModel,
      prompt,
      [referenceInput]: images,
      resolution: "1k",
    }),
  },
  hosted: {
    model: "openai/gpt-image-2.5-sunburst",
    mostImages: 16,
    inputsOf: (images, prompt, size) => ({
      model: "openai/gpt-image-2.5-sunburst",
      prompt,
      images,
      quality: "medium",
      size: hostedSizeOf(size),
    }),
  },
}

export const defaultFrameEditModel: FrameEditModel = "open"

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
  runId: string
  firstFrame: AssetId
  frameSize: FrameSize
  photos: readonly AssetId[]
  plan: ClipPlan
  model: FrameEditModel
  seed: number
}): MotionStepRequest {
  const editor = frameEditModels[input.model]
  const photos = editPhotosOf(input.plan, editor.mostImages - 1).flatMap(
    (at) => {
      const photo = input.photos[at]
      return photo === undefined ? [] : [photo]
    }
  )
  return {
    step: "edit",
    app: "image",
    idempotencyKey: stepKeyOf(input.runId, "edit"),
    binding: imageApp.engine,
    inputs: editor.inputsOf(
      [input.firstFrame, ...photos],
      input.plan.editPrompt,
      input.frameSize
    ),
    aspectRatio: aspectRatioOf(input.frameSize),
    seed: input.seed,
  }
}
