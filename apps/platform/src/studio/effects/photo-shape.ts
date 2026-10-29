import { presetOf } from "@rosesfield/catalog/effects"
import { isGuideFit, renderSizeOf } from "@rosesfield/catalog/motion"
import { tCatalog } from "@/copy/t"
import type { PhotoSize } from "@/studio/effects/use-photo-checks"

export function photoShapeMessage(
  effect: string,
  photo: PhotoSize | undefined,
  resolution: string
): string | null {
  const preset = presetOf(effect)
  if (preset === null || preset.kind !== "photo" || photo === undefined) {
    return null
  }
  const render = renderSizeOf(photo, resolution)
  if (render === null || isGuideFit(preset.guide, render)) {
    return null
  }
  return preset.guide.height > preset.guide.width
    ? tCatalog("effects.input.image.tall")
    : tCatalog("effects.input.image.wide")
}
