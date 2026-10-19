import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import {
  type ImageReading,
  type Size,
  type StoredFacts,
  storedProblemOf,
} from "@/studio/background-removal/image-limits"

export const measureLimitMs = 20_000

type Measured = { assetId: string; attempt: number; size: Size | null }

function measure(src: string, done: (size: Size | null) => void): () => void {
  const image = new Image()
  image.onload = () =>
    done(
      image.naturalWidth > 0 && image.naturalHeight > 0
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : null
    )
  image.onerror = () => done(null)
  image.src = src
  return () => {
    image.onload = null
    image.onerror = null
    image.removeAttribute("src")
  }
}

function useMeasured(
  id: string,
  src: string | null,
  attempt: number
): Measured | null {
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = (size: Size | null) => {
      clearTimeout(timer)
      stop()
      setMeasured({ assetId: id, attempt, size })
    }
    const stop = measure(src, done)
    timer = setTimeout(() => done(null), measureLimitMs)
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [attempt, id, src])
  return measured
}

export function useImageFacts(assetId: string | null): ImageReading {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const record = asset.data?.asset.id === id ? asset.data.asset : null
  const stored: StoredFacts | null =
    record === null ? null : { mime: record.mime, bytes: record.bytes }
  const storedSize: Size | null =
    record === null || record.width === null || record.height === null
      ? null
      : { width: record.width, height: record.height }
  const needsMeasure =
    stored !== null && storedSize === null && storedProblemOf(stored) === null
  const source = useAssetSource(needsMeasure ? id : "")
  const src = source.state === "ready" && needsMeasure ? source.src : null
  const [attempt, setAttempt] = useState(0)
  const measured = useMeasured(id, src, attempt)
  const retry = (): void => {
    setAttempt((current) => current + 1)
    if (asset.isError) {
      void asset.refetch()
    }
    if (source.state === "failed") {
      source.retry()
    }
  }
  if (id === "") {
    return { state: "none" }
  }
  if (asset.isError && record === null) {
    return { state: "failed", stored: null, retry }
  }
  if (stored === null) {
    return { state: "reading", stored: null }
  }
  if (storedSize !== null) {
    return { state: "read", facts: { ...stored, ...storedSize } }
  }
  if (!needsMeasure) {
    return { state: "reading", stored }
  }
  if (source.state === "failed") {
    return { state: "failed", stored, retry }
  }
  const found =
    measured?.assetId === id && measured.attempt === attempt ? measured : null
  if (found === null) {
    return { state: "reading", stored }
  }
  return found.size === null
    ? { state: "failed", stored, retry }
    : { state: "read", facts: { ...stored, ...found.size } }
}
