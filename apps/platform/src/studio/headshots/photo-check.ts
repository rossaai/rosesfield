import { routes } from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import type { PhotoCheck, PhotoSize } from "@/studio/effects/use-photo-checks"
import { photoLimits } from "../../../../../packages/catalog/src/headshots/headshots-values"

export type PhotoFacts = {
  mime: string
  bytes: number
  size: PhotoSize | null
}

const ratioSlack = 0.005

function isTakenFormat(mime: string): boolean {
  return photoLimits.formats.some((format) => format === mime)
}

export function photoLimitsText(): string {
  return assetLimitsText({
    formats: photoLimits.formats,
    bytes: photoLimits.largestBytes,
    shortSide: photoLimits.shortestSide,
    ratio: { min: "9:16", max: "16:9" },
  })
}

export function photoRefusalOf(facts: PhotoFacts): string | null {
  if (!isTakenFormat(facts.mime)) {
    return t("field.asset.wrongKind", {
      kinds: tCatalog("headshots.input.image.formats"),
    })
  }
  if (facts.bytes > photoLimits.largestBytes) {
    return t("field.asset.tooLarge", {
      size: formatBytes(facts.bytes),
      limit: formatBytes(photoLimits.largestBytes),
    })
  }
  if (facts.size === null) {
    return tCatalog("headshots.input.image.unreadable")
  }
  const { width, height } = facts.size
  if (Math.min(width, height) < photoLimits.shortestSide) {
    return tCatalog("headshots.input.image.tooSmall", {
      width,
      height,
      min: photoLimits.shortestSide,
    })
  }
  const ratio = width / height
  const widest = photoLimits.widestRatio
  if (ratio > widest + ratioSlack || ratio < 1 / widest - ratioSlack) {
    return tCatalog("headshots.input.image.badRatio", { width, height })
  }
  return null
}

async function measure(assetId: string): Promise<PhotoSize | null> {
  const blob = await callRoute(routes.readAssetContent, {
    params: { assetId },
  })
  try {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

export async function checkHeadshotPhoto(
  client: QueryClient,
  assetId: string
): Promise<PhotoCheck> {
  const { asset } = await client.fetchQuery(assetQuery(assetId))
  const stored =
    asset.width === null || asset.height === null
      ? null
      : { width: asset.width, height: asset.height }
  const isMeasurable =
    isTakenFormat(asset.mime) && asset.bytes <= photoLimits.largestBytes
  const size = stored ?? (isMeasurable ? await measure(assetId) : null)
  const refusal = photoRefusalOf({ mime: asset.mime, bytes: asset.bytes, size })
  if (refusal !== null || size === null) {
    return { refusal: refusal ?? tCatalog("headshots.input.image.unreadable") }
  }
  return { size }
}
