import { join } from "node:path"
import {
  type AgentModel,
  type AgentToolHandlers,
  type OpenPiModelsOptions,
  type PiAgentHarness,
  type RunWait,
  routerAgentHarness,
  routerAgentModel,
} from "@rosesfield/agent"
import { openSqliteFileStorage } from "@rosesfield/agent/local"
import { photonImages } from "@rosesfield/agent/local-images"
import type { AppDefinition } from "@rosesfield/contract"
import type { Clock } from "@rosesfield/kernel"
import { KeyedAgent } from "#agent/keyed-agent"

type LocalAgentOptions = {
  model: AgentModel | null
  dataDir: string
  clock: Clock
  apps: readonly AppDefinition[]
  handlers: AgentToolHandlers
  modelOptions?: OpenPiModelsOptions
  wait?: RunWait
}

export const agentFileName = "agent.db"

export function localAgent(options: LocalAgentOptions): PiAgentHarness | null {
  const { model, handlers } = options
  if (model === null) {
    return null
  }
  const file = join(options.dataDir, agentFileName)
  return routerAgentHarness({
    model,
    modelOptions: options.modelOptions ?? {},
    storage: () => openSqliteFileStorage(file),
    apps: options.apps,
    handlers: () => handlers,
    clock: options.clock,
    images: photonImages,
    ...(options.wait === undefined ? {} : { wait: options.wait }),
  })
}

type PastedKeyAgentOptions = {
  env: { dataDir: string }
  apps: readonly AppDefinition[]
  clock: Clock
  modelOptions: OpenPiModelsOptions
}

export function pastedKeyAgents(
  options: PastedKeyAgentOptions
): () => KeyedAgent {
  return () => pastedKeyAgent(options)
}

export function pastedKeyAgent(options: PastedKeyAgentOptions): KeyedAgent {
  return new KeyedAgent({
    model: routerAgentModel(null),
    file: join(options.env.dataDir, agentFileName),
    apps: options.apps,
    clock: options.clock,
    modelOptions: options.modelOptions,
  })
}
