import {
  type AgentModel,
  type OpenPiModelsOptions,
  type PiAgentHarness,
  routerAgentHarness,
} from "@rosesfield/agent"
import { openSqliteFileStorage } from "@rosesfield/agent/local"
import type { AppDefinition } from "@rosesfield/contract"
import type { Clock } from "@rosesfield/kernel"
import { AgentAccess, type AgentRequest } from "#agent/agent-access"

type KeyedAgentOptions = {
  model: AgentModel
  file: string
  apps: readonly AppDefinition[]
  clock: Clock
  modelOptions?: OpenPiModelsOptions
}

export class KeyedAgent {
  readonly agent: PiAgentHarness
  readonly model: AgentModel
  private readonly access = new AgentAccess()

  constructor(options: KeyedAgentOptions) {
    const { access } = this
    this.model = options.model
    this.agent = routerAgentHarness({
      model: options.model,
      modelOptions: {
        ...(options.modelOptions ?? {}),
        keyOf: () => access.modelKey(),
      },
      storage: () => openSqliteFileStorage(options.file),
      apps: options.apps,
      handlers: () => access.handlers(),
      clock: options.clock,
    })
  }

  hold(request: AgentRequest): () => void {
    return this.access.enter(request)
  }

  close(): Promise<void> {
    return this.agent.close()
  }
}
