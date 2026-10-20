import { routes } from "@rosesfield/contract"
import { useCallback } from "react"
import { callRoute, refusalOf } from "@/api/call-route"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { useDevice } from "@/device/device-context"
import type { ExploreEntry } from "@/screens/explore/explore-tile"

export function resultFileName(entry: ExploreEntry, mime: string): string {
  const { source } = entry
  const id = source.kind === "own" ? source.assetId : source.shareId
  const extension = mime.split("/")[1]?.split(";")[0] || "bin"
  return `rosesfield-${id.slice(0, 8)}.${extension}`
}

async function sharedBlob(src: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(src)
  } catch (error) {
    throw new GatewayUnreachableError({ cause: error })
  }
  if (!response.ok) {
    throw await refusalOf(response)
  }
  return response.blob()
}

export function useDownloadEntry(): (entry: ExploreEntry) => Promise<void> {
  const device = useDevice()
  return useCallback(
    async (entry: ExploreEntry) => {
      const { source } = entry
      const blob =
        source.kind === "own"
          ? await callRoute(routes.readAssetContent, {
              params: { assetId: source.assetId },
            })
          : await sharedBlob(source.src)
      await device.save({ name: resultFileName(entry, blob.type), blob })
    },
    [device]
  )
}
