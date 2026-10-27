import type { Models } from "@earendil-works/pi-ai"
import type { Harness, ModelRef } from "@earendil-works/pi-durable"
import type { AgentModelChoice } from "#domain/agent-harness.port"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { backgroundContext } from "#infrastructure/pi-context"
import { agentSettings } from "#infrastructure/pi-conversation-docs"

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
  return { models: listedOf(opened), model: await chosenOf(opened) }
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
  await opened.harness.commit(async (tx) => {
    const settings = await tx.doc(agentSettings)
    settings.model = model
  }, context)
}
