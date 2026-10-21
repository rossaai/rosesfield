import { AspectRatio } from "@rosesfield/kernel"
import { formatBytes, formatChoices, formatNumber } from "@/copy/format"
import { t } from "@/copy/t"

export type PhotoSize = { width: number; height: number }

export type PhotoFacts = {
  mime: string
  bytes: number
  size: PhotoSize | null
}

export type PhotoRefusal =
  | { kind: "format" }
  | { kind: "bytes"; bytes: number }
  | { kind: "small"; side: number }

export const photoFormats: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
]

export const largestPhotoBytes = 20_000_000

export const shortestPhotoSide = 480

export function photoRefusalOf(facts: PhotoFacts): PhotoRefusal | null {
  if (!photoFormats.includes(facts.mime)) {
    return { kind: "format" }
  }
  if (facts.bytes > largestPhotoBytes) {
    return { kind: "bytes", bytes: facts.bytes }
  }
  if (facts.size === null) {
    return { kind: "format" }
  }
  const { width, height } = facts.size
  return Math.min(width, height) < shortestPhotoSide
    ? { kind: "small", side: Math.min(width, height) }
    : null
}

export function photoRefusalText(refusal: PhotoRefusal): string {
  switch (refusal.kind) {
    case "format":
      return t("field.asset.wrongKind", {
        kinds: formatChoices([
          t("format.png"),
          t("format.jpeg"),
          t("format.webp"),
        ]),
      })
    case "bytes":
      return t("field.asset.tooLarge", {
        size: formatBytes(refusal.bytes),
        limit: formatBytes(largestPhotoBytes),
      })
    case "small":
      return t("field.asset.wrongKind", {
        kinds: t("field.limits.shortSide", {
          min: formatNumber(shortestPhotoSide),
        }),
      })
  }
}

export async function sizeOfBlob(blob: Blob): Promise<PhotoSize | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

export async function fileFactsOf(file: File): Promise<PhotoFacts> {
  const isListed = photoFormats.includes(file.type)
  return {
    mime: file.type,
    bytes: file.size,
    size:
      isListed && file.size <= largestPhotoBytes
        ? await sizeOfBlob(file)
        : null,
  }
}

export function nearestRatio(
  options: readonly string[],
  size: PhotoSize
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
