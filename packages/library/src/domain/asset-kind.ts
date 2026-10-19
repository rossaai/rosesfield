import type { AssetKind } from "@rosesfield/contract"

export function kindOfMime(mime: string): AssetKind | null {
  const family = mime.split("/")[0]
  switch (family) {
    case "image":
    case "video":
    case "audio":
    case "text":
      return family
    default:
      return null
  }
}
