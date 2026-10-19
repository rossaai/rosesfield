import { AspectRatio } from "@rosesfield/kernel"

export type StoredFacts = { mime: string; bytes: number }

export type Size = { width: number; height: number }

export type ImageFacts = StoredFacts & Size

export type ImageReading =
  | { state: "none" }
  | { state: "reading"; stored: StoredFacts | null }
  | { state: "failed"; stored: StoredFacts | null; retry: () => void }
  | { state: "read"; facts: ImageFacts }

export type ImageProblem =
  | { kind: "wrongKind" }
  | { kind: "tooLarge"; bytes: number; limit: number }
  | { kind: "tooBig"; width: number; height: number; max: number }
  | { kind: "tooSmall"; width: number; height: number; min: number }

export type ImageCheck =
  | { state: "empty" }
  | { state: "pending" }
  | { state: "unreadable"; retry: () => void }
  | { state: "refused"; problem: ImageProblem }
  | { state: "valid"; size: Size }

export const imageFormats: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
]
export const maxBytes = 20_000_000
export const minShortSide = 64
export const maxLongSide = 4096

export function storedProblemOf(stored: StoredFacts): ImageProblem | null {
  if (!imageFormats.includes(stored.mime)) {
    return { kind: "wrongKind" }
  }
  if (stored.bytes > maxBytes) {
    return { kind: "tooLarge", bytes: stored.bytes, limit: maxBytes }
  }
  return null
}

export function imageProblemOf(facts: ImageFacts): ImageProblem | null {
  const stored = storedProblemOf(facts)
  if (stored !== null) {
    return stored
  }
  const size = { width: facts.width, height: facts.height }
  if (Math.max(size.width, size.height) > maxLongSide) {
    return { kind: "tooBig", ...size, max: maxLongSide }
  }
  if (Math.min(size.width, size.height) < minShortSide) {
    return { kind: "tooSmall", ...size, min: minShortSide }
  }
  return null
}

function refusalOf(stored: StoredFacts | null): ImageCheck | null {
  const problem = stored === null ? null : storedProblemOf(stored)
  return problem === null ? null : { state: "refused", problem }
}

export function imageCheckOf(reading: ImageReading): ImageCheck {
  switch (reading.state) {
    case "none":
      return { state: "empty" }
    case "reading":
      return refusalOf(reading.stored) ?? { state: "pending" }
    case "failed":
      return (
        refusalOf(reading.stored) ?? {
          state: "unreadable",
          retry: reading.retry,
        }
      )
    case "read": {
      const problem = imageProblemOf(reading.facts)
      return problem === null
        ? {
            state: "valid",
            size: { width: reading.facts.width, height: reading.facts.height },
          }
        : { state: "refused", problem }
    }
  }
}

export function canStartWith(check: ImageCheck): boolean {
  return check.state === "empty" || check.state === "valid"
}

export function nearestRatioOf(
  options: readonly string[],
  size: Size
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
