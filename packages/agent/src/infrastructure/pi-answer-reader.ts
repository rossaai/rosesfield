import type { AssistantMessage, Message } from "@earendil-works/pi-ai"
import type {
  AgentEvent,
  EntryRecord,
  MessageChange,
  SubmissionId,
  SubmissionRecord,
} from "@earendil-works/pi-durable"
import { creditsOfCost } from "@rosesfield/catalog/comfy"
import { type ErrorBody, errorEnvelopeOf } from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import { type AnswerEvent, proposal } from "#agent.contract"
import { AgentAnswerFailedError } from "#domain/error/agent-answer-failed.error"
import { refusalBodyOf } from "#infrastructure/router-chat-fetch"
import { routerChat } from "#infrastructure/router-chat-models"

type ReadingMessage = {
  index: number | null
  blocks: Map<number, string>
  shown: string
}

type PiAnswerReaderOptions = {
  submissionId: SubmissionId
}

export class PiAnswerReader {
  private readonly submissionId: SubmissionId
  private reading: ReadingMessage | null = null
  private nextIndex = 0
  private cost: number | null = null

  constructor(options: PiAnswerReaderOptions) {
    this.submissionId = options.submissionId
  }

  read(event: AgentEvent): AnswerEvent[] {
    switch (event.type) {
      case "message_start":
        return this.start(event.message)
      case "message_update":
        return this.update(event.changes)
      case "message_end":
        return this.end(event.entry)
      case "tool_execution_end":
        return toolEventOf(event.entry)
      case "submission":
        return this.settle(event.record)
      default:
        return []
    }
  }

  settle(record: SubmissionRecord): AnswerEvent[] {
    if (record.id !== this.submissionId) {
      return []
    }
    if (record.status === "done") {
      return this.cost === null
        ? [{ type: "done" }]
        : [{ type: "done", credits: creditsOfCost({ amount: this.cost }) }]
    }
    if (record.status === "unanswered") {
      return [{ type: "failed", error: failureOf(record) }]
    }
    return []
  }

  private start(message: Message): AnswerEvent[] {
    if (message.role !== "assistant") {
      return []
    }
    this.reading = { index: null, blocks: new Map(), shown: "" }
    return this.replace(message)
  }

  private update(changes: readonly MessageChange[]): AnswerEvent[] {
    const reading = this.reading
    if (reading === null) {
      return []
    }
    for (const change of changes) {
      apply(reading.blocks, change)
    }
    return this.show(reading)
  }

  private end(entry: EntryRecord): AnswerEvent[] {
    const message = entry.model?.[0]
    const cost = message === undefined ? null : routerCostOf(message)
    if (cost !== null) {
      this.cost = (this.cost ?? 0) + cost
    }
    const shown = message?.role === "assistant" ? this.replace(message) : []
    this.reading = null
    return shown
  }

  private replace(message: AssistantMessage): AnswerEvent[] {
    const reading = this.reading
    if (reading === null) {
      return []
    }
    reading.blocks = textBlocksOf(message)
    return this.show(reading)
  }

  private show(reading: ReadingMessage): AnswerEvent[] {
    const text = [...reading.blocks.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, block]) => block)
      .join("")
    if (text === reading.shown || text === "") {
      return []
    }
    reading.shown = text
    reading.index ??= this.nextIndex++
    return [{ type: "message", index: reading.index, text }]
  }
}

function failureOf(record: SubmissionRecord): ErrorBody {
  const refused = refusalBodyOf(record.detail)
  if (refused !== null) {
    return refused
  }
  const reason = record.reason ?? record.status
  return errorEnvelopeOf(new AgentAnswerFailedError({ reason })).error
}

export function routerCostOf(message: Message): number | null {
  return message.role === "assistant" &&
    message.provider === routerChat.provider
    ? message.usage.cost.total
    : null
}

function apply(blocks: Map<number, string>, change: MessageChange): void {
  switch (change.type) {
    case "text_start":
    case "block":
      if (change.block.type === "text") {
        blocks.set(change.contentIndex, change.block.text)
      } else {
        blocks.delete(change.contentIndex)
      }
      return
    case "text_delta":
      blocks.set(
        change.contentIndex,
        (blocks.get(change.contentIndex) ?? "") + change.delta
      )
      return
    case "message":
      blocks.clear()
      for (const [index, text] of textBlocksOf(change.message)) {
        blocks.set(index, text)
      }
      return
    default:
      return
  }
}

function textBlocksOf(message: AssistantMessage): Map<number, string> {
  const blocks = new Map<number, string>()
  message.content.forEach((block, index) => {
    if (block.type === "text") {
      blocks.set(index, block.text)
    }
  })
  return blocks
}

export function toolEventOf(entry: EntryRecord | undefined): AnswerEvent[] {
  const message = entry?.model?.[0]
  if (message?.role !== "toolResult" || message.isError) {
    return []
  }
  const details = message.details
  if (typeof details !== "object" || details === null) {
    return []
  }
  const runIds = "runIds" in details ? details.runIds : undefined
  if (Array.isArray(runIds)) {
    return runIds
      .filter((one) => runIdFormat.is(one))
      .map((one): AnswerEvent => ({ type: "run", runId: one }))
  }
  const runId = "runId" in details ? details.runId : undefined
  if (runIdFormat.is(runId)) {
    return [{ type: "run", runId }]
  }
  const proposed = proposal.safeParse(
    "proposal" in details ? details.proposal : undefined
  )
  return proposed.success ? [{ type: "proposal", proposal: proposed.data }] : []
}
