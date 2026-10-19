import { type Asset, routes } from "@rosesfield/contract"
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback } from "react"
import { callRoute } from "@/api/call-route"
import { useDevice } from "@/device/device-context"

const extensions: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "text/plain": "txt",
}

export function fileNameOf(asset: Asset): string {
  const extension = extensions[asset.mime] ?? asset.mime.split("/")[1] ?? "bin"
  return `rosesfield-${asset.id.slice(0, 8)}.${extension}`
}

export function useDownloadAsset(): (asset: Asset) => Promise<void> {
  const device = useDevice()
  return useCallback(
    async (asset: Asset) => {
      const blob = await callRoute(routes.readAssetContent, {
        params: { assetId: asset.id },
      })
      await device.save({ name: fileNameOf(asset), blob })
    },
    [device]
  )
}

export function useDeleteAssets(): UseMutationResult<
  void,
  Error,
  readonly string[]
> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (assetIds: readonly string[]) => {
      await Promise.all(
        assetIds.map((assetId) =>
          callRoute(routes.deleteAsset, { params: { assetId } })
        )
      )
    },
    onSettled: (_data, _error, assetIds) => {
      for (const assetId of assetIds) {
        client.removeQueries({ queryKey: ["asset", assetId] })
      }
      void client.invalidateQueries({ queryKey: ["assets"] })
    },
  })
}
