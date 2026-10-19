import { AspectRatio } from "@rosesfield/kernel"

export type UpscaleMode = "image" | "video"

export type FileFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
  seconds: number | null
}

export type FileReading =
  | { state: "none" }
  | { state: "reading" }
  | { state: "failed" }
  | { state: "read"; facts: FileFacts }

export type Size = { width: number; height: number }

export type FileProblem =
  | { kind: "wrongKind" }
  | { kind: "unreadable" }
  | { kind: "tooLarge"; bytes: number; limit: number }
  | { kind: "tooSmall"; side: number; min: number }
  | { kind: "tooLong"; seconds: number; max: number }
  | { kind: "tooShort"; seconds: number; min: number }

export type ScaleCheck =
  | { state: "empty" }
  | { state: "fits"; width: number; height: number }
  | { state: "tooBig"; width: number; height: number; max: number }

type ModeLimits = {
  formats: readonly string[]
  maxBytes: number
  minSide: number
}

export const maxLongSide = 3840
export const minVideoSeconds = 1
export const maxVideoSeconds = 10

export const modeLimits: Readonly<Record<UpscaleMode, ModeLimits>> = {
  image: {
    formats: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 20_000_000,
    minSide: 64,
  },
  video: {
    formats: ["video/mp4", "video/quicktime", "video/webm"],
    maxBytes: 100_000_000,
    minSide: 64,
  },
}

const factors: Readonly<Record<string, number>> = { "2x": 2, "4x": 4 }

export function isUpscaleMode(value: unknown): value is UpscaleMode {
  return value === "image" || value === "video"
}

export function factorOf(scale: string): number {
  return factors[scale] ?? 2
}

export function sizeOf(facts: FileFacts | null): Size | null {
  if (facts === null || facts.width === null || facts.height === null) {
    return null
  }
  return { width: facts.width, height: facts.height }
}

export function fileProblemOf(
  mode: UpscaleMode,
  facts: FileFacts
): FileProblem | null {
  const limits = modeLimits[mode]
  if (!limits.formats.includes(facts.mime)) {
    return { kind: "wrongKind" }
  }
  if (facts.bytes > limits.maxBytes) {
    return { kind: "tooLarge", bytes: facts.bytes, limit: limits.maxBytes }
  }
  const size = sizeOf(facts)
  if (size === null || (mode === "video" && facts.seconds === null)) {
    return { kind: "unreadable" }
  }
  const side = Math.min(size.width, size.height)
  if (side < limits.minSide) {
    return { kind: "tooSmall", side, min: limits.minSide }
  }
  if (mode === "video" && facts.seconds !== null) {
    if (facts.seconds > maxVideoSeconds) {
      const seconds = Math.ceil(facts.seconds * 10) / 10
      return { kind: "tooLong", seconds, max: maxVideoSeconds }
    }
    if (facts.seconds < minVideoSeconds) {
      const seconds = Math.floor(facts.seconds * 10) / 10
      return { kind: "tooShort", seconds, min: minVideoSeconds }
    }
  }
  return null
}

export function readingProblemOf(
  mode: UpscaleMode,
  reading: FileReading
): FileProblem | null {
  switch (reading.state) {
    case "none":
    case "reading":
      return null
    case "failed":
      return { kind: "unreadable" }
    case "read":
      return fileProblemOf(mode, reading.facts)
  }
}

export function scaleCheckOf(size: Size | null, scale: string): ScaleCheck {
  if (size === null) {
    return { state: "empty" }
  }
  const factor = factorOf(scale)
  const width = size.width * factor
  const height = size.height * factor
  if (Math.max(width, height) > maxLongSide) {
    return { state: "tooBig", width, height, max: maxLongSide }
  }
  return { state: "fits", width, height }
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
