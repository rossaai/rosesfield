import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import {
  type Measured,
  measureImage,
  readLimitMs,
} from "@/studio/motion/media-measure"
import type { MediaFacts } from "@/studio/motion/motion-checks"

export { readLimitMs } from "@/studio/motion/media-measure"

function measureVideo(src: string, done: (measured: Measured) => void) {
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.onloadedmetadata = () =>
    done({
      assetId: "",
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      seconds: Number.isFinite(video.duration) ? video.duration : null,
    })
  video.onerror = () =>
    done({ assetId: "", width: null, height: null, seconds: null })
  video.src = src
  return () => {
    video.onloadedmetadata = null
    video.onerror = null
    video.removeAttribute("src")
  }
}

export type MediaReading =
  | { state: "none" }
  | { state: "reading" }
  | { state: "failed" }
  | { state: "read"; facts: MediaFacts }

export function useMediaFacts(
  assetId: string | null,
  kind: "image" | "video"
): MediaReading {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const stored = asset.data?.asset ?? null
  const source = useAssetSource(id)
  const src = source.state === "ready" ? source.src : null
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const measure = kind === "image" ? measureImage : measureVideo
    return measure(src, (found) => setMeasured({ ...found, assetId: id }))
  }, [id, src, kind])
  useEffect(() => {
    if (id === "") {
      return
    }
    const timer = setTimeout(() => {
      setMeasured((current) =>
        current?.assetId === id
          ? current
          : { assetId: id, width: null, height: null, seconds: null }
      )
    }, readLimitMs)
    return () => clearTimeout(timer)
  }, [id])
  const own: Measured | null =
    source.state === "failed"
      ? { assetId: id, width: null, height: null, seconds: null }
      : measured?.assetId === id
        ? measured
        : null
  const ready = stored !== null && own !== null
  const mime = stored?.mime ?? ""
  const bytes = stored?.bytes ?? 0
  const width = stored?.width ?? own?.width ?? null
  const height = stored?.height ?? own?.height ?? null
  const seconds = stored?.durationSeconds ?? own?.seconds ?? null
  const facts = useMemo<MediaFacts>(
    () => ({ mime, bytes, width, height, seconds }),
    [mime, bytes, width, height, seconds]
  )
  if (id === "") {
    return { state: "none" }
  }
  if (asset.isError) {
    return { state: "failed" }
  }
  return ready ? { state: "read", facts } : { state: "reading" }
}
