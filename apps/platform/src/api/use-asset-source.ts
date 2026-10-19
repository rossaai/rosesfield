import { buildPath, routes } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { readOwnerToken } from "@/api/owner-token"
import { assetBlobKey } from "@/api/query-client"

export type AssetSource =
  | { state: "loading" }
  | { state: "ready"; src: string }
  | { state: "failed"; retry: () => void }

export function assetContentPath(assetId: string): string {
  return buildPath(routes.readAssetContent.path, { assetId })
}

export function useAssetSource(assetId: string): AssetSource {
  const needsToken = readOwnerToken() !== null
  const blob = useQuery({
    queryKey: [assetBlobKey, assetId],
    queryFn: async ({ signal }) => {
      const bytes = await callRoute(routes.readAssetContent, {
        params: { assetId },
        signal,
      })
      return URL.createObjectURL(bytes)
    },
    enabled: needsToken && assetId !== "",
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 300_000,
  })
  if (assetId === "") {
    return { state: "loading" }
  }
  if (blob.data !== undefined) {
    return { state: "ready", src: blob.data }
  }
  if (!needsToken) {
    return { state: "ready", src: assetContentPath(assetId) }
  }
  if (blob.isError) {
    return { state: "failed", retry: () => void blob.refetch() }
  }
  return { state: "loading" }
}
