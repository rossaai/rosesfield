import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import type {
  FileFacts,
  FileReading,
  UpscaleMode,
} from "@/studio/upscale/upscale-limits"

export const readLimitMs = 20_000

type Found = {
  width: number | null
  height: number | null
  seconds: number | null
}

type Measured = Found & { assetId: string }

const nothing: Found = { width: null, height: null, seconds: null }

function measureImage(src: string, done: (found: Found) => void): () => void {
  const image = new Image()
  image.onload = () =>
    done({
      width: image.naturalWidth,
      height: image.naturalHeight,
      seconds: null,
    })
  image.onerror = () => done(nothing)
  image.src = src
  return () => {
    image.onload = null
    image.onerror = null
    image.removeAttribute("src")
  }
}

function measureVideo(src: string, done: (found: Found) => void): () => void {
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.onloadedmetadata = () =>
    done({
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      seconds: Number.isFinite(video.duration) ? video.duration : null,
    })
  video.onerror = () => done(nothing)
  video.src = src
  return () => {
    video.onloadedmetadata = null
    video.onerror = null
    video.removeAttribute("src")
  }
}

export function useFileFacts(
  assetId: string | null,
  mode: UpscaleMode
): FileReading {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const stored = asset.data?.asset.id === id ? asset.data.asset : null
  const needsMeasure =
    stored !== null &&
    (stored.width === null ||
      stored.height === null ||
      (mode === "video" && stored.durationSeconds === null))
  const source = useAssetSource(needsMeasure ? id : "")
  const src = source.state === "ready" && needsMeasure ? source.src : null
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const done = (found: Found) => setMeasured({ ...found, assetId: id })
    const stop =
      mode === "video" ? measureVideo(src, done) : measureImage(src, done)
    const timer = setTimeout(() => {
      setMeasured((current) =>
        current?.assetId === id ? current : { ...nothing, assetId: id }
      )
    }, readLimitMs)
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [id, mode, src])
  const own: Found | null =
    !needsMeasure || source.state === "failed"
      ? nothing
      : measured?.assetId === id
        ? measured
        : null
  const mime = stored?.mime ?? ""
  const bytes = stored?.bytes ?? 0
  const width = stored?.width ?? own?.width ?? null
  const height = stored?.height ?? own?.height ?? null
  const seconds = stored?.durationSeconds ?? own?.seconds ?? null
  const facts = useMemo<FileFacts>(
    () => ({ mime, bytes, width, height, seconds }),
    [mime, bytes, width, height, seconds]
  )
  if (id === "") {
    return { state: "none" }
  }
  if (asset.isError) {
    return { state: "failed" }
  }
  return stored !== null && own !== null
    ? { state: "read", facts }
    : { state: "reading" }
}
