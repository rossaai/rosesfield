import {
  formatBytes,
  formatChoices,
  formatDuration,
  formatNumber,
  joinParts,
} from "@/copy/format"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"

export type AssetLimits = {
  formats: readonly string[]
  bytes: number
  seconds?: { min: number; max: number }
  shortSide?: number
  longSide?: number
  ratio?: { min: string; max: string }
}

const formatKeys: Readonly<Record<string, CopyKey>> = {
  "image/png": "format.png",
  "image/jpeg": "format.jpeg",
  "image/webp": "format.webp",
  "video/mp4": "format.mp4",
  "video/quicktime": "format.mov",
  "video/webm": "format.webm",
  "audio/mpeg": "format.mp3",
  "audio/wav": "format.wav",
}

function formatNames(mimes: readonly string[]): string[] {
  const names = mimes.flatMap((mime) => {
    const key = formatKeys[mime]
    return key === undefined ? [] : [t(key)]
  })
  return [...new Set(names)]
}

export function assetLimitsText(limits: AssetLimits): string {
  const { seconds, shortSide, longSide, ratio } = limits
  return joinParts([
    formatChoices(formatNames(limits.formats)),
    seconds === undefined
      ? null
      : t("field.limits.length", {
          min: formatNumber(seconds.min),
          max: formatDuration(seconds.max),
        }),
    t("field.limits.size", { size: formatBytes(limits.bytes) }),
    shortSide === undefined
      ? null
      : t("field.limits.shortSide", { min: formatNumber(shortSide) }),
    longSide === undefined
      ? null
      : t("field.limits.longSide", { max: formatNumber(longSide) }),
    ratio === undefined ? null : t("field.limits.ratio", ratio),
  ])
}
