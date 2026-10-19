import type { AssetKind } from "@rosesfield/contract"

type MediaType = {
  kind: AssetKind
  mime: string
}

const chunkSize = 0x8000

const mediaTypes: Readonly<Record<string, MediaType>> = {
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
  gif: { kind: "image", mime: "image/gif" },
  mp4: { kind: "video", mime: "video/mp4" },
  webm: { kind: "video", mime: "video/webm" },
  mov: { kind: "video", mime: "video/quicktime" },
  wav: { kind: "audio", mime: "audio/wav" },
  mp3: { kind: "audio", mime: "audio/mpeg" },
  flac: { kind: "audio", mime: "audio/flac" },
  ogg: { kind: "audio", mime: "audio/ogg" },
}

export function mediaTypeOf(filename: string): MediaType | null {
  const extension = filename.split(".").at(-1)?.toLowerCase() ?? ""
  return Object.hasOwn(mediaTypes, extension)
    ? (mediaTypes[extension] ?? null)
    : null
}

export function base64Of(bytes: Uint8Array): string {
  let binary = ""
  for (let start = 0; start < bytes.length; start += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize))
  }
  return btoa(binary)
}

export function bytesOfBase64(data: string): Uint8Array {
  const comma = data.startsWith("data:") ? data.indexOf(",") : -1
  const binary = atob(comma === -1 ? data : data.slice(comma + 1))
  return Uint8Array.from(binary, (letter) => letter.charCodeAt(0))
}
