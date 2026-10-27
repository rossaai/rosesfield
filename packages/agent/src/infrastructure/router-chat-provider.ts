import type {
  ApiKeyAuth,
  AssistantMessage,
  AssistantMessageEventStream,
  FetchFunction,
  Model,
  Provider,
  ProviderStreams,
  ThinkingLevelMap,
} from "@earendil-works/pi-ai"
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy"
import { createProvider } from "@earendil-works/pi-ai/models"
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai/utils/event-stream"
import { ComfyRouterGenerationEngine } from "@rosesfield/generation"
import {
  type Fetch,
  type RouterChatCall,
  routerChatFetch,
} from "#infrastructure/router-chat-fetch"
import type { MediaReads } from "#infrastructure/router-chat-media"
import {
  type MediaLedger,
  mediaLedger,
} from "#infrastructure/router-chat-media-ledger"
import {
  hasEffortChoice,
  type RouterChatModel,
  routerChat,
  routerChatData,
} from "#infrastructure/router-chat-models"
import { marksCache } from "#infrastructure/router-chat-rates"

export type RouterChatProviderOptions = {
  keyOf: () => string | null
  fetch: Fetch
  media?: () => MediaReads
}

const keylessKey = "comfy-key"

const routerAuth: ApiKeyAuth = {
  name: "Comfy key",
  resolve: async () => ({
    auth: { apiKey: keylessKey },
    source: "the Comfy key of the request",
  }),
}

const thinkingLevels = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const

/** Maps each pi thinking level to the effort OpenRouter offers for the model, off to its none, and every level it does not offer to null, which pi never sends. */
export function thinkingLevelMapOf(model: RouterChatModel): ThinkingLevelMap {
  const map: ThinkingLevelMap = {
    off: model.efforts.includes("none") ? "none" : null,
  }
  for (const level of thinkingLevels) {
    map[level] = model.efforts.includes(level) ? level : null
  }
  return map
}

function chatModelOf(model: RouterChatModel): Model<"openai-completions"> {
  const isTuned = hasEffortChoice(model)
  return {
    id: model.id,
    name: model.id,
    api: "openai-completions",
    provider: routerChat.provider,
    baseUrl: ComfyRouterGenerationEngine.routerUrl,
    reasoning: isTuned,
    ...(isTuned ? { thinkingLevelMap: thinkingLevelMapOf(model) } : {}),
    input: model.inputs.includes("image") ? ["text", "image"] : ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: routerChat.contextWindow,
    maxTokens: routerChat.maxTokens,
    compat: {
      supportsDeveloperRole: false,
      supportsStore: false,
      maxTokensField: "max_tokens",
      thinkingFormat: "openrouter",
      supportsLongCacheRetention: false,
      ...(marksCache(model) ? { cacheControlFormat: "anthropic" } : {}),
    },
  }
}

export function withRouterCost(
  message: AssistantMessage,
  cost: number | null
): void {
  if (cost !== null) {
    message.usage.cost.total = cost
  }
}

function piFetchOf(adapter: Fetch): FetchFunction {
  return Object.assign(adapter, { preconnect: globalThis.fetch.preconnect })
}

function costed(
  open: (fetch: FetchFunction) => AssistantMessageEventStream,
  options: RouterChatProviderOptions,
  ledger: MediaLedger
): AssistantMessageEventStream {
  const call: RouterChatCall = { cost: null }
  const source = open(
    piFetchOf(
      routerChatFetch({
        keyOf: options.keyOf,
        fetch: options.fetch,
        call,
        ledger,
        ...(options.media === undefined ? {} : { media: options.media }),
      })
    )
  )
  const answer = createAssistantMessageEventStream()
  const forward = async (): Promise<void> => {
    for await (const event of source) {
      if (event.type === "done") {
        withRouterCost(event.message, call.cost)
      }
      answer.push(event)
    }
    answer.end()
  }
  void forward()
  return answer
}

export function routerChatProvider(
  options: RouterChatProviderOptions
): Provider {
  const completions = openAICompletionsApi()
  const ledger = mediaLedger()
  const api: ProviderStreams = {
    stream: (model, context, streamOptions) =>
      costed(
        (fetch) =>
          completions.stream(model, context, { ...streamOptions, fetch }),
        options,
        ledger
      ),
    streamSimple: (model, context, streamOptions) =>
      costed(
        (fetch) =>
          completions.streamSimple(model, context, { ...streamOptions, fetch }),
        options,
        ledger
      ),
  }
  return createProvider({
    id: routerChat.provider,
    baseUrl: ComfyRouterGenerationEngine.routerUrl,
    auth: { apiKey: routerAuth },
    models: routerChatData.models.map(chatModelOf),
    api,
  })
}
