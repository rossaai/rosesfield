import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import type { MediaFacts } from "@/studio/lipsync/lipsync-checks"

export type MediaKind = "image" | "video" | "audio"

export const readLimitMs = 20_000

type Measured = {
  assetId: string
  width: number | null
  height: number | null
  seconds: number | null
}

type Found = Omit<Measured, "assetId">

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
  }
}

function measureMedia(
  element: HTMLVideoElement | HTMLAudioElement,
  src: string,
  done: (found: Found) => void
): () => void {
  element.preload = "metadata"
  element.muted = true
  element.onloadedmetadata = () =>
    done({
      width:
        element instanceof HTMLVideoElement ? element.videoWidth || null : null,
      height:
        element instanceof HTMLVideoElement
          ? element.videoHeight || null
          : null,
      seconds: Number.isFinite(element.duration) ? element.duration : null,
    })
  element.onerror = () => done(nothing)
  element.src = src
  return () => {
    element.onloadedmetadata = null
    element.onerror = null
    element.removeAttribute("src")
  }
}

function measure(
  kind: MediaKind,
  src: string,
  done: (found: Found) => void
): () => void {
  switch (kind) {
    case "image":
      return measureImage(src, done)
    case "video":
      return measureMedia(document.createElement("video"), src, done)
    case "audio":
      return measureMedia(new Audio(), src, done)
  }
}

export type MediaReading =
  | { state: "none" }
  | { state: "reading" }
  | { state: "failed" }
  | { state: "read"; facts: MediaFacts }

export function useMediaFacts(
  assetId: string | null,
  kind: MediaKind
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
    return measure(kind, src, (found) => setMeasured({ ...found, assetId: id }))
  }, [id, src, kind])
  const [lateId, setLateId] = useState<string | null>(null)
  useEffect(() => {
    if (id === "") {
      return
    }
    const timer = setTimeout(() => setLateId(id), readLimitMs)
    return () => clearTimeout(timer)
  }, [id])
  const late = lateId === id
  const own: Measured | null =
    measured?.assetId === id
      ? measured
      : source.state === "failed" || late
        ? { ...nothing, assetId: id }
        : null
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
  if (asset.isError || (late && stored === null)) {
    return { state: "failed" }
  }
  return stored !== null && own !== null
    ? { state: "read", facts }
    : { state: "reading" }
}
