import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import type { PhotoFacts, PhotoReading } from "@/studio/try-on/try-on-limits"

export const readLimitMs = 20_000

type Found = { width: number | null; height: number | null }

type Measured = Found & { assetId: string }

const nothing: Found = { width: null, height: null }

function measure(src: string, done: (found: Found) => void): () => void {
  const image = new Image()
  image.onload = () =>
    done({ width: image.naturalWidth, height: image.naturalHeight })
  image.onerror = () => done(nothing)
  image.src = src
  return () => {
    image.onload = null
    image.onerror = null
    image.removeAttribute("src")
  }
}

export function usePhotoFacts(assetId: string | null): PhotoReading {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const stored = asset.data?.asset.id === id ? asset.data.asset : null
  const needsMeasure =
    stored !== null && (stored.width === null || stored.height === null)
  const source = useAssetSource(needsMeasure ? id : "")
  const src = source.state === "ready" && needsMeasure ? source.src : null
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const stop = measure(src, (found) => setMeasured({ ...found, assetId: id }))
    const timer = setTimeout(() => {
      setMeasured((current) =>
        current?.assetId === id ? current : { ...nothing, assetId: id }
      )
    }, readLimitMs)
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [id, src])
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
  const facts = useMemo<PhotoFacts>(
    () => ({ mime, bytes, width, height }),
    [mime, bytes, width, height]
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
