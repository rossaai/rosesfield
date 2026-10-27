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
import { routerChatModelOf } from "#infrastructure/router-chat-models"

type Message = Record<string, unknown>

type Part = Record<string, unknown>

type Budget = {
  count: number
  bytes: number
}

type Rewrite = {
  inputs: ReadonlySet<string>
  reads: (() => MediaReads) | null
  turnStart: number
  budget: Budget
}

const mediaParts: readonly string[] = ["image_url", "input_audio", "video_url"]
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

function textPart(text: string): Part {
  return { type: "text", text }
}

/** The index of the person's last message: a user message that carries no media, which pi's attachment of tool images does. */
function turnStartOf(messages: readonly Message[]): number {
  return messages.findLastIndex(
    (message) => message.role === "user" && !partsOf(message).some(isMediaPart)
  )
}

function takes(budget: Budget, bytes: number): boolean {
  if (
    budget.count >= routerMedia.perTurn ||
    budget.bytes + bytes > routerMedia.turnBytes
  ) {
    return false
  }
  budget.count += 1
  budget.bytes += bytes
  return true
}

function imageBytesOf(part: Part): number {
  const url = isRecord(part.image_url) ? part.image_url.url : undefined
  const data = typeof url === "string" ? url.slice(url.indexOf(",") + 1) : ""
  return Math.floor((data.length * 3) / 4)
}

function keptPart(part: Part, at: number, rewrite: Rewrite): Part {
  if (part.type !== "image_url") {
    return part
  }
  if (at < rewrite.turnStart) {
    return textPart(agentCopy.media.earlier)
  }
  return takes(rewrite.budget, imageBytesOf(part))
    ? part
    : textPart(overNoteOf())
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

async function expandedOf(
  assetId: string,
  rewrite: Rewrite
): Promise<Expanded> {
  const reads = rewrite.reads?.()
  const unread = { note: agentCopy.media.unread, part: null }
  if (reads === undefined) {
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
  if (!takes(rewrite.budget, plan.bytes)) {
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
  return part === null ? unread : { note: null, part }
}

async function toolMessageOf(
  message: Message,
  at: number,
  rewrite: Rewrite,
  attached: Part[]
): Promise<Message> {
  if (typeof message.content !== "string") {
    return message
  }
  const lines: string[] = []
  for (const line of message.content.split("\n")) {
    const assetId = markLine.exec(line)?.[1]
    if (assetId === undefined) {
      lines.push(line)
    } else if (at < rewrite.turnStart) {
      lines.push(agentCopy.media.earlier)
    } else {
      const expanded = await expandedOf(assetId, rewrite)
      if (expanded.note !== null) {
        lines.push(expanded.note)
      }
      if (expanded.part !== null) {
        attached.push(expanded.part)
      }
    }
  }
  return { ...message, content: lines.join("\n") }
}

async function messagesOf(
  messages: readonly Message[],
  rewrite: Rewrite
): Promise<Message[]> {
  const sent: Message[] = []
  let attached: Part[] = []
  for (const [at, message] of messages.entries()) {
    if (message.role === "tool") {
      sent.push(await toolMessageOf(message, at, rewrite, attached))
    } else {
      sent.push(...attachmentOf(attached))
      attached = []
      sent.push(
        message.role === "user" && Array.isArray(message.content)
          ? {
              ...message,
              content: partsOf(message).map((part) =>
                keptPart(part, at, rewrite)
              ),
            }
          : message
      )
    }
  }
  sent.push(...attachmentOf(attached))
  return sent
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

function inputsOf(model: unknown): ReadonlySet<string> {
  const found = typeof model === "string" ? routerChatModelOf(model) : undefined
  return new Set(found?.inputs ?? [])
}

/**
 * The Router body with each media mark of the turn's tool results replaced by OpenRouter's audio or video part, read
 * through the request's own library, and with every media part past the turn's limit, or from an earlier turn, left out
 * with a note.
 */
export async function withMediaOf(
  body: string,
  reads: (() => MediaReads) | null
): Promise<string> {
  const parsed: unknown = JSON.parse(body)
  if (!isRecord(parsed) || !Array.isArray(parsed.messages)) {
    return body
  }
  const messages = parsed.messages.filter(isRecord)
  const rewrite: Rewrite = {
    inputs: inputsOf(parsed.model),
    reads,
    turnStart: turnStartOf(messages),
    budget: { count: 0, bytes: 0 },
  }
  return JSON.stringify({
    ...parsed,
    messages: await messagesOf(messages, rewrite),
  })
}
