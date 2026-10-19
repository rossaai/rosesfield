import type { AssetKind } from "@rosesfield/contract"
import type { EngineOutput } from "#domain/generation-engine.port"
import { mediaKindOf, mimeOf } from "#infrastructure/comfy/comfy-media"
import { isObject } from "#infrastructure/router/router-json"

export type Found =
  | { kind: "url"; url: string }
  | {
      kind: "bytes"
      bytes: Uint8Array
      mime: string
    }

type Download = (url: string) => Promise<Response>

const base64Keys =
  /^(b64_json|bytesBase64Encoded|base64|data|image_base64|audio_base64|video_base64)$/

const maxOutputs = 16

const maxDepth = 12

export async function outputsOf(
  response: Response,
  download: Download
): Promise<EngineOutput[]> {
  const mime = mimeOf(response.headers.get("content-type"))
  if (!mime.includes("json")) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    return [outputOf(sniffed(bytes, mime), bytes)]
  }
  const document: unknown = await response.json()
  const found = findMedia(document)
  const outputs = (
    await Promise.all(
      found.slice(0, maxOutputs).map((one) => fetchFound(one, download))
    )
  ).filter((output): output is EngineOutput => output !== null)
  const text = outputs.length === 0 ? textOutputOf(document) : null
  return text === null ? outputs : [text]
}

export function textOutputOf(document: unknown): EngineOutput | null {
  const text = textOf(document)
  return text === null
    ? null
    : outputOf("text/plain", new TextEncoder().encode(text))
}

export function findMedia(document: unknown): Found[] {
  const found: Found[] = []
  const seen = new Set<string>()
  walk(document, null, 0, (one) => {
    const key = one.kind === "url" ? one.url : `${one.bytes.length}:${one.mime}`
    if (!seen.has(key)) {
      seen.add(key)
      found.push(one)
    }
  })
  return found
}

function walk(
  value: unknown,
  key: string | null,
  depth: number,
  add: (found: Found) => void
): void {
  if (depth > maxDepth) {
    return
  }
  if (typeof value === "string") {
    const one = foundOf(value, key)
    if (one !== null) {
      add(one)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, key, depth + 1, add)
    }
    return
  }
  if (isObject(value)) {
    for (const [child, item] of Object.entries(value)) {
      walk(item, child, depth + 1, add)
    }
  }
}

function foundOf(value: string, key: string | null): Found | null {
  if (/^https?:\/\/\S+$/.test(value)) {
    return { kind: "url", url: value }
  }
  const inline = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i.exec(value)
  if (inline !== null) {
    const bytes = bytesOf(inline[2] ?? "")
    return bytes === null
      ? null
      : { kind: "bytes", bytes, mime: inline[1] ?? "" }
  }
  if (key !== null && base64Keys.test(key) && value.length > 64) {
    const bytes = bytesOf(value)
    return bytes === null
      ? null
      : { kind: "bytes", bytes, mime: sniffed(bytes, "") }
  }
  return null
}

async function fetchFound(
  found: Found,
  download: Download
): Promise<EngineOutput | null> {
  if (found.kind === "bytes") {
    return isMedia(found.mime) ? outputOf(found.mime, found.bytes) : null
  }
  try {
    const response = await download(found.url)
    const bytes = new Uint8Array(await response.arrayBuffer())
    const mime = sniffed(bytes, mimeOf(response.headers.get("content-type")))
    return isMedia(mime) ? outputOf(mime, bytes) : null
  } catch {
    return null
  }
}

function outputOf(mime: string, bytes: Uint8Array): EngineOutput {
  return {
    kind: kindOf(mime),
    mime,
    bytes,
    width: null,
    height: null,
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
