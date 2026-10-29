import { routes } from "@rosesfield/contract"
import { useQueries } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { callRoute } from "@/api/call-route"
import { assetQuery } from "@/api/queries"
import { assetContentPath } from "@/api/use-asset-source"
import { sendsCredentials } from "@/api/visitor-keys"
import {
  type Measured,
  measureImage,
  readLimitMs,
} from "@/studio/motion/media-measure"
import type { MediaReading } from "@/studio/motion/use-media-facts"

const unread = (assetId: string): Measured => ({
  assetId,
  width: null,
  height: null,
  seconds: null,
})

async function sourceOf(assetId: string): Promise<string> {
  if (!sendsCredentials()) {
    return assetContentPath(assetId)
  }
  const bytes = await callRoute(routes.readAssetContent, {
    params: { assetId },
  })
  return URL.createObjectURL(bytes)
}

function useMeasured(ids: readonly string[]): ReadonlyMap<string, Measured> {
  const [measured, setMeasured] = useState<ReadonlyMap<string, Measured>>(
    new Map()
  )
  const key = ids.join(",")
  useEffect(() => {
    const keep = (found: Measured): void =>
      setMeasured((current) => new Map(current).set(found.assetId, found))
    const stops = key
      .split(",")
      .filter((id) => id !== "")
      .map((assetId) => {
        let stop = (): void => undefined
        const timer = setTimeout(() => keep(unread(assetId)), readLimitMs)
        void sourceOf(assetId)
          .then((src) => {
            stop = measureImage(src, (found) => {
              clearTimeout(timer)
              keep({ ...found, assetId })
            })
          })
          .catch(() => keep(unread(assetId)))
        return () => {
          clearTimeout(timer)
          stop()
        }
      })
    return () => {
      for (const stop of stops) {
        stop()
      }
    }
  }, [key])
  return measured
}

/** Reads every photo in the well, so a photo this browser cannot open is found whichever place it holds. */
export function usePhotosReading(ids: readonly string[]): MediaReading[] {
  const assets = useQueries({ queries: ids.map((id) => assetQuery(id)) })
  const measured = useMeasured(ids)
  return ids.map((id, at): MediaReading => {
    const asset = assets[at]
    if (asset?.isError === true) {
      return { state: "failed" }
    }
    const stored = asset?.data?.asset ?? null
    const own = measured.get(id) ?? null
    if (stored === null || own === null) {
      return { state: "reading" }
    }
    return {
      state: "read",
      facts: {
        mime: stored.mime,
        bytes: stored.bytes,
        width: own.width,
        height: own.height,
        seconds: null,
      },
    }
  })
}
