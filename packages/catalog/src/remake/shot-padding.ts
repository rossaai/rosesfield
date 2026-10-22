import { fieldOfRole, type ModelForm } from "@rosesfield/generation/bindings"
import { framesOf } from "#remake/shot-plan"

export type SwapPadding = {
  frames: number
  passes: number
  paddedFrames: number
}

const swapOutput = "video"

function shortestOf(form: ModelForm): number {
  const field = fieldOfRole(form.fields, "length", swapOutput)
  switch (field?.kind) {
    case "number":
      return field.min ?? 0
    case "choice": {
      const options = field.options.map(Number).filter(Number.isFinite)
      return options.length === 0 ? 0 : Math.min(...options)
    }
    default:
      return 0
  }
}

export function shortestSwapSecondsOf(form: ModelForm | null): number {
  return form === null ? 0 : shortestOf(form)
}

export function swapPaddingOf(
  frames: number,
  shortestSeconds: number
): SwapPadding {
  const paddedFrames = Math.max(frames, framesOf(shortestSeconds))
  const passes = frames <= 0 ? 0 : Math.ceil(paddedFrames / frames)
  return { frames, passes, paddedFrames }
}
