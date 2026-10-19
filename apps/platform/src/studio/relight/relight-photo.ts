import { AspectRatio } from "@rosesfield/kernel"

export type PhotoSize = { width: number; height: number }

export type PhotoFacts = {
  mime: string
  bytes: number
  size: PhotoSize | null
}

export type PhotoProblem =
  | { kind: "wrongKind" }
  | { kind: "tooLarge"; bytes: number; limit: number }
  | { kind: "tooSmall"; width: number; height: number; min: number }
  | { kind: "ratio"; width: number; height: number }

export const photoFormats: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
]
export const maxPhotoBytes = 20_000_000
export const minPhotoSide = 256
export const widestRatio = 7 / 3
export const targetPixels = 1_048_576
export const sideStep = 16

export function photoProblemOf(facts: PhotoFacts): PhotoProblem | null {
  if (!photoFormats.includes(facts.mime) || facts.size === null) {
    return { kind: "wrongKind" }
  }
  if (facts.bytes > maxPhotoBytes) {
    return { kind: "tooLarge", bytes: facts.bytes, limit: maxPhotoBytes }
  }
  const { width, height } = facts.size
  if (Math.min(width, height) < minPhotoSide) {
    return { kind: "tooSmall", width, height, min: minPhotoSide }
  }
  const ratio = width / height
  if (ratio > widestRatio || ratio < 1 / widestRatio) {
    return { kind: "ratio", width, height }
  }
  return null
}

export function outputSizeOf(size: PhotoSize): PhotoSize {
  const scale = Math.sqrt(targetPixels / (size.width * size.height))
  const round = (side: number): number =>
    Math.round((side * scale) / sideStep) * sideStep
  return { width: round(size.width), height: round(size.height) }
}

export function nearestRatioOf(
  options: readonly string[],
  size: PhotoSize
): string | null {
  const target = Math.log(size.width / size.height)
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const option of options) {
    const ratio = AspectRatio.parse(option)
    const distance = Math.abs(Math.log(ratio.width / ratio.height) - target)
    if (distance < bestDistance) {
      best = option
      bestDistance = distance
    }
  }
  return best
}
