import type {
  Api,
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Message,
  Model,
  Models,
} from "@earendil-works/pi-ai"
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai/utils/event-stream"
import type { Clock } from "@rosesfield/kernel"
import { AgentTurnLimitError } from "#domain/error/agent-turn-limit.error"
import { refusalTextOf } from "#infrastructure/router-chat-fetch"

type TurnLimitOptions = {
  clock: Clock
}

type CallOptions = {
  sessionId?: string
}

export class TurnLimit {
  static readonly maxModelCalls = 20

  private readonly clock: Clock
  private readonly calls = new Map<string, number>()

  constructor(options: TurnLimitOptions) {
    this.clock = options.clock
  }

  take(session: string, opensTurn: boolean): boolean {
    const made = opensTurn ? 0 : (this.calls.get(session) ?? 0)
    if (made >= TurnLimit.maxModelCalls) {
      return false
    }
    this.calls.set(session, made + 1)
    return true
  }

  refusalOf(model: Model<Api>): AssistantMessage {
    const error = new AgentTurnLimitError({ limit: TurnLimit.maxModelCalls })
    return {
      role: "assistant",
      content: [],
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "error",
      errorMessage: refusalTextOf(error),
      timestamp: this.clock.now().getTime(),
    }
  }
}

export function opensTurn(messages: readonly Message[]): boolean {
  return messages.findLast((one) => one.role !== "system")?.role === "user"
}

function sessionOf(options: CallOptions | undefined): string {
  return options?.sessionId ?? ""
}

function refusedStream(message: AssistantMessage): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream()
  stream.push({ type: "error", reason: "error", error: message })
  stream.end()
  return stream
}

export function turnLimitedModels(models: Models, turns: TurnLimit): Models {
  const streamSimple: Models["streamSimple"] = (model, context, options) =>
    turns.take(sessionOf(options), opensTurn(context.messages))
      ? models.streamSimple(model, context, options)
      : refusedStream(turns.refusalOf(model))
  const completeSimple: Models["completeSimple"] = async (
    model,
    context: Context,
    options
  ) =>
    turns.take(sessionOf(options), false)
      ? models.completeSimple(model, context, options)
      : turns.refusalOf(model)
  return new Proxy(models, {
    get(target, name): unknown {
      if (name === "streamSimple") {
        return streamSimple
      }
      if (name === "completeSimple") {
        return completeSimple
      }
      const value: unknown = Reflect.get(target, name, target)
      return typeof value === "function" ? value.bind(target) : value
    },
  })
}
