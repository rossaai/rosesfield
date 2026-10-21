import { AspectRatio } from "@rosesfield/kernel"
import { useEffect, useState } from "react"
import { useAssetSource } from "@/api/use-asset-source"

export type ClipFacts = {
  assetId: string
  seconds: number
  width: number
  height: number
}

export const clipMimes: readonly string[] = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
]

const sameFormatGap = 0.04

export function useClipFacts(assetId: string | null): ClipFacts | null {
  const id = assetId ?? ""
  const source = useAssetSource(id)
  const src = source.state === "ready" ? source.src : null
  const [facts, setFacts] = useState<ClipFacts | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.videoWidth > 0) {
        setFacts({
          assetId: id,
          seconds: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        })
      }
    }
    video.src = src
    return () => {
      video.onloadedmetadata = null
      video.removeAttribute("src")
    }
  }, [id, src])
  return facts?.assetId === id ? facts : null
}

function gapBetween(
  facts: Pick<ClipFacts, "width" | "height">,
  ratio: string
): number {
  const parsed = AspectRatio.parse(ratio)
  return Math.abs(
    Math.log(facts.width / facts.height / (parsed.width / parsed.height))
  )
}

export function nearestRatio(
  facts: Pick<ClipFacts, "width" | "height">,
  options: readonly string[]
): string | null {
  let best: string | null = null
  let bestGap = Number.POSITIVE_INFINITY
  for (const option of options) {
    if (!AspectRatio.isValid(option)) {
      continue
    }
    const gap = gapBetween(facts, option)
    if (gap < bestGap) {
      best = option
      bestGap = gap
    }
  }
  return best
}

export function hasSameFormat(
  facts: Pick<ClipFacts, "width" | "height">,
  ratio: string
): boolean {
  if (!AspectRatio.isValid(ratio)) {
    return false
  }
  return gapBetween(facts, ratio) <= Math.log(1 + sameFormatGap)
}
