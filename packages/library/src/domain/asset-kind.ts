import type { AssetKind } from "@rosesfield/contract"

const meshMime = "model/gltf-binary"

export function kindOfMime(mime: string): AssetKind | null {
  if (mime === meshMime) {
    return "mesh"
  }
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
