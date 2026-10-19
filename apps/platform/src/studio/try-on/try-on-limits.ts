import { AspectRatio } from "@rosesfield/kernel"

export type PhotoName = "person" | "clothes"

export type PhotoFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
}

export type PhotoReading =
  | { state: "none" }
  | { state: "reading" }
  | { state: "failed" }
  | { state: "read"; facts: PhotoFacts }

export type Size = { width: number; height: number }

export type PhotoProblem =
  | { kind: "wrongKind" }
  | { kind: "unreadable" }
  | { kind: "tooLarge"; bytes: number; limit: number }
  | { kind: "tooSmall"; side: number; min: number }
  | { kind: "badRatio"; max: number }

type PhotoLimits = {
  formats: readonly string[]
  maxBytes: number
  minSide: number
  maxRatio: number | null
}

export const photoNames: readonly PhotoName[] = ["person", "clothes"]

const formats: readonly string[] = ["image/png", "image/jpeg", "image/webp"]

export const photoLimits: Readonly<Record<PhotoName, PhotoLimits>> = {
  person: { formats, maxBytes: 20_000_000, minSide: 512, maxRatio: 2 },
  clothes: { formats, maxBytes: 20_000_000, minSide: 512, maxRatio: null },
}

export function sizeOf(facts: PhotoFacts | null): Size | null {
  if (facts === null || facts.width === null || facts.height === null) {
    return null
  }
  return { width: facts.width, height: facts.height }
}

export function photoProblemOf(
  name: PhotoName,
  facts: PhotoFacts
): PhotoProblem | null {
  const limits = photoLimits[name]
  if (!limits.formats.includes(facts.mime)) {
    return { kind: "wrongKind" }
  }
  if (facts.bytes > limits.maxBytes) {
    return { kind: "tooLarge", bytes: facts.bytes, limit: limits.maxBytes }
  }
  const size = sizeOf(facts)
  if (size === null) {
    return { kind: "unreadable" }
  }
  const short = Math.min(size.width, size.height)
  if (short < limits.minSide) {
    return { kind: "tooSmall", side: short, min: limits.minSide }
  }
  const long = Math.max(size.width, size.height)
  if (limits.maxRatio !== null && long > short * limits.maxRatio) {
    return { kind: "badRatio", max: limits.maxRatio }
  }
  return null
}

export function readingProblemOf(
  name: PhotoName,
  reading: PhotoReading
): PhotoProblem | null {
  switch (reading.state) {
    case "none":
    case "reading":
      return null
    case "failed":
      return { kind: "unreadable" }
    case "read":
      return photoProblemOf(name, reading.facts)
  }
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
