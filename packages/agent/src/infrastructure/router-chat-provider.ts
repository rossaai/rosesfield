import {
  type ApiKeyAuth,
  type AssistantMessage,
  type AssistantMessageEventStream,
  createAssistantMessageEventStream,
  createProvider,
  type FetchFunction,
  type Model,
  type Provider,
  type ProviderStreams,
} from "@earendil-works/pi-ai"
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy"
import { ComfyRouterGenerationEngine } from "@rosesfield/generation"
import {
  type Fetch,
  type RouterChatCall,
  routerChatFetch,
} from "#infrastructure/router-chat-fetch"
import {
  routerChat,
  routerChatModels,
} from "#infrastructure/router-chat-models"

export type RouterChatProviderOptions = {
  keyOf: () => string | null
  fetch: Fetch
}

const keylessKey = "comfy-key"

const routerAuth: ApiKeyAuth = {
  name: "Comfy key",
  resolve: async () => ({
    auth: { apiKey: keylessKey },
    source: "the Comfy key of the request",
  }),
}

function chatModelOf(id: string): Model<"openai-completions"> {
  return {
    id,
    name: id,
    api: "openai-completions",
    provider: routerChat.provider,
    baseUrl: ComfyRouterGenerationEngine.routerUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: routerChat.contextWindow,
    maxTokens: routerChat.maxTokens,
    compat: {
      supportsDeveloperRole: false,
      supportsStore: false,
      maxTokensField: "max_tokens",
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
  options: RouterChatProviderOptions
): AssistantMessageEventStream {
  const call: RouterChatCall = { cost: null }
  const source = open(
    piFetchOf(
      routerChatFetch({ keyOf: options.keyOf, fetch: options.fetch, call })
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
  const api: ProviderStreams = {
    stream: (model, context, streamOptions) =>
      costed(
        (fetch) =>
          completions.stream(model, context, { ...streamOptions, fetch }),
        options
      ),
    streamSimple: (model, context, streamOptions) =>
      costed(
        (fetch) =>
          completions.streamSimple(model, context, { ...streamOptions, fetch }),
        options
      ),
  }
  return createProvider({
    id: routerChat.provider,
    baseUrl: ComfyRouterGenerationEngine.routerUrl,
    auth: { apiKey: routerAuth },
    models: routerChatModels.map(chatModelOf),
    api,
  })
}
