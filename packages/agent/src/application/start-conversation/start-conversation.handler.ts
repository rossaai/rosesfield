import type { Conversation, RunApproval } from "#agent.contract"
import type { AgentHarness } from "#domain/agent-harness.port"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type StartConversationInput = {
  runApproval: RunApproval | null
}

export type StartConversationOutput = {
  conversation: Conversation
}

type StartConversationHandlerOptions = {
  agent: AgentHarness | null
}

export class StartConversationHandler {
  static readonly runApproval: RunApproval = "ask"

  private readonly agent: AgentHarness | null

  constructor(options: StartConversationHandlerOptions) {
    this.agent = options.agent
  }

  async execute(
    input: StartConversationInput
  ): Promise<StartConversationOutput> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    const runApproval =
      input.runApproval ?? StartConversationHandler.runApproval
    return { conversation: await this.agent.startConversation({ runApproval }) }
  }
}
