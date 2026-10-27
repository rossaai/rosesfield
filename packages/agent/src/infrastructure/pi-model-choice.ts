import type { Models } from "@earendil-works/pi-ai"
import type { Harness, ModelRef } from "@earendil-works/pi-durable"
import type { AgentModelChoice } from "#domain/agent-harness.port"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { backgroundContext } from "#infrastructure/pi-context"
import {
  agentSettings,
  recentModelsOf,
} from "#infrastructure/pi-conversation-docs"

export type ModelSource = {
  harness: Harness
  model: ModelRef
  models: Models
}

const context = backgroundContext

export function listedOf(opened: ModelSource): string[] {
  return opened.models.getModels(opened.model.provider).map((model) => model.id)
}

export async function chosenOf(opened: ModelSource): Promise<string> {
  const settings = await opened.harness.snapshot(agentSettings, context)
  const chosen = settings?.model ?? null
  return chosen !== null && listedOf(opened).includes(chosen)
    ? chosen
    : opened.model.modelId
}

export async function modelChoiceOf(
  opened: ModelSource
): Promise<AgentModelChoice> {
  const models = listedOf(opened)
  const settings = await opened.harness.snapshot(agentSettings, context)
  const model = await chosenOf(opened)
  const recent = [model, ...(settings?.recent ?? [])]
  return { models, model, recent: recentModelsOf(recent, models) }
}

export async function keepModelChoice(
  opened: ModelSource,
  model: string
): Promise<void> {
  if (!listedOf(opened).includes(model)) {
    throw new AgentModelUnknownError({
      provider: opened.model.provider,
      model,
    })
  }
  const before = await chosenOf(opened)
  await opened.harness.commit(async (tx) => {
    const settings = await tx.doc(agentSettings)
    settings.recent = recentModelsOf([
      model,
      before,
      ...(settings.recent ?? []),
    ])
    settings.model = model
  }, context)
}
