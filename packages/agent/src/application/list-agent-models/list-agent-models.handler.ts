import type { AgentHarness, AgentModelChoice } from "#domain/agent-harness.port"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

type ListAgentModelsHandlerOptions = {
  agent: AgentHarness | null
}

export class ListAgentModelsHandler {
  private readonly agent: AgentHarness | null

  constructor(options: ListAgentModelsHandlerOptions) {
    this.agent = options.agent
  }

  async execute(): Promise<AgentModelChoice> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    return this.agent.listModels()
  }
}
