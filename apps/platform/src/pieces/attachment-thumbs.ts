import { type Asset, type Character, routes } from "@rosesfield/contract"
import type { PromptAttachment } from "@rosesfield/ui/components/prompt-bar"
import { useQueries } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { assetQuery, characterQuery } from "@/api/queries"
import { assetBlobKey } from "@/api/query-client"
import { assetContentPath } from "@/api/use-asset-source"
import { sendsCredentials } from "@/api/visitor-keys"
import { assetLabel } from "@/pieces/asset-name"

const blankPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

function useSources(assetIds: readonly string[]): Array<string | null> {
  const needsToken = sendsCredentials()
  const blobs = useQueries({
    queries: assetIds.map((assetId) => ({
      queryKey: [assetBlobKey, assetId],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        URL.createObjectURL(
          await callRoute(routes.readAssetContent, {
            params: { assetId },
            signal,
          })
        ),
      enabled: needsToken && assetId !== "",
      staleTime: Number.POSITIVE_INFINITY,
    })),
  })
  return assetIds.map((assetId, index) => {
    if (assetId === "") {
      return null
    }
    return needsToken ? (blobs[index]?.data ?? null) : assetContentPath(assetId)
  })
}

function thumbOf(
  id: string,
  asset: Asset | undefined,
  src: string | null,
  caption: string | undefined
): PromptAttachment {
  const isImage = asset?.kind === "image"
  return {
    id,
    src: isImage && src !== null ? src : blankPixel,
    alt: asset === undefined ? "" : assetLabel(asset),
    ...(caption === undefined ? {} : { caption }),
  }
}

export function useAssetThumbs(
  assetIds: readonly string[],
  captionOf?: (assetId: string) => string | undefined
): PromptAttachment[] {
  const assets = useQueries({ queries: assetIds.map((id) => assetQuery(id)) })
  const sources = useSources(assetIds)
  return assetIds.map((id, index) =>
    thumbOf(
      id,
      assets[index]?.data?.asset,
      sources[index] ?? null,
      captionOf?.(id)
    )
  )
}

export function useCharacterThumbs(
  characterIds: readonly string[]
): PromptAttachment[] {
  const characters = useQueries({
    queries: characterIds.map((id) => characterQuery(id)),
  })
  const firsts = characters.map(
    (query) => query.data?.character.references[0] ?? ""
  )
  const sources = useSources(firsts)
  return characterIds.map((id, index) => {
    const character: Character | undefined = characters[index]?.data?.character
    return {
      id,
      src: sources[index] ?? blankPixel,
      alt: character?.name ?? "",
      ...(character === undefined ? {} : { caption: character.name }),
    }
  })
}
