import type { RunInputs } from "@rosesfield/contract"
import type { EndKeySteps } from "@rosesfield/generation/bindings"
import { AspectRatio, type AssetId } from "@rosesfield/kernel"
import { motionEndKeySteps } from "#motion/comfy/end-key-steps"
import {
  ltx25GuideInputs,
  ltx25ShortSides,
  renderResolutions,
} from "#motion/comfy/guide-ltx-2-5-binding"
import { exampleInput, photoInput } from "#motion/examples/example-binding"
import type { LibraryExample } from "#motion/examples/library-example.contract"

type Ids = Extract<RunInputs[string], readonly unknown[]>

export type ExampleChainAsk = {
  example: LibraryExample
  photo: AssetId
  resolution: string
}

const draftSide = ltx25ShortSides[renderResolutions.draft] ?? 512

function draftFrameOf(aspectRatio: string): { width: number; height: number } {
  const ratio = AspectRatio.parse(aspectRatio)
  const long = (side: number, of: number): number =>
    Math.round((draftSide * side) / of / 2) * 2
  return ratio.width >= ratio.height
    ? { width: long(ratio.width, ratio.height), height: draftSide }
    : { width: draftSide, height: long(ratio.height, ratio.width) }
}

/** The draft, the restore of its last frame and the final of a guided example, the final at the resolution the person chose. */
export function exampleEndKeySteps(ask: ExampleChainAsk): EndKeySteps | null {
  const shape = ask.example.preview?.aspectRatio ?? null
  if (ask.example.guide === null || shape === null) {
    return null
  }
  const photos: Ids = [ask.photo]
  const base = motionEndKeySteps({
    inputs: { [exampleInput]: ask.example.id, [photoInput]: photos },
    photos,
    aspectRatio: shape,
    frameSize: draftFrameOf(shape),
  })
  return {
    ...base,
    final: (draft, endKey) => {
      const step = base.final(draft, endKey)
      return {
        ...step,
        request: {
          ...step.request,
          inputs: {
            ...step.request.inputs,
            [ltx25GuideInputs.resolution]: ask.resolution,
          },
        },
      }
    },
  }
}
