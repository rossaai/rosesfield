import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import type { Size } from "../../../../../packages/catalog/src/expand/expand-plan"

export type PhotoFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
}

export type PhotoRead =
  | { state: "empty" }
  | { state: "reading"; facts: PhotoFacts | null }
  | { state: "unreadable"; facts: PhotoFacts | null }
  | { state: "read"; facts: PhotoFacts; size: Size }

type Measured =
  | { assetId: string; state: "read"; width: number; height: number }
  | { assetId: string; state: "unreadable" }

export function usePhotoFacts(assetId: string | null): PhotoRead {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const stored = asset.data?.asset ?? null
  const needsMeasure =
    stored !== null && (stored.width === null || stored.height === null)
  const source = useAssetSource(needsMeasure ? id : "")
  const src = source.state === "ready" && needsMeasure ? source.src : null
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const image = new Image()
    image.onload = () =>
      setMeasured(
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? {
              assetId: id,
              state: "read",
              width: image.naturalWidth,
              height: image.naturalHeight,
            }
          : { assetId: id, state: "unreadable" }
      )
    image.onerror = () => setMeasured({ assetId: id, state: "unreadable" })
    image.src = src
    return () => {
      image.onload = null
      image.onerror = null
      image.removeAttribute("src")
    }
  }, [id, src])
  if (id === "") {
    return { state: "empty" }
  }
  if (stored === null || stored.id !== id) {
    return asset.isError
      ? { state: "unreadable", facts: null }
      : { state: "reading", facts: null }
  }
  const found = measured?.assetId === id ? measured : null
  const width = stored.width ?? (found?.state === "read" ? found.width : null)
  const height =
    stored.height ?? (found?.state === "read" ? found.height : null)
  const facts: PhotoFacts = {
    mime: stored.mime,
    bytes: stored.bytes,
    width,
    height,
  }
  if (width !== null && height !== null) {
    return { state: "read", facts, size: { width, height } }
  }
  if (found?.state === "unreadable" || source.state === "failed") {
    return { state: "unreadable", facts }
  }
  return { state: "reading", facts }
}
