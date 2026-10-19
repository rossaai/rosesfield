import { formatBytes, formatSeconds } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import type { FieldProblem } from "@/screens/app/app-form"
import {
  audioInput,
  clipInput,
  photoInput,
} from "@/studio/lipsync/lipsync-modes"

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
  needs: { size: boolean; length: boolean }
  seconds: { min: number; max: number } | null
}

export const framesPerSecond = 25

const lengthBounds = { min: 2, max: 10 }

export const photoLimits: Limits = {
  input: photoInput,
  maxBytes: 20_000_000,
  mimes: ["image/png", "image/jpeg", "image/webp"],
  formatsKey: "lipsync.formats.photo",
  unreadableKey: "lipsync.input.photo.unreadable",
  needs: { size: true, length: false },
  seconds: null,
}

export const clipLimits: Limits = {
  input: clipInput,
  maxBytes: 100_000_000,
  mimes: ["video/mp4", "video/quicktime", "video/webm"],
  formatsKey: "lipsync.formats.clip",
  unreadableKey: "lipsync.input.clip.unreadable",
  needs: { size: true, length: true },
  seconds: lengthBounds,
}

export const audioLimits: Limits = {
  input: audioInput,
  maxBytes: 20_000_000,
  mimes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"],
  formatsKey: "lipsync.formats.audio",
  unreadableKey: "lipsync.input.audio.unreadable",
  needs: { size: false, length: true },
  seconds: lengthBounds,
}

const ratios: readonly { value: string; width: number; height: number }[] = [
  { value: "1:1", width: 1, height: 1 },
  { value: "4:3", width: 4, height: 3 },
  { value: "3:4", width: 3, height: 4 },
  { value: "16:9", width: 16, height: 9 },
  { value: "9:16", width: 9, height: 16 },
]

export function nearestRatio(width: number, height: number): string {
  const shape = Math.log(width / height)
  let best = "1:1"
  let bestGap = Number.POSITIVE_INFINITY
  for (const ratio of ratios) {
    const gap = Math.abs(shape - Math.log(ratio.width / ratio.height))
    if (gap < bestGap) {
      best = ratio.value
      bestGap = gap
    }
  }
  return best
}

export function lengthOf(seconds: number): number {
  const frames = Math.round(seconds * framesPerSecond)
  const least = lengthBounds.min * framesPerSecond
  const most = lengthBounds.max * framesPerSecond
  return Math.min(most, Math.max(least, frames)) / framesPerSecond
}

function lengthProblem(seconds: number, limits: Limits): FieldProblem | null {
  if (limits.seconds === null) {
    return null
  }
  const rounded = Math.round(seconds * 10) / 10
  const shown = formatSeconds(rounded)
  if (rounded > limits.seconds.max) {
    return {
      name: limits.input,
      key: "field.asset.tooLong",
      values: { seconds: shown, max: limits.seconds.max },
    }
  }
  if (rounded < limits.seconds.min) {
    return {
      name: limits.input,
      key: "field.asset.tooShort",
      values: { seconds: shown, min: limits.seconds.min },
    }
  }
  return null
}

export function problemOf(
  facts: MediaFacts,
  limits: Limits
): FieldProblem | null {
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
  const sizeUnread =
    limits.needs.size && (facts.width === null || facts.height === null)
  if (sizeUnread || (limits.needs.length && facts.seconds === null)) {
    return {
      name: limits.input,
      key: "field.asset.wrongKind",
      values: { kinds: tCatalog(limits.unreadableKey) },
    }
  }
  return facts.seconds === null ? null : lengthProblem(facts.seconds, limits)
}
