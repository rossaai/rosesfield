import type { Storage } from "@earendil-works/pi-durable"
import type { AppDefinition } from "@rosesfield/contract"
import type { Clock } from "@rosesfield/kernel"
import { PiAgentHarness } from "#infrastructure/pi-agent-harness"
import {
  type AgentToolHandlers,
  publishedAgentTools,
} from "#infrastructure/pi-agent-tools"
import type { RunWait } from "#infrastructure/pi-library-tools"
import {
  type AgentModel,
  type OpenPiModelsOptions,
  openPiModels,
} from "#infrastructure/pi-models"

export type RouterAgentHarnessOptions = {
  model: AgentModel
  modelOptions: OpenPiModelsOptions
  storage: () => Promise<Storage>
  apps: readonly AppDefinition[]
  handlers: () => AgentToolHandlers
  clock: Clock
  wait?: RunWait
}

export function routerAgentHarness(
  options: RouterAgentHarnessOptions
): PiAgentHarness {
  const { model, modelOptions } = options
  return new PiAgentHarness({
    models: () => openPiModels(model, modelOptions),
    storage: options.storage,
    tools: publishedAgentTools({
      apps: options.apps,
      handlers: options.handlers,
      ...(options.wait === undefined ? {} : { wait: options.wait }),
    }),
    clock: options.clock,
  })
}
