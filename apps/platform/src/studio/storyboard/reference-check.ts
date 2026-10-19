import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { referenceLimits } from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

export type ReferenceFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
}

type Measured = { assetId: string; width: number; height: number }

export function useReferenceFacts(
  assetId: string | null
): ReferenceFacts | null {
  const id = assetId ?? ""
  const asset = useQuery({ ...assetQuery(id), enabled: id !== "" })
  const source = useAssetSource(id)
  const src = source.state === "ready" ? source.src : null
  const [measured, setMeasured] = useState<Measured | null>(null)
  useEffect(() => {
    if (src === null || id === "") {
      return
    }
    const image = new Image()
    image.onload = () =>
      setMeasured({
        assetId: id,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    image.src = src
    return () => {
      image.onload = null
    }
  }, [id, src])
  const stored = asset.data?.asset ?? null
  if (id === "" || stored === null) {
    return null
  }
  const own = measured?.assetId === id ? measured : null
  return {
    mime: stored.mime,
    bytes: stored.bytes,
    width: stored.width ?? own?.width ?? null,
    height: stored.height ?? own?.height ?? null,
  }
}

export function referenceMessage(facts: ReferenceFacts): string | null {
  if (!referenceLimits.mimes.some((mime) => mime === facts.mime)) {
    return t("field.asset.wrongKind", {
      kinds: tCatalog("storyboard.input.reference.formats"),
    })
  }
  if (facts.bytes > referenceLimits.maxBytes) {
    return t("field.asset.tooLarge", {
      size: formatBytes(facts.bytes),
      limit: formatBytes(referenceLimits.maxBytes),
    })
  }
  if (facts.width === null || facts.height === null) {
    return null
  }
  const side = Math.min(facts.width, facts.height)
  return side < referenceLimits.minShortSide
    ? tCatalog("storyboard.input.reference.tooSmall", { side })
    : null
}
