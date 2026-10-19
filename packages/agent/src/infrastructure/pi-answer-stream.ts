import type {
  AgentEventStream,
  Submission,
  WatchEnd,
} from "@earendil-works/pi-durable"
import { errorEnvelopeOf } from "@rosesfield/contract"
import type { AnswerEvent } from "#agent.contract"
import type { AnswerStream } from "#domain/agent-harness.port"
import { AgentAnswerFailedError } from "#domain/error/agent-answer-failed.error"
import { PiAnswerReader } from "#infrastructure/pi-answer-reader"
import { backgroundContext } from "#infrastructure/pi-context"

type PiAnswerStreamOptions = {
  events: AgentEventStream
  submission: Submission
}

export class PiAnswerStream implements AnswerStream {
  private readonly events: AgentEventStream
  private readonly submission: Submission
  private readonly reader: PiAnswerReader
  private readonly queue: AnswerEvent[] = []
  private ended = false
  private wake: (() => void) | null = null

  constructor(options: PiAnswerStreamOptions) {
    this.events = options.events
    this.submission = options.submission
    this.reader = new PiAnswerReader({ submissionId: options.submission.id })
    this.events.start(async (batch) => {
      for (const event of batch) {
        if (event.type === "snapshot") {
          await this.checkSettled()
        } else {
          this.push(this.reader.read(event))
        }
      }
    })
    this.events.closed.then(
      (end) => this.closed(end),
      (error: unknown) => this.closed({ reason: "session_failed", error })
    )
  }

  [Symbol.asyncIterator](): AsyncIterator<AnswerEvent> {
    return {
      next: () => this.next(),
      return: async () => {
        await this.stop()
        return { done: true, value: undefined }
      },
    }
  }

  async stop(): Promise<void> {
    this.finish()
    await this.events.stop()
  }

  private async next(): Promise<IteratorResult<AnswerEvent>> {
    while (this.queue.length === 0 && !this.ended) {
      await new Promise<void>((resolve) => {
        this.wake = resolve
      })
    }
    const event = this.queue.shift()
    if (event !== undefined) {
      return { done: false, value: event }
    }
    await this.events.stop()
    return { done: true, value: undefined }
  }

  private push(events: readonly AnswerEvent[]): void {
    if (this.ended) {
      return
    }
    for (const event of events) {
      this.queue.push(event)
      if (event.type === "done" || event.type === "failed") {
        this.finish()
        return
      }
    }
    this.wakeReader()
  }

  private async checkSettled(): Promise<void> {
    const record = await this.submission.status(backgroundContext)
    this.push(this.reader.settle(record))
  }

  private closed(end: WatchEnd): void {
    if (end.reason === "stopped" || end.reason === "cancelled") {
      this.finish()
      return
    }
    const error = new AgentAnswerFailedError({ reason: end.reason })
    this.push([{ type: "failed", error: errorEnvelopeOf(error).error }])
  }

  private finish(): void {
    this.ended = true
    this.wakeReader()
  }

  private wakeReader(): void {
    const wake = this.wake
    this.wake = null
    wake?.()
  }
}
