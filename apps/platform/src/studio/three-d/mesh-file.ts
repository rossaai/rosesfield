import { routes } from "@rosesfield/contract"
import { queryOptions, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { callRoute } from "@/api/call-route"
import { useDevice } from "@/device/device-context"
import { type MeshScene, parseGlb } from "@/studio/three-d/glb"

export type MeshFile = {
  blob: Blob
  scene: MeshScene | null
}

export const meshMime = "model/gltf-binary"

export function meshFileName(assetId: string): string {
  return `rosesfield-${assetId.slice(0, 8)}.glb`
}

export function meshQuery(assetId: string) {
  return queryOptions({
    queryKey: ["mesh", assetId],
    queryFn: async ({ signal }): Promise<MeshFile> => {
      const blob = await callRoute(routes.readAssetContent, {
        params: { assetId },
        signal,
      })
      return { blob, scene: parseGlb(await blob.arrayBuffer()) }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 300_000,
  })
}

export function useDownloadMesh(): (assetId: string) => Promise<void> {
  const client = useQueryClient()
  const device = useDevice()
  return useCallback(
    async (assetId: string) => {
      const file = await client.fetchQuery(meshQuery(assetId))
      const blob =
        file.blob.type === meshMime
          ? file.blob
          : new Blob([file.blob], { type: meshMime })
      await device.save({ name: meshFileName(assetId), blob })
    },
    [client, device]
  )
}
