import type { Message } from "@earendil-works/pi-ai"
import type { EntryRecord } from "@earendil-works/pi-durable"
import type { Proposal, TranscriptItem } from "#agent.contract"
import { toolEventOf } from "#infrastructure/pi-answer-reader"

export type ProposalReader = (proposal: Proposal) => Promise<Proposal>

const personKind = "pi.user"

function textOf(message: Message): string {
  if (message.role === "user") {
    return typeof message.content === "string"
      ? message.content
      : message.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("")
  }
  if (message.role === "assistant") {
    return message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
  }
  return ""
}

async function itemsOf(
  entry: EntryRecord,
  current: ProposalReader
): Promise<TranscriptItem[]> {
  const message = entry.model?.[0]
  if (message === undefined) {
    return []
  }
  if (message.role === "toolResult") {
    const items: TranscriptItem[] = []
    for (const event of toolEventOf(entry)) {
      if (event.type === "run") {
        items.push({ type: "run", runId: event.runId })
      }
      if (event.type === "proposal") {
        items.push({
          type: "proposal",
          proposal: await current(event.proposal),
        })
      }
    }
    return items
  }
  const text = textOf(message)
  if (text.trim() === "") {
    return []
  }
  if (message.role === "user") {
    return entry.kind === personKind ? [{ type: "person", text }] : []
  }
  return message.role === "assistant" ? [{ type: "agent", text }] : []
}

export async function transcriptOf(
  entries: readonly EntryRecord[],
  current: ProposalReader
): Promise<TranscriptItem[]> {
  const items: TranscriptItem[] = []
  for (const entry of entries) {
    items.push(...(await itemsOf(entry, current)))
  }
  return items
}
