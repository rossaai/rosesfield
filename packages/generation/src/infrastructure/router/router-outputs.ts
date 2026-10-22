import type { AssetKind, RunInputs } from "@rosesfield/contract"
import type { EngineOutput } from "#domain/generation-engine.port"
import {
  isGlb,
  mediaKindOf,
  meshMime,
  mimeOf,
} from "#infrastructure/comfy/comfy-media"
import { mediaSizeOf } from "#infrastructure/media-size"
import { isObject } from "#infrastructure/router/router-json"
import type {
  OutputLeaf,
  OutputPath,
} from "#infrastructure/router/router-output-paths"

export type Found =
  | { kind: "url"; url: string }
  | {
      kind: "bytes"
      bytes: Uint8Array
      mime: string
    }

type Download = (url: string) => Promise<Response>

export type OutputRead = {
  paths: readonly OutputPath[]
  written: ReadonlySet<string>
  download: Download
}

const maxOutputs = 16

const maxDepth = 12

const writtenUrl = /https?:\/\/[^\s"'<>]+/g

export async function outputsOf(
  response: Response,
  read: OutputRead
): Promise<EngineOutput[]> {
  const mime = mimeOf(response.headers.get("content-type"))
  if (!mime.includes("json")) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    return [outputOf(sniffed(bytes, mime), bytes)]
  }
  const document: unknown = await response.json()
  const found = findMedia(document, read.paths, read.written)
  const outputs = (
    await Promise.all(
      found.slice(0, maxOutputs).map((one) => fetchFound(one, read.download))
    )
  ).filter((output): output is EngineOutput => output !== null)
  const text = outputs.length === 0 ? textOutputOf(document) : null
  return text === null ? outputs : [text]
}

export function urlsWritten(inputs: RunInputs): Set<string> {
  const urls = new Set<string>()
  for (const value of Object.values(inputs)) {
    for (const text of Array.isArray(value) ? value : [value]) {
      for (const match of String(text).matchAll(writtenUrl)) {
        urls.add(match[0])
      }
    }
  }
  return urls
}

export function textOutputOf(document: unknown): EngineOutput | null {
  const text = textOf(document)
  return text === null
    ? null
    : outputOf("text/plain", new TextEncoder().encode(text))
}

export function findMedia(
  document: unknown,
  paths: readonly OutputPath[],
  written: ReadonlySet<string>
): Found[] {
  const found: Found[] = []
  const seen = new Set<string>()
  for (const path of paths) {
    for (const value of stringsAt(document, path.segments, 0)) {
      const one = foundOf(value, path.leaf, written)
      const key =
        one === null
          ? null
          : one.kind === "url"
            ? one.url
            : `${one.bytes.length}:${one.mime}`
      if (one !== null && key !== null && !seen.has(key)) {
        seen.add(key)
        found.push(one)
      }
    }
  }
  return found
}

function stringsAt(
  value: unknown,
  segments: readonly string[],
  index: number
): string[] {
  if (index === segments.length) {
    return typeof value === "string" ? [value] : []
  }
  const segment = segments[index]
  if (segment === "[]") {
    return Array.isArray(value)
      ? value.flatMap((item) => stringsAt(item, segments, index + 1))
      : []
  }
  if (!isObject(value) || segment === undefined) {
    return []
  }
  return stringsAt(
    Object.getOwnPropertyDescriptor(value, segment)?.value,
    segments,
    index + 1
  )
}

function foundOf(
  value: string,
  leaf: OutputLeaf,
  written: ReadonlySet<string>
): Found | null {
  const inline = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i.exec(value)
  if (inline !== null) {
    const bytes = bytesOf(inline[2] ?? "")
    return bytes === null
      ? null
      : {
          kind: "bytes",
          bytes,
          mime: sniffed(bytes, (inline[1] ?? "").toLowerCase()),
        }
  }
  if (leaf === "url") {
    return /^https:\/\/\S+$/.test(value) && !written.has(value)
      ? { kind: "url", url: value }
      : null
  }
  if (value.length <= 64) {
    return null
  }
  const bytes = bytesOf(value)
  return bytes === null
    ? null
    : { kind: "bytes", bytes, mime: sniffed(bytes, "") }
}

async function fetchFound(
  found: Found,
  download: Download
): Promise<EngineOutput | null> {
  if (found.kind === "bytes") {
    return isMedia(found.mime) ? outputOf(found.mime, found.bytes) : null
  }
  const response = await download(found.url)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const mime = sniffed(bytes, mimeOf(response.headers.get("content-type")))
  return isMedia(mime) ? outputOf(mime, bytes) : null
}

function outputOf(mime: string, bytes: Uint8Array): EngineOutput {
  const size = mediaSizeOf(bytes)
  return {
    kind: kindOf(mime),
    mime,
    bytes,
    width: size?.width ?? null,
    height: size?.height ?? null,
    durationSeconds: null,
  }
}

function kindOf(mime: string): AssetKind {
  return mediaKindOf(mime) ?? "text"
}

function isMedia(mime: string): boolean {
  return mediaKindOf(mime) !== null
}

function sniffed(bytes: Uint8Array, given: string): string {
  if (
    given !== "" &&
    given !== "application/octet-stream" &&
    given !== "binary/octet-stream"
  ) {
    return given
  }
  if (isGlb(bytes)) {
    return meshMime
  }
  const head = [...bytes.subarray(0, 12)]
  const ascii = String.fromCharCode(...head)
  if (head[0] === 0x89 && ascii.slice(1, 4) === "PNG") {
    return "image/png"
  }
  if (head[0] === 0xff && head[1] === 0xd8) {
    return "image/jpeg"
  }
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") {
    return "image/webp"
  }
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE") {
    return "audio/wav"
  }
  if (ascii.slice(4, 8) === "ftyp") {
    return "video/mp4"
  }
  if (
    ascii.startsWith("ID3") ||
    (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0)
  ) {
    return "audio/mpeg"
  }
  return given === "" ? "application/octet-stream" : given
}

function bytesOf(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64.replace(/\s+/g, ""))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

function textOf(document: unknown): string | null {
  const parts: string[] = []
  walkText(document, null, 0, parts)
  const text = parts.join("\n").trim()
  return text === "" ? null : text
}

function walkText(
  value: unknown,
  key: string | null,
  depth: number,
  parts: string[]
): void {
  if (depth > maxDepth) {
    return
  }
  if (typeof value === "string" && (key === "text" || key === "output_text")) {
    parts.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) {
      walkText(item, key, depth + 1, parts)
    }
  } else if (isObject(value)) {
    for (const [child, item] of Object.entries(value)) {
      walkText(item, child, depth + 1, parts)
    }
  }
}
