import { createModels, type Models } from "@earendil-works/pi-ai"
import type { ModelRef } from "@earendil-works/pi-durable"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import type { Fetch } from "#infrastructure/router-chat-fetch"
import {
  defaultChatModel,
  routerChat,
} from "#infrastructure/router-chat-models"
import { routerChatProvider } from "#infrastructure/router-chat-provider"

export type AgentModel = {
  provider: string
  model: string
  apiKey: string | null
}

export type PiModels = {
  models: Models
  ref: ModelRef
}

export type OpenPiModelsOptions = {
  keyOf?: () => string | null
  fetch?: Fetch
}

export function routerAgentModel(apiKey: string | null): AgentModel {
  return { provider: routerChat.provider, model: defaultChatModel, apiKey }
}

export async function openPiModels(
  model: AgentModel,
  options: OpenPiModelsOptions = {}
): Promise<PiModels> {
  const models = createModels()
  models.setProvider(
    routerChatProvider({
      keyOf: () => options.keyOf?.() ?? model.apiKey,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
    })
  )
  if (models.getModel(model.provider, model.model) === undefined) {
    throw new AgentModelUnknownError({
      provider: model.provider,
      model: model.model,
    })
  }
  return { models, ref: { provider: model.provider, modelId: model.model } }
}
