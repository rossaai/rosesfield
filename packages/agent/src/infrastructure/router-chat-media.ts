import type { Asset, AssetKind } from "@rosesfield/contract"
import type {
  GetAssetHandler,
  ReadAssetContentHandler,
} from "@rosesfield/library"
import { agentCopy } from "#copy.en"
import { routerChatData } from "#infrastructure/router-chat-models"

export type MediaReads = {
  getAsset: GetAssetHandler
  readAssetContent: ReadAssetContentHandler
}

export type MediaPlan =
  | { send: "whole"; bytes: number }
  | { send: "first"; bytes: number; seconds: number }
  | { send: "none"; reason: "format" | "bound" }

type MediaBound = {
  bytes: number
  seconds: number
}

const mebibyte = 1024 * 1024

export const routerMedia = {
  perTurn: 4,
  turnBytes: 16 * mebibyte,
  readTimeoutMs: 15_000,
  ledgerTurns: 32,
  image: { side: 2000, base64Bytes: 1.5 * mebibyte, readBytes: 8 * mebibyte },
  audio: { bytes: 8 * mebibyte, seconds: 300 },
  video: { bytes: 8 * mebibyte, seconds: 60 },
  markPrefix: "rosesfield-media:",
  shownModels: 3,
}

const inlineImageTypes: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

const audioFormats: Readonly<Record<string, string>> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/vnd.wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/aiff": "aiff",
  "audio/x-aiff": "aiff",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
}

const videoTypes: Readonly<Record<string, string>> = {
  "video/mp4": "video/mp4",
  "video/mpeg": "video/mpeg",
  "video/quicktime": "video/mov",
  "video/mov": "video/mov",
  "video/webm": "video/webm",
}

const cutFormats: readonly string[] = ["wav", "mp3"]

export function isInlineImage(mime: string): boolean {
  return inlineImageTypes.includes(mime)
}

export function audioFormatOf(mime: string): string | null {
  return audioFormats[mime] ?? null
}

export function videoTypeOf(mime: string): string | null {
  return videoTypes[mime] ?? null
}

function boundOf(kind: AssetKind): MediaBound {
  return kind === "video" ? routerMedia.video : routerMedia.audio
}

function formatOf(asset: Asset): string | null {
  return asset.kind === "video"
    ? videoTypeOf(asset.mime)
    : audioFormatOf(asset.mime)
}

/** What one read of an audio or a video asset sends: the whole file, its first part within the bound, or nothing. */
export function mediaPlanOf(asset: Asset): MediaPlan {
  const bound = boundOf(asset.kind)
  const format = formatOf(asset)
  if (format === null || asset.bytes === 0) {
    return { send: "none", reason: "format" }
  }
  const seconds = asset.durationSeconds
  if (
    asset.bytes <= bound.bytes &&
    (seconds === null || seconds <= bound.seconds)
  ) {
    return { send: "whole", bytes: asset.bytes }
  }
  if (
    asset.kind !== "audio" ||
    !cutFormats.includes(format) ||
    seconds === null
  ) {
    return { send: "none", reason: "bound" }
  }
  const share = Math.min(bound.bytes / asset.bytes, bound.seconds / seconds)
  const sentSeconds = Math.floor(seconds * share)
  return sentSeconds < 1
    ? { send: "none", reason: "bound" }
    : {
        send: "first",
        bytes: Math.floor(asset.bytes * share),
        seconds: sentSeconds,
      }
}

export function planNoteOf(asset: Asset, plan: MediaPlan): string | null {
  const copy = agentCopy.media
  if (plan.send === "whole") {
    return null
  }
  if (plan.send === "first") {
    return copy.firstPart(plan.seconds)
  }
  const bound = boundOf(asset.kind)
  return plan.reason === "format"
    ? copy.format(asset.mime)
    : copy.overBound(asset.kind, bound.seconds, bound.bytes / mebibyte)
}

/** The note that the chosen model cannot see a kind, naming the highest ranked models of the table that can. */
export function unseenNoteOf(kind: AssetKind): string {
  const input = kind === "mesh" ? "image" : kind
  const models = routerChatData.models
    .filter((model) => model.inputs.some((one) => one === input))
    .slice(0, routerMedia.shownModels)
    .map((model) => model.name)
  return agentCopy.media.unseen(kind, models)
}

export function overNoteOf(): string {
  return agentCopy.media.over(
    routerMedia.perTurn,
    routerMedia.turnBytes / mebibyte
  )
}

export function mediaMarkOf(assetId: string): string {
  return `${routerMedia.markPrefix}${assetId}`
}

/** Standard base64, built 32 KiB at a time, because one `String.fromCharCode` call with megabytes of arguments overflows the stack. */
export function base64Of(bytes: Uint8Array): string {
  let binary = ""
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
  }
  return btoa(binary)
}

export function base64LengthOf(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4
}

/** The work's result, or null once `ms` pass first. */
export function withinTime<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms)
  })
  return Promise.race([work, late]).finally(() => clearTimeout(timer))
}

/** The first `bytes` bytes of an asset, read with a timeout, or null when the read fails, runs late or returns more. */
export async function readFirstBytes(
  read: ReadAssetContentHandler,
  assetId: string,
  bytes: number
): Promise<Uint8Array | null> {
  const work = read
    .execute({
      assetId,
      rangeOf: (size) => ({ start: 0, end: Math.min(size, bytes) - 1 }),
    })
    .then((content) => content.bytes)
    .catch(() => null)
  const found = await withinTime(work, routerMedia.readTimeoutMs)
  return found === null || found.length === 0 || found.length > bytes
    ? null
    : found
}

function isAscii(bytes: Uint8Array, at: number, text: string): boolean {
  return [...text].every(
    (char, index) => bytes[at + index] === char.charCodeAt(0)
  )
}

/** A WAV prefix made whole again: its RIFF and data sizes set to what the prefix holds, cut to whole sample frames. */
export function wavPrefixOf(bytes: Uint8Array): Uint8Array | null {
  if (!isAscii(bytes, 0, "RIFF") || !isAscii(bytes, 8, "WAVE")) {
    return null
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let block = 1
  for (let at = 12; at + 8 <= bytes.length; ) {
    const size = view.getUint32(at + 4, true)
    if (isAscii(bytes, at, "fmt ") && at + 22 <= bytes.length) {
      block = Math.max(1, view.getUint16(at + 20, true))
    }
    if (isAscii(bytes, at, "data")) {
      const start = at + 8
      const data = Math.floor((bytes.length - start) / block) * block
      const cut = bytes.slice(0, start + data)
      const cutView = new DataView(cut.buffer)
      cutView.setUint32(4, cut.length - 8, true)
      cutView.setUint32(at + 4, data, true)
      return data > 0 ? cut : null
    }
    at += 8 + size + (size % 2)
  }
  return null
}
