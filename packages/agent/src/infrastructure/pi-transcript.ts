import type { Message } from "@earendil-works/pi-ai"
import type { EntryRecord } from "@earendil-works/pi-durable"
import { creditsOfCost } from "@rosesfield/catalog/comfy"
import type { Proposal, TranscriptItem } from "#agent.contract"
import { routerCostOf, toolEventOf } from "#infrastructure/pi-answer-reader"

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

function creditsItem(cost: number | null): TranscriptItem[] {
  return cost === null
    ? []
    : [{ type: "credits", credits: creditsOfCost({ amount: cost }) }]
}

export async function transcriptOf(
  entries: readonly EntryRecord[],
  current: ProposalReader
): Promise<TranscriptItem[]> {
  const items: TranscriptItem[] = []
  let cost: number | null = null
  for (const entry of entries) {
    const message = entry.model?.[0]
    if (entry.kind === personKind) {
      items.push(...creditsItem(cost))
      cost = null
    }
    const spent = message === undefined ? null : routerCostOf(message)
    if (spent !== null) {
      cost = (cost ?? 0) + spent
    }
    items.push(...(await itemsOf(entry, current)))
  }
  items.push(...creditsItem(cost))
  return items
}
