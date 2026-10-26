import type { AssetKind } from "@rosesfield/contract"
import type { EngineOutput } from "#domain/generation-engine.port"

export const meshMime = "model/gltf-binary"

const glbMagic = "glTF"

export function mimeOf(contentType: string | null): string {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase() ?? ""
  return mime === "" ? "application/octet-stream" : mime
}

export function isGlb(bytes: Uint8Array): boolean {
  return String.fromCharCode(...bytes.subarray(0, 4)) === glbMagic
}

export function mediaKindOf(mime: string): AssetKind | null {
  if (mime === meshMime) {
    return "mesh"
  }
  const family = mime.split("/")[0]
  return family === "image" || family === "video" || family === "audio"
    ? family
    : null
}

export function extensionOf(mime: string): string {
  if (mime === meshMime) {
    return "glb"
  }
  const subtype = mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") ?? ""
  return subtype === "" ? "bin" : subtype
}

export function meshOutputOf(bytes: Uint8Array): EngineOutput {
  return {
    kind: "mesh",
    mime: meshMime,
    bytes,
    width: null,
    height: null,
    durationSeconds: null,
  }
}

export function outputKindOf(type: string, contentType: string): AssetKind {
  return type === "video" || type === "audio" || type === "text"
    ? type
    : (mediaKindOf(mimeOf(contentType)) ?? "image")
}
