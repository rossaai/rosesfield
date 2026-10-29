import type { Run, RunInputs } from "@rosesfield/contract"
import type { EndKeySteps, StepRun } from "@rosesfield/generation/bindings"
import {
  type EditModelBinding,
  frameEditModels,
} from "#motion/comfy/frame-edit"
import type { FrameSize } from "#motion/comfy/guide-fit"
import {
  lastFrameNode,
  ltx25GuideInputs,
  type RenderQuality,
  renderResolutions,
} from "#motion/comfy/guide-ltx-2-5-binding"
import { ltx25GuideModel, motionAppId } from "#motion/motion-models"

type Ids = Extract<RunInputs[string], readonly unknown[]>

export type MotionEndKeyAsk = {
  inputs: RunInputs
  photos: Ids
  aspectRatio: string | null
  frameSize: FrameSize
}

export const endKeyEditor: EditModelBinding = frameEditModels.hosted

export const restorePrompt =
  "Image 1 is the last frame of a video. Restore it as a sharp real photograph with exactly its framing, its camera, the pose, size and position of every person and thing, the set and the light. Make each person, garment and object that the other images show look exactly as those images show them: the same face, hair, skin, glasses, clothes and details. Keep everything else in image 1 where it is. No text, no lettering, no logos, no watermark."

function renderInputs(ask: MotionEndKeyAsk, quality: RenderQuality): RunInputs {
  const { [ltx25GuideInputs.endKey]: _endKey, ...kept } = ask.inputs
  return {
    ...kept,
    [ltx25GuideInputs.model]: ltx25GuideModel,
    [ltx25GuideInputs.resolution]: renderResolutions[quality],
  }
}

function seedOf(draft: Run): RunInputs {
  return draft.seed === null ? {} : { [ltx25GuideInputs.seed]: draft.seed }
}

function renderStep(inputs: RunInputs, ask: MotionEndKeyAsk): StepRun {
  return {
    appId: motionAppId,
    request: { inputs, aspectRatio: ask.aspectRatio },
  }
}

export function motionEndKeySteps(
  ask: MotionEndKeyAsk,
  editor: EditModelBinding = endKeyEditor
): EndKeySteps {
  return {
    draft: renderStep(renderInputs(ask, "draft"), ask),
    frameOf: (draft) =>
      draft.held?.find(
        (one) => one.nodeId === lastFrameNode && one.kind === "image"
      )?.assetId ?? null,
    restore: (frame) => ({
      appId: editor.appId,
      request: {
        inputs: editor.inputsOf({
          images: [frame, ...ask.photos].slice(0, editor.mostImages),
          prompt: restorePrompt,
          size: ask.frameSize,
          seed: null,
        }),
        aspectRatio: null,
        place: "held",
      },
    }),
    final: (draft, endKey) =>
      renderStep(
        {
          ...renderInputs(ask, "final"),
          ...seedOf(draft),
          [ltx25GuideInputs.endKey]: [endKey],
        },
        ask
      ),
  }
}
