import type { AgentHarness } from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type DeleteConversationInput = {
  conversationId: string
}

type DeleteConversationHandlerOptions = {
  agent: AgentHarness | null
}

export class DeleteConversationHandler {
  private readonly agent: AgentHarness | null

  constructor(options: DeleteConversationHandlerOptions) {
    this.agent = options.agent
  }

  async execute(input: DeleteConversationInput): Promise<void> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    await this.agent.deleteConversation(
      conversationIdFormat.parse(input.conversationId)
    )
  }
}
