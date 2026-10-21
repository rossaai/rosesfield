import type { AgentHarness, AgentModelChoice } from "#domain/agent-harness.port"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type ChooseAgentModelInput = {
  model: string
}

type ChooseAgentModelHandlerOptions = {
  agent: AgentHarness | null
}

export class ChooseAgentModelHandler {
  private readonly agent: AgentHarness | null

  constructor(options: ChooseAgentModelHandlerOptions) {
    this.agent = options.agent
  }

  async execute(input: ChooseAgentModelInput): Promise<AgentModelChoice> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    return this.agent.chooseModel(input.model)
  }
}
