import type { Run, RunInputs } from "@rosesfield/contract"
import type { EndKeySteps, StepRun } from "@rosesfield/generation"
import { ltx25GuideInputs } from "#motion/comfy/guide-ltx-2-5-binding"
import { ltx25GuideModel } from "#motion/motion-models"

type Ids = Extract<RunInputs[string], readonly unknown[]>

export type EndKeyEditor = {
  appId: string
  model: string
  imagesInput: string
  maxImages: number
  settings: RunInputs
}

export type MotionEndKeyAsk = {
  inputs: RunInputs
  photos: Ids
  aspectRatio: string | null
}

export const endKeyEditor: EndKeyEditor = {
  appId: "image",
  model: "openai/gpt-image-2.5-sunburst",
  imagesInput: "images",
  maxImages: 16,
  settings: { quality: "medium", n: 1 },
}

export const motionAppId = "motion"

export const draftResolution = "480p"

export const finalResolution = "720p"

export const restorePrompt =
  "Image 1 is the last frame of a video. Restore it as a sharp real photograph with exactly its framing, its camera, the pose, size and position of every person and thing, the set and the light. Make each person, garment and object that the other images show look exactly as those images show them: the same face, hair, skin, glasses, clothes and details. Keep everything else in image 1 where it is. No text, no lettering, no logos, no watermark."

const editSizes = {
  portrait: "1024x1536",
  landscape: "1536x1024",
  square: "1024x1024",
  unknown: "auto",
} as const

export function editSizeOf(aspectRatio: string | null): string {
  const [across, down] = (aspectRatio ?? "").split(":").map(Number)
  if (
    across === undefined ||
    down === undefined ||
    !(across > 0) ||
    !(down > 0)
  ) {
    return editSizes.unknown
  }
  if (across === down) {
    return editSizes.square
  }
  return across < down ? editSizes.portrait : editSizes.landscape
}

function renderInputs(ask: MotionEndKeyAsk, resolution: string): RunInputs {
  const {
    [ltx25GuideInputs.endKey]: _endKey,
    [ltx25GuideInputs.resolution]: _resolution,
    ...kept
  } = ask.inputs
  return {
    ...kept,
    model: ltx25GuideModel,
    [ltx25GuideInputs.resolution]: resolution,
  }
}

export const seedInput = "seed"

function seedOf(draft: Run): RunInputs {
  return draft.seed === null ? {} : { [seedInput]: draft.seed }
}

export function motionEndKeySteps(
  ask: MotionEndKeyAsk,
  editor: EndKeyEditor = endKeyEditor
): EndKeySteps {
  const draft: StepRun = {
    appId: motionAppId,
    request: {
      inputs: renderInputs(ask, draftResolution),
      aspectRatio: ask.aspectRatio,
    },
  }
  return {
    draft,
    restore: (frame) => ({
      appId: editor.appId,
      request: {
        inputs: {
          ...editor.settings,
          model: editor.model,
          prompt: restorePrompt,
          size: editSizeOf(ask.aspectRatio),
          [editor.imagesInput]: [frame, ...ask.photos].slice(
            0,
            editor.maxImages
          ),
        },
        aspectRatio: null,
      },
    }),
    final: (made, endKey) => ({
      appId: motionAppId,
      request: {
        inputs: {
          ...renderInputs(ask, finalResolution),
          ...seedOf(made),
          [ltx25GuideInputs.endKey]: [endKey],
        },
        aspectRatio: ask.aspectRatio,
      },
    }),
  }
}
