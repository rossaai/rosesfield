import type { CatalogModel, ModelTag } from "@rosesfield/catalog/comfy"
import { formatBytes, formatSeconds } from "@/copy/format"
import { assetLimitsText } from "@/pieces/asset-limits"
import { type ClipFacts, clipMimes } from "@/pieces/use-clip-facts"
import type { FieldProblem } from "@/screens/app/app-form"
import {
  largestClipBytes,
  longestClipSeconds,
  shortestClipSeconds,
} from "@/studio/video-edit/clip-limits"

export type ClipLimit = {
  min: number
  max: number
}

type LengthTag = Extract<ModelTag, { kind: "length" }>

function isLengthTag(tag: ModelTag): tag is LengthTag {
  return tag.kind === "length"
}

export function clipLimitOf(model: CatalogModel | null): ClipLimit {
  const length =
    model?.kind === "hosted" ? model.tags.find(isLengthTag) : undefined
  return {
    min: shortestClipSeconds,
    max:
      length === undefined
        ? longestClipSeconds
        : Math.max(shortestClipSeconds, length.max),
  }
}

export function clipLimitsText(limit: ClipLimit): string {
  return assetLimitsText({
    formats: clipMimes,
    bytes: largestClipBytes,
    seconds: limit,
  })
}

export function clipProblemOf(
  name: string,
  clip: ClipFacts | null,
  bytes: number | null,
  limit: ClipLimit
): FieldProblem | undefined {
  if (bytes !== null && bytes > largestClipBytes) {
    return {
      name,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(bytes),
        limit: formatBytes(largestClipBytes),
      },
    }
  }
  if (clip === null) {
    return undefined
  }
  const seconds = formatSeconds(clip.seconds)
  if (clip.seconds < limit.min) {
    return {
      name,
      key: "field.asset.tooShort",
      values: { seconds, min: limit.min },
    }
  }
  return clip.seconds > limit.max
    ? {
        name,
        key: "field.asset.tooLong",
        values: { seconds, max: limit.max },
      }
    : undefined
}
