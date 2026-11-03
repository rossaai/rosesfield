import { formatBytes, formatHundredths, formatSeconds } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import { clipMimes } from "@/pieces/use-clip-facts"
import type { FieldProblem } from "@/screens/app/app-form"
import type { ClipRange } from "@/studio/motion/motion-tabs"

export type MediaFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
  seconds: number | null
}

type Limits = {
  maxBytes: number
  mimes: readonly string[]
  formatsKey: string
  unreadableKey: string
}

export const photoInput = "photo"
export const clipInput = "clip"

export const photoLimits: Limits = {
  maxBytes: 20_000_000,
  mimes: ["image/png", "image/jpeg", "image/webp"],
  formatsKey: "motion.formats.photo",
  unreadableKey: "motion.input.photo.unreadable",
}

export const clipLimits: Limits = {
  maxBytes: 100_000_000,
  mimes: clipMimes,
  formatsKey: "motion.formats.clip",
  unreadableKey: "motion.input.clip.unreadable",
}

function fileProblem(
  facts: MediaFacts,
  limits: Limits,
  name: string
): FieldProblem | null {
  if (!limits.mimes.includes(facts.mime)) {
    return {
      name,
      key: "field.asset.wrongKind",
      values: { kinds: tCatalog(limits.formatsKey) },
    }
  }
  if (facts.bytes > limits.maxBytes) {
    return {
      name,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(facts.bytes),
        limit: formatBytes(limits.maxBytes),
      },
    }
  }
  return null
}

function unreadableProblem(limits: Limits, name: string): FieldProblem {
  return {
    name,
    key: "field.asset.wrongKind",
    values: { kinds: tCatalog(limits.unreadableKey) },
  }
}

export function photoProblem(
  facts: MediaFacts,
  name: string = photoInput
): FieldProblem | null {
  const problem = fileProblem(facts, photoLimits, name)
  if (problem !== null) {
    return problem
  }
  if (facts.width === null || facts.height === null) {
    return unreadableProblem(photoLimits, name)
  }
  return null
}

const lengthTolerance = 0.001

function shownSeconds(exact: number, limit: number): string {
  return Math.round(exact * 10) / 10 === limit
    ? formatHundredths(exact)
    : formatSeconds(exact)
}

/** The clip's problem: a file of another kind or over the size, one this browser cannot open, one shorter than the model takes, or one longer than a model that does not trim takes. */
export function clipProblem(
  facts: MediaFacts,
  range: ClipRange | null,
  name: string = clipInput
): FieldProblem | null {
  const problem = fileProblem(facts, clipLimits, name)
  if (problem !== null) {
    return problem
  }
  if (facts.seconds === null || facts.width === null || facts.height === null) {
    return unreadableProblem(clipLimits, name)
  }
  if (range === null) {
    return null
  }
  const exact = facts.seconds
  if (exact > range.max + lengthTolerance && !range.trims) {
    return {
      name,
      key: "field.asset.tooLong",
      values: { seconds: shownSeconds(exact, range.max), max: range.max },
    }
  }
  if (exact < range.min - lengthTolerance) {
    return {
      name,
      key: "field.asset.tooShort",
      values: { seconds: shownSeconds(exact, range.min), min: range.min },
    }
  }
  return null
}

/** The stretch Motion keeps of a clip longer than the model takes, or null for a clip it takes whole or refuses. */
export function trimmedOf(
  seconds: number | null,
  range: ClipRange | null
): { max: number; seconds: string } | null {
  if (seconds === null || range === null || !range.trims) {
    return null
  }
  return seconds > range.max + lengthTolerance
    ? { max: range.max, seconds: shownSeconds(seconds, range.max) }
    : null
}

export function isLengthProblem(problem: FieldProblem): boolean {
  return (
    problem.key === "field.asset.tooLong" ||
    problem.key === "field.asset.tooShort"
  )
}
