import { join } from "node:path"
import {
  type AgentModel,
  type AgentToolHandlers,
  agentTools,
  openPiModels,
  PiAgentHarness,
} from "@rosesfield/agent"
import { openSqliteFileStorage } from "@rosesfield/agent/local"
import type { AppDefinition } from "@rosesfield/contract"
import type { Clock } from "@rosesfield/kernel"

type LocalAgentOptions = {
  model: AgentModel | null
  dataDir: string
  clock: Clock
  apps: readonly AppDefinition[]
  handlers: AgentToolHandlers
}

export const agentFileName = "agent.db"

export function localAgent(options: LocalAgentOptions): PiAgentHarness | null {
  const { model, handlers } = options
  if (model === null) {
    return null
  }
  const file = join(options.dataDir, agentFileName)
  return new PiAgentHarness({
    models: () => openPiModels(model),
    storage: () => openSqliteFileStorage(file),
    tools: agentTools({ apps: options.apps, handlers: () => handlers }),
    clock: options.clock,
  })
}
