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

export type FileLimits = {
  formats: readonly string[]
  maxBytes: number
  minSide: number | null
  seconds: { min: number; max: number } | null
}

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

export function fileLimitsOf(mode: UpscaleMode, isGraph: boolean): FileLimits {
  const limits = modeLimits[mode]
  const isClip = mode === "video" && isGraph
  return {
    formats: limits.formats,
    maxBytes: limits.maxBytes,
    minSide: isGraph ? limits.minSide : null,
    seconds: isClip ? { min: minVideoSeconds, max: maxVideoSeconds } : null,
  }
}

export function isUpscaleMode(value: unknown): value is UpscaleMode {
  return value === "image" || value === "video"
}

export function sizeOf(facts: FileFacts | null): Size | null {
  if (facts === null || facts.width === null || facts.height === null) {
    return null
  }
  return { width: facts.width, height: facts.height }
}

function lengthProblemOf(
  seconds: number,
  bounds: { min: number; max: number }
): FileProblem | null {
  if (seconds > bounds.max) {
    const over = Math.ceil(seconds * 10) / 10
    return { kind: "tooLong", seconds: over, max: bounds.max }
  }
  if (seconds < bounds.min) {
    const under = Math.floor(seconds * 10) / 10
    return { kind: "tooShort", seconds: under, min: bounds.min }
  }
  return null
}

export function fileProblemOf(
  mode: UpscaleMode,
  facts: FileFacts,
  limits: FileLimits = fileLimitsOf(mode, true)
): FileProblem | null {
  if (!limits.formats.includes(facts.mime)) {
    return { kind: "wrongKind" }
  }
  if (facts.bytes > limits.maxBytes) {
    return { kind: "tooLarge", bytes: facts.bytes, limit: limits.maxBytes }
  }
  const size = sizeOf(facts)
  if (size === null || (limits.seconds !== null && facts.seconds === null)) {
    return { kind: "unreadable" }
  }
  const side = Math.min(size.width, size.height)
  if (limits.minSide !== null && side < limits.minSide) {
    return { kind: "tooSmall", side, min: limits.minSide }
  }
  return limits.seconds === null || facts.seconds === null
    ? null
    : lengthProblemOf(facts.seconds, limits.seconds)
}

export function readingProblemOf(
  mode: UpscaleMode,
  reading: FileReading,
  limits: FileLimits = fileLimitsOf(mode, true)
): FileProblem | null {
  switch (reading.state) {
    case "none":
    case "reading":
      return null
    case "failed":
      return { kind: "unreadable" }
    case "read":
      return fileProblemOf(mode, reading.facts, limits)
  }
}

export function scaleCheckOf(
  size: Size | null,
  factor: number | null,
  max: number | null
): ScaleCheck {
  if (size === null || factor === null) {
    return { state: "empty" }
  }
  const width = Math.round(size.width * factor)
  const height = Math.round(size.height * factor)
  if (max !== null && Math.max(width, height) > max) {
    return { state: "tooBig", width, height, max }
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
