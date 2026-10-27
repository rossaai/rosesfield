import type { Asset } from "@rosesfield/contract"
import { agentCopy } from "#copy.en"
import {
  audioFormatOf,
  base64Of,
  type MediaReads,
  mediaPlanOf,
  overNoteOf,
  planNoteOf,
  readFirstBytes,
  routerMedia,
  unseenNoteOf,
  videoTypeOf,
  wavPrefixOf,
  withinTime,
} from "#infrastructure/router-chat-media"
import {
  charge,
  fits,
  type MediaLedger,
  type TurnCount,
  turnOf,
} from "#infrastructure/router-chat-media-ledger"
import { routerChatModelOf } from "#infrastructure/router-chat-models"
import { textsOf, withTexts } from "#infrastructure/router-chat-tool-text"

type Message = Record<string, unknown>

type Part = Record<string, unknown>

type Rewrite = {
  inputs: ReadonlySet<string>
  reads: (() => MediaReads) | null
  sentBefore: number
  turn: TurnCount
}

const mediaParts: readonly string[] = ["image_url", "input_audio", "video_url"]
const ownedImageKinds: readonly string[] = ["image", "mesh"]
const markLine = new RegExp(
  `^${routerMedia.markPrefix}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$`
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function partsOf(message: Message): Part[] {
  return Array.isArray(message.content) ? message.content.filter(isRecord) : []
}

function isMediaPart(part: Part): boolean {
  return typeof part.type === "string" && mediaParts.includes(part.type)
}

function isAttachment(message: Message | undefined): boolean {
  return (
    message !== undefined &&
    message.role === "user" &&
    partsOf(message).some(isMediaPart)
  )
}

function textPart(text: string): Part {
  return { type: "text", text }
}

/** The index of the person's last message: a user message that carries no media, which pi's attachment of tool images does. */
function turnStartOf(messages: readonly Message[]): number {
  return messages.findLastIndex(
    (message) => message.role === "user" && !isAttachment(message)
  )
}

/**
 * The index of the last answer. Every tool result before it was carried by an earlier request, which the model answered.
 * An assistant line pi writes between tool results and their images is no answer.
 */
function lastAnswerOf(messages: readonly Message[]): number {
  return messages.findLastIndex(
    (message, at) =>
      message.role === "assistant" && !isAttachment(messages[at + 1])
  )
}

function imageBytesOf(part: Part): number {
  const url = isRecord(part.image_url) ? part.image_url.url : undefined
  const data = typeof url === "string" ? url.slice(url.indexOf(",") + 1) : ""
  return Math.floor((data.length * 3) / 4)
}

function mediaPartOf(asset: Asset, bytes: Uint8Array): Part | null {
  if (asset.kind === "audio") {
    const format = audioFormatOf(asset.mime)
    return format === null
      ? null
      : {
          type: "input_audio",
          input_audio: { data: base64Of(bytes), format },
        }
  }
  const type = videoTypeOf(asset.mime)
  return type === null
    ? null
    : {
        type: "video_url",
        video_url: { url: `data:${type};base64,${base64Of(bytes)}` },
      }
}

type Expanded = {
  note: string | null
  part: Part | null
}

const unread: Expanded = { note: agentCopy.media.unread, part: null }

function readsOf(rewrite: Rewrite): MediaReads | null {
  try {
    return rewrite.reads?.() ?? null
  } catch {
    return null
  }
}

async function expandedOf(
  assetId: string,
  key: string,
  rewrite: Rewrite
): Promise<Expanded> {
  const reads = readsOf(rewrite)
  if (reads === null) {
    return unread
  }
  const read = reads.getAsset.execute({ assetId }).catch(() => null)
  const found = await withinTime(read, routerMedia.readTimeoutMs)
  if (found === null) {
    return unread
  }
  const { asset } = found
  if (!rewrite.inputs.has(asset.kind)) {
    return { note: unseenNoteOf(asset.kind), part: null }
  }
  const plan = mediaPlanOf(asset)
  if (plan.send === "none") {
    return { note: planNoteOf(asset, plan), part: null }
  }
  if (!fits(rewrite.turn, key, plan.bytes)) {
    return { note: overNoteOf(), part: null }
  }
  const bytes = await readFirstBytes(
    reads.readAssetContent,
    assetId,
    plan.bytes
  )
  const sent =
    bytes !== null &&
    plan.send === "first" &&
    audioFormatOf(asset.mime) === "wav"
      ? wavPrefixOf(bytes)
      : bytes
  const part = sent === null ? null : mediaPartOf(asset, sent)
  if (sent === null || part === null) {
    return unread
  }
  charge(rewrite.turn, key, sent.length)
  return { note: null, part }
}

/** Whether a tool result is one whose image pi attaches: `read_asset`'s facts of an image or a 3D model that came with its picture. */
function ownsImage(message: Message): boolean {
  const text = textsOf(message)?.[0]
  if (text === undefined) {
    return false
  }
  try {
    const facts: unknown = JSON.parse(text.split("\n")[0] ?? "")
    const asset = isRecord(facts) ? facts.asset : undefined
    const kind = isRecord(asset) ? asset.kind : undefined
    const note = isRecord(facts) ? facts.note : undefined
    return (
      typeof kind === "string" &&
      ownedImageKinds.includes(kind) &&
      (note === undefined || note === agentCopy.media.preview)
    )
  } catch {
    return false
  }
}

type Batch = {
  tools: readonly { at: number; message: Message }[]
  attachment: { at: number; message: Message } | null
}

function batchAt(messages: readonly Message[], from: number): Batch {
  const tools: { at: number; message: Message }[] = []
  let at = from
  for (; messages[at]?.role === "tool"; at += 1) {
    tools.push({ at, message: messages[at] as Message })
  }
  const next = messages[at]
  return {
    tools,
    attachment:
      next !== undefined && isAttachment(next) ? { at, message: next } : null,
  }
}

function sizeOf(batch: Batch): number {
  return batch.tools.length + (batch.attachment === null ? 0 : 1)
}

function earlierTextOf(text: string): string {
  return text
    .split("\n")
    .map((line) => (markLine.test(line) ? agentCopy.media.earlier : line))
    .join("\n")
}

function earlierToolOf(message: Message): Message {
  const texts = textsOf(message)
  return texts === null ? message : withTexts(message, texts.map(earlierTextOf))
}

function earlierAttachmentOf(message: Message): Message {
  return {
    ...message,
    content: partsOf(message).map((part) =>
      isMediaPart(part) ? textPart(agentCopy.media.earlier) : part
    ),
  }
}

function attachmentOf(parts: readonly Part[]): Message[] {
  return parts.length === 0
    ? []
    : [
        {
          role: "user",
          content: [textPart(agentCopy.media.attached), ...parts],
        },
      ]
}

function earlierBatchOf(batch: Batch): Message[] {
  return [
    ...batch.tools.map(({ message }) => earlierToolOf(message)),
    ...(batch.attachment === null
      ? []
      : [earlierAttachmentOf(batch.attachment.message)]),
  ]
}

/** Which tool result each attached image belongs to, in pi's order. Images it cannot place count after the batch's tool results. */
function ownersOf(batch: Batch, images: number): (number | null)[] {
  const owners = batch.tools
    .filter(({ message }) => ownsImage(message))
    .map(({ at }) => at)
  return owners.length === images
    ? owners
    : Array.from({ length: images }, () => null)
}

function imageOf(part: Part, key: string, rewrite: Rewrite): Part {
  const bytes = imageBytesOf(part)
  if (!fits(rewrite.turn, key, bytes)) {
    return textPart(overNoteOf())
  }
  charge(rewrite.turn, key, bytes)
  return part
}

/** A tool result's text with each mark line replaced by its note, and each medium it reads added to `attached` in order. */
async function expandedTextOf(
  text: string,
  at: number,
  rewrite: Rewrite,
  attached: Part[]
): Promise<string> {
  const lines: string[] = []
  for (const line of text.split("\n")) {
    const assetId = markLine.exec(line)?.[1]
    if (assetId === undefined) {
      lines.push(line)
    } else {
      const expanded = await expandedOf(assetId, `${at}:${assetId}`, rewrite)
      if (expanded.note !== null) {
        lines.push(expanded.note)
      }
      if (expanded.part !== null) {
        attached.push(expanded.part)
      }
    }
  }
  return lines.join("\n")
}

/** One step's tool results and pi's attachment of their images, with each medium counted in the order the step read it. */
async function newBatchOf(batch: Batch, rewrite: Rewrite): Promise<Message[]> {
  const parts =
    batch.attachment === null ? [] : partsOf(batch.attachment.message)
  const imageAts = parts.flatMap((part, index) =>
    part.type === "image_url" ? [index] : []
  )
  const owners = ownersOf(batch, imageAts.length)
  const kept = new Map<number, Part>()
  const keepImages = (owner: number | null): void => {
    for (const [order, index] of imageAts.entries()) {
      if (owners[order] === owner && batch.attachment !== null) {
        const key = `${batch.attachment.at}:image:${index}`
        kept.set(index, imageOf(parts[index] as Part, key, rewrite))
      }
    }
  }
  const attached: Part[] = []
  const tools: Message[] = []
  for (const { at, message } of batch.tools) {
    const texts = textsOf(message)
    if (texts === null) {
      tools.push(message)
    } else {
      const sent: string[] = []
      for (const text of texts) {
        sent.push(await expandedTextOf(text, at, rewrite, attached))
      }
      tools.push(withTexts(message, sent))
    }
    keepImages(at)
  }
  keepImages(null)
  return [
    ...tools,
    ...attachmentOf(attached),
    ...(batch.attachment === null
      ? []
      : [
          {
            ...batch.attachment.message,
            content: parts.map((part, index) => kept.get(index) ?? part),
          },
        ]),
  ]
}

async function messagesOf(
  messages: readonly Message[],
  rewrite: Rewrite
): Promise<Message[]> {
  const sent: Message[] = []
  for (let at = 0; at < messages.length; ) {
    const message = messages[at] as Message
    const batch = batchAt(messages, at)
    if (sizeOf(batch) === 0) {
      sent.push(message)
      at += 1
    } else {
      sent.push(
        ...(at < rewrite.sentBefore
          ? earlierBatchOf(batch)
          : await newBatchOf(batch, rewrite))
      )
      at += sizeOf(batch)
    }
  }
  return sent
}

function inputsOf(model: unknown): ReadonlySet<string> {
  const found = typeof model === "string" ? routerChatModelOf(model) : undefined
  return new Set(found?.inputs ?? [])
}

/**
 * The Router body with each medium sent once: in the first request that carries its tool result, which is the step's
 * results after the body's last answer. A mark there becomes OpenRouter's audio or video part, read through the request's
 * own library. Every medium of an earlier request, of this turn or an earlier one, becomes a note, and so does every
 * medium past the turn's limit, which the ledger counts across the turn's requests.
 */
export async function withMediaOf(
  body: string,
  reads: (() => MediaReads) | null,
  ledger: MediaLedger
): Promise<string> {
  const parsed: unknown = JSON.parse(body)
  if (!isRecord(parsed) || !Array.isArray(parsed.messages)) {
    return body
  }
  const messages = parsed.messages.filter(isRecord)
  const turnStart = turnStartOf(messages)
  const rewrite: Rewrite = {
    inputs: inputsOf(parsed.model),
    reads,
    sentBefore: Math.max(turnStart, lastAnswerOf(messages)),
    turn: turnOf(ledger, messages, turnStart),
  }
  return JSON.stringify({
    ...parsed,
    messages: await messagesOf(messages, rewrite),
  })
}
