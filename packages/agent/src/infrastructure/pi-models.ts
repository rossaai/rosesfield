import {
  type ApiKeyAuth,
  createModels,
  createProvider,
  InMemoryCredentialStore,
  type Model,
  type Models,
} from "@earendil-works/pi-ai"
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy"
import { cloudflareWorkersAIProvider } from "@earendil-works/pi-ai/providers/cloudflare-workers-ai"
import type { ModelRef } from "@earendil-works/pi-durable"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"

export type AgentModel = {
  provider: string
  model: string
  apiKey: string | null
  baseUrl: string | null
}

export type PiModels = {
  models: Models
  ref: ModelRef
}

export type OpenPiModelsOptions = {
  keyOf?: () => string | null
}

export const endpointModel = {
  contextWindow: 65_536,
  maxTokens: 8192,
  keylessKey: "none",
  workersAiHost: "api.cloudflare.com",
}

export async function openPiModels(
  model: AgentModel,
  options: OpenPiModelsOptions = {}
): Promise<PiModels> {
  return model.baseUrl === null
    ? workersAiPiModels(model)
    : endpointPiModels(model, model.baseUrl, options)
}

async function workersAiPiModels(model: AgentModel): Promise<PiModels> {
  const { apiKey } = model
  if (apiKey === null) {
    throw new AgentModelMissingError()
  }
  const credentials = new InMemoryCredentialStore()
  const models = createModels({ credentials })
  models.setProvider(cloudflareWorkersAIProvider())
  if (models.getModel(model.provider, model.model) === undefined) {
    throw new AgentModelUnknownError({
      provider: model.provider,
      model: model.model,
    })
  }
  await credentials.modify(model.provider, async () => ({
    type: "api_key",
    key: apiKey,
  }))
  return { models, ref: { provider: model.provider, modelId: model.model } }
}

async function endpointPiModels(
  model: AgentModel,
  baseUrl: string,
  options: OpenPiModelsOptions
): Promise<PiModels> {
  const credentials = new InMemoryCredentialStore()
  const { apiKey } = model
  if (apiKey !== null) {
    await credentials.modify(model.provider, async () => ({
      type: "api_key",
      key: apiKey,
    }))
  }
  const models = createModels({ credentials })
  models.setProvider(
    createProvider({
      id: model.provider,
      baseUrl,
      auth: { apiKey: endpointAuth(model.provider, options) },
      models: [chatModel(model, baseUrl)],
      api: openAICompletionsApi(),
    })
  )
  return { models, ref: { provider: model.provider, modelId: model.model } }
}

function endpointAuth(
  provider: string,
  options: OpenPiModelsOptions
): ApiKeyAuth {
  return {
    name: `${provider} key`,
    resolve: async ({ credential }) => ({
      auth: {
        apiKey:
          options.keyOf?.() ?? credential?.key ?? endpointModel.keylessKey,
      },
      source: "AGENT_API_KEY",
    }),
  }
}

function chatModel(
  model: AgentModel,
  baseUrl: string
): Model<"openai-completions"> {
  const isWorkersAi = new URL(baseUrl).hostname === endpointModel.workersAiHost
  return {
    id: model.model,
    name: model.model,
    api: "openai-completions",
    provider: model.provider,
    baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: endpointModel.contextWindow,
    maxTokens: endpointModel.maxTokens,
    ...(isWorkersAi
      ? {}
      : {
          compat: {
            supportsDeveloperRole: false,
            supportsStore: false,
            maxTokensField: "max_tokens",
          },
        }),
  }
}
