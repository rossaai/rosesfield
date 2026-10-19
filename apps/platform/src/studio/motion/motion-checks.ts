import { formatBytes, formatSeconds } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import type { FieldProblem } from "@/screens/app/app-form"

export type MediaFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
  seconds: number | null
}

type Limits = {
  input: string
  maxBytes: number
  mimes: readonly string[]
  formatsKey: string
  unreadableKey: string
}

export const photoInput = "photo"
export const clipInput = "clip"

export const photoLimits: Limits = {
  input: photoInput,
  maxBytes: 20_000_000,
  mimes: ["image/png", "image/jpeg", "image/webp"],
  formatsKey: "motion.formats.photo",
  unreadableKey: "motion.input.photo.unreadable",
}

export const clipLimits: Limits & { minSeconds: number; maxSeconds: number } = {
  input: clipInput,
  maxBytes: 100_000_000,
  mimes: ["video/mp4", "video/quicktime", "video/webm"],
  formatsKey: "motion.formats.clip",
  unreadableKey: "motion.input.clip.unreadable",
  minSeconds: 2,
  maxSeconds: 10,
}

export function nearestRatio(width: number, height: number): string {
  const wide = width * width
  const tall = height * height
  if (64 * wide < 27 * tall) {
    return "9:16"
  }
  if (4 * wide < 3 * tall) {
    return "3:4"
  }
  if (3 * wide < 4 * tall) {
    return "1:1"
  }
  if (27 * wide < 64 * tall) {
    return "4:3"
  }
  return "16:9"
}

function fileProblem(facts: MediaFacts, limits: Limits): FieldProblem | null {
  if (!limits.mimes.includes(facts.mime)) {
    return {
      name: limits.input,
      key: "field.asset.wrongKind",
      values: { kinds: tCatalog(limits.formatsKey) },
    }
  }
  if (facts.bytes > limits.maxBytes) {
    return {
      name: limits.input,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(facts.bytes),
        limit: formatBytes(limits.maxBytes),
      },
    }
  }
  return null
}

function unreadableProblem(limits: Limits): FieldProblem {
  return {
    name: limits.input,
    key: "field.asset.wrongKind",
    values: { kinds: tCatalog(limits.unreadableKey) },
  }
}

export function photoProblem(facts: MediaFacts): FieldProblem | null {
  const problem = fileProblem(facts, photoLimits)
  if (problem !== null) {
    return problem
  }
  if (facts.width === null || facts.height === null) {
    return unreadableProblem(photoLimits)
  }
  return null
}

export function clipProblem(facts: MediaFacts): FieldProblem | null {
  const problem = fileProblem(facts, clipLimits)
  if (problem !== null) {
    return problem
  }
  if (facts.seconds === null || facts.width === null || facts.height === null) {
    return unreadableProblem(clipLimits)
  }
  const shown = Math.round(facts.seconds * 10) / 10
  const seconds = formatSeconds(shown)
  if (shown > clipLimits.maxSeconds) {
    return {
      name: clipInput,
      key: "field.asset.tooLong",
      values: { seconds, max: clipLimits.maxSeconds },
    }
  }
  if (shown < clipLimits.minSeconds) {
    return {
      name: clipInput,
      key: "field.asset.tooShort",
      values: { seconds, min: clipLimits.minSeconds },
    }
  }
  return null
}
