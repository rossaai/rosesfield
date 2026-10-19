import type { AssetKind } from "@rosesfield/contract"

export function mimeOf(contentType: string | null): string {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase() ?? ""
  return mime === "" ? "application/octet-stream" : mime
}

export function mediaKindOf(mime: string): AssetKind | null {
  const family = mime.split("/")[0]
  return family === "image" || family === "video" || family === "audio"
    ? family
    : null
}

export function extensionOf(mime: string): string {
  const subtype = mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") ?? ""
  return subtype === "" ? "bin" : subtype
}
