import { routes } from "@rosesfield/contract"
import { AspectRatio } from "@rosesfield/kernel"
import { useQuery } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"

export type ImageSize = { width: number; height: number }

export type ImageFacts = {
  mime: string
  bytes: number
  size: ImageSize | null
}

export const imageFormats: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
]
export const largestImageBytes = 20_000_000
export const shortestSide = 256
const widestRatio = 16 / 9
const ratioSlack = 0.005

export function refusalOf(facts: ImageFacts): string | null {
  if (!imageFormats.includes(facts.mime)) {
    return t("field.asset.wrongKind", {
      kinds: tCatalog("angles.input.image.formats"),
    })
  }
  if (facts.bytes > largestImageBytes) {
    return t("field.asset.tooLarge", {
      size: formatBytes(facts.bytes),
      limit: formatBytes(largestImageBytes),
    })
  }
  if (facts.size === null) {
    return tCatalog("angles.input.image.unreadable")
  }
  const { width, height } = facts.size
  if (Math.min(width, height) < shortestSide) {
    return tCatalog("angles.input.image.tooSmall", {
      width,
      height,
      min: shortestSide,
    })
  }
  const ratio = width / height
  if (
    ratio > widestRatio + ratioSlack ||
    ratio < 1 / widestRatio - ratioSlack
  ) {
    return tCatalog("angles.input.image.badRatio", { width, height })
  }
  return null
}

export function nearestRatio(
  options: readonly string[],
  size: ImageSize
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

async function sizeOf(assetId: string): Promise<ImageSize | null> {
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

export type ImageReading =
  | { state: "none" }
  | { state: "reading" }
  | { state: "failed"; retry: () => void }
  | { state: "read"; facts: ImageFacts }

export function useImageFacts(assetId: string | null): ImageReading {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const found = asset.data?.asset
  const stored =
    found === undefined || found.width === null || found.height === null
      ? null
      : { width: found.width, height: found.height }
  const size = useQuery({
    queryKey: ["angles", "image-size", id],
    queryFn: () => sizeOf(id),
    enabled: id !== "" && found !== undefined && stored === null,
    staleTime: Number.POSITIVE_INFINITY,
  })
  if (id === "") {
    return { state: "none" }
  }
  if (asset.isError || size.isError) {
    return {
      state: "failed",
      retry: () => {
        if (asset.isError) {
          void asset.refetch()
        }
        if (size.isError) {
          void size.refetch()
        }
      },
    }
  }
  if (found === undefined || (stored === null && !size.isSuccess)) {
    return { state: "reading" }
  }
  return {
    state: "read",
    facts: {
      mime: found.mime,
      bytes: found.bytes,
      size: stored ?? size.data ?? null,
    },
  }
}
