import { isGuideFit, renderSizeOf } from "@rosesfield/catalog/motion"
import { formatBytes, formatSeconds } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import { clipMimes } from "@/pieces/use-clip-facts"
import type { FieldProblem } from "@/screens/app/app-form"
import { type ClipRange, graphClipRange } from "@/studio/motion/motion-tabs"

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

export function clipProblem(
  facts: MediaFacts,
  range: ClipRange | null = graphClipRange,
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
  const shown = Math.round(facts.seconds * 10) / 10
  const seconds = formatSeconds(shown)
  if (shown > range.max) {
    return {
      name,
      key: "field.asset.tooLong",
      values: { seconds, max: range.max },
    }
  }
  if (shown < range.min) {
    return {
      name,
      key: "field.asset.tooShort",
      values: { seconds, min: range.min },
    }
  }
  return null
}

export function isLengthProblem(problem: FieldProblem): boolean {
  return (
    problem.key === "field.asset.tooLong" ||
    problem.key === "field.asset.tooShort"
  )
}

export function guideShapeProblem(
  guide: MediaFacts,
  photo: MediaFacts,
  resolution: string,
  name: string = clipInput
): FieldProblem | null {
  const { width, height } = guide
  if (
    width === null ||
    height === null ||
    photo.width === null ||
    photo.height === null
  ) {
    return null
  }
  const render = renderSizeOf(
    { width: photo.width, height: photo.height },
    resolution
  )
  if (render === null || isGuideFit({ width, height }, render)) {
    return null
  }
  return {
    name,
    key: "field.asset.wrongShape",
    values: {
      width: String(width),
      height: String(height),
      fitWidth: String(render.width),
      fitHeight: String(render.height),
    },
  }
}
