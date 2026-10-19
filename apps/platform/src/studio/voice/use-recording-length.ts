import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"

type Measured = { assetId: string; seconds: number }

export function useRecordingLength(assetId: string | null): number | null {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const stored = asset.data?.asset.durationSeconds ?? null
  const source = useAssetSource(id)
  const src = source.state === "ready" && stored === null ? source.src : null
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const audio = new Audio()
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setMeasured({ assetId: id, seconds: audio.duration })
      }
    }
    audio.src = src
    return () => {
      audio.onloadedmetadata = null
      audio.removeAttribute("src")
    }
  }, [id, src])
  if (id === "") {
    return null
  }
  return stored ?? (measured?.assetId === id ? measured.seconds : null)
}
