import { guideOf } from "@rosesfield/catalog/effects"
import { isGuideFit, renderSizeOf } from "@rosesfield/catalog/motion"
import { tCatalog } from "@/copy/t"
import type { PhotoSize } from "@/studio/effects/use-photo-checks"

export function photoShapeMessage(
  effect: string,
  photo: PhotoSize | undefined,
  resolution: string
): string | null {
  const guide = guideOf(effect)
  if (guide === null || photo === undefined) {
    return null
  }
  const render = renderSizeOf(photo, resolution)
  if (render === null || isGuideFit(guide, render)) {
    return null
  }
  return guide.height > guide.width
    ? tCatalog("effects.input.image.tall")
    : tCatalog("effects.input.image.wide")
}
