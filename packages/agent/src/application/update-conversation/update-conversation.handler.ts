import type { Conversation } from "#agent.contract"
import type {
  AgentHarness,
  ConversationChanges,
} from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type UpdateConversationInput = {
  conversationId: string
  changes: ConversationChanges
}

export type UpdateConversationOutput = {
  conversation: Conversation
}

type UpdateConversationHandlerOptions = {
  agent: AgentHarness | null
}

export class UpdateConversationHandler {
  private readonly agent: AgentHarness | null

  constructor(options: UpdateConversationHandlerOptions) {
    this.agent = options.agent
  }

  async execute(
    input: UpdateConversationInput
  ): Promise<UpdateConversationOutput> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    const conversation = await this.agent.updateConversation(
      conversationIdFormat.parse(input.conversationId),
      input.changes
    )
    return { conversation }
  }
}
