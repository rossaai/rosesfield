import type { Models, ModelThinkingLevel } from "@earendil-works/pi-ai"
import { createModels } from "@earendil-works/pi-ai/models"
import type {
  ModelRef,
  Conversation as PiConversation,
} from "@earendil-works/pi-durable"
import type { AgentEffort } from "#agent.contract"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { backgroundContext } from "#infrastructure/pi-context"
import type { Fetch } from "#infrastructure/router-chat-fetch"
import {
  defaultChatModel,
  routerChat,
  turnEffortOf,
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

/** The thinking level a turn of the model runs at: the effort the conversation chose when the model offers it, else the model's opening effort, and off for a model with no effort to choose. */
export function thinkingLevelOf(
  model: string,
  effort: AgentEffort | undefined
): ModelThinkingLevel {
  const sent = turnEffortOf(model, effort)
  return sent === null || sent === "none" ? "off" : sent
}

export async function useModel(
  conversation: PiConversation,
  model: ModelRef,
  thinkingLevel: ModelThinkingLevel
): Promise<void> {
  const current = await conversation.agent(backgroundContext)
  if (
    current.model?.provider !== model.provider ||
    current.model.modelId !== model.modelId ||
    current.thinkingLevel !== thinkingLevel
  ) {
    await conversation.configure({ model, thinkingLevel }, backgroundContext)
  }
}
