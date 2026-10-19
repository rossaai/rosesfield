import { formatBytes, formatSeconds } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import type { FieldProblem } from "@/screens/app/app-form"
import type { MediaFacts } from "@/studio/motion/motion-checks"
import type { MediaReading } from "@/studio/motion/use-media-facts"
import { sourceInput } from "@/studio/recast/recast-modes"
import {
  isClipInBounds,
  longestClipSeconds,
  shortestClipSeconds,
} from "@/studio/recast/use-clip-facts"

export const largestClipBytes = 100_000_000

export const clipMimes: readonly string[] = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
]

export type ReadClip = { seconds: number; width: number; height: number }

function wrongKind(kindsKey: string): FieldProblem {
  return {
    name: sourceInput,
    key: "field.asset.wrongKind",
    values: { kinds: tCatalog(kindsKey) },
  }
}

function lengthProblem(seconds: number): FieldProblem | undefined {
  if (isClipInBounds({ seconds })) {
    return undefined
  }
  return seconds < shortestClipSeconds
    ? {
        name: sourceInput,
        key: "field.asset.tooShort",
        values: {
          seconds: formatSeconds(Math.floor(seconds * 10) / 10),
          min: shortestClipSeconds,
        },
      }
    : {
        name: sourceInput,
        key: "field.asset.tooLong",
        values: {
          seconds: formatSeconds(Math.ceil(seconds * 10) / 10),
          max: longestClipSeconds,
        },
      }
}

export function readClipOf(facts: MediaFacts): ReadClip | null {
  const { seconds, width, height } = facts
  if (seconds === null || width === null || height === null) {
    return null
  }
  return { seconds, width, height }
}

export function clipProblemOf(facts: MediaFacts): FieldProblem | undefined {
  if (!clipMimes.includes(facts.mime)) {
    return wrongKind("recast.formats.clip")
  }
  if (facts.bytes > largestClipBytes) {
    return {
      name: sourceInput,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(facts.bytes),
        limit: formatBytes(largestClipBytes),
      },
    }
  }
  const clip = readClipOf(facts)
  if (clip === null) {
    return wrongKind("recast.input.source.unreadable")
  }
  return lengthProblem(clip.seconds)
}

export function readingProblemOf(
  reading: MediaReading
): FieldProblem | undefined {
  switch (reading.state) {
    case "none":
    case "reading":
      return undefined
    case "failed":
      return wrongKind("recast.input.source.unreadable")
    case "read":
      return clipProblemOf(reading.facts)
  }
}
