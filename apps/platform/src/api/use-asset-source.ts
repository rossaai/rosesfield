import { type Asset, buildPath, routes } from "@rosesfield/contract"
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { callRoute } from "@/api/call-route"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { makePreview } from "@/api/make-preview"
import { assetQuery } from "@/api/queries"
import { assetBlobKey } from "@/api/query-client"
import { sendsCredentials } from "@/api/visitor-keys"

export type AssetSource =
  | { state: "loading" }
  | { state: "ready"; src: string }
  | { state: "failed"; retry: () => void }

export type TileSource =
  | { state: "loading" }
  | { state: "ready"; src: string; poster?: string; isPreview?: true }
  | { state: "failed"; retry: () => void }

type PreviewSource =
  | { state: "loading" }
  | { state: "ready"; src: string }
  | { state: "none" }

const assetLinkKey = "asset-link"
const linkFreshMs = 9 * 60_000
const blobKeepMs = 300_000
const sentPreviews = new Set<string>()

export function assetContentPath(assetId: string): string {
  return buildPath(routes.readAssetContent.path, { assetId })
}

export function assetPreviewKey(assetId: string): readonly string[] {
  return [assetBlobKey, "preview", assetId]
}

function isVisual(asset: Asset): asset is Asset & { kind: "image" | "video" } {
  return asset.kind === "image" || asset.kind === "video"
}

function useAssetLink(assetId: string, isEnabled: boolean) {
  return useQuery({
    queryKey: [assetLinkKey, assetId],
    queryFn: ({ signal }) =>
      callRoute(routes.linkAssetContent, { params: { assetId }, signal }),
    enabled: isEnabled,
    staleTime: linkFreshMs,
    gcTime: linkFreshMs,
  })
}

export function useAssetSource(assetId: string): AssetSource {
  const needsToken = sendsCredentials() && assetId !== ""
  const asset = useQuery({ ...assetQuery(assetId), enabled: needsToken })
  const kind = asset.data?.asset.kind
  const blob = useQuery({
    queryKey: [assetBlobKey, assetId],
    queryFn: async ({ signal }) => {
      const bytes = await callRoute(routes.readAssetContent, {
        params: { assetId },
        signal,
      })
      return URL.createObjectURL(bytes)
    },
    enabled: needsToken && kind !== undefined && kind !== "video",
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: blobKeepMs,
  })
  const link = useAssetLink(assetId, needsToken && kind === "video")
  if (assetId === "") {
    return { state: "loading" }
  }
  if (!sendsCredentials()) {
    return { state: "ready", src: assetContentPath(assetId) }
  }
  const held = kind === "video" ? link : blob
  const src = kind === "video" ? link.data?.url : blob.data
  if (src !== undefined) {
    return { state: "ready", src }
  }
  const failed = asset.isError ? asset : held.isError ? held : null
  if (failed !== null) {
    return { state: "failed", retry: () => void failed.refetch() }
  }
  return { state: "loading" }
}

export function previewQuery(assetId: string) {
  return queryOptions({
    queryKey: assetPreviewKey(assetId),
    queryFn: async ({ signal }): Promise<string | null> => {
      try {
        const bytes = await callRoute(routes.readAssetPreview, {
          params: { assetId },
          signal,
        })
        return URL.createObjectURL(bytes)
      } catch (error) {
        if (error instanceof GatewayRefusedError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: blobKeepMs,
  })
}

function useAssetPreview(asset: Asset): PreviewSource {
  const preview = useQuery({
    ...previewQuery(asset.id),
    enabled: isVisual(asset),
  })
  if (!isVisual(asset) || preview.isError || preview.data === null) {
    return { state: "none" }
  }
  return preview.data === undefined
    ? { state: "loading" }
    : { state: "ready", src: preview.data }
}

function useSendPreview(asset: Asset, src: string | null): void {
  const client = useQueryClient()
  useEffect(() => {
    if (src === null || !isVisual(asset) || sentPreviews.has(asset.id)) {
      return
    }
    sentPreviews.add(asset.id)
    const assetId = asset.id
    void makePreview(src, asset.kind)
      .then(async (made) => {
        if (made === null) {
          return
        }
        await callRoute(routes.putAssetPreview, {
          params: { assetId },
          body: made,
        })
        client.setQueryData(assetPreviewKey(assetId), URL.createObjectURL(made))
      })
      .catch(() => sentPreviews.delete(assetId))
  }, [asset, src, client])
}

export function useTileSource(asset: Asset): TileSource {
  const preview = useAssetPreview(asset)
  const isVideo = asset.kind === "video"
  const hasPicture = preview.state === "ready" && !isVideo
  const full = useAssetSource(
    preview.state === "loading" || hasPicture ? "" : asset.id
  )
  useSendPreview(
    asset,
    preview.state === "none" && full.state === "ready" ? full.src : null
  )
  if (preview.state === "loading") {
    return { state: "loading" }
  }
  if (hasPicture) {
    return { state: "ready", src: preview.src, isPreview: true }
  }
  if (full.state !== "ready") {
    return full
  }
  return preview.state === "ready"
    ? { state: "ready", src: full.src, poster: preview.src }
    : full
}
