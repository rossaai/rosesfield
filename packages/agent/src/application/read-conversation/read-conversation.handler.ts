import type { Transcript } from "#agent.contract"
import type { AgentHarness } from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type ReadConversationInput = {
  conversationId: string
}

export type ReadConversationOutput = Transcript

type ReadConversationHandlerOptions = {
  agent: AgentHarness | null
}

export class ReadConversationHandler {
  private readonly agent: AgentHarness | null

  constructor(options: ReadConversationHandlerOptions) {
    this.agent = options.agent
  }

  async execute(input: ReadConversationInput): Promise<ReadConversationOutput> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    return this.agent.readConversation(
      conversationIdFormat.parse(input.conversationId)
    )
  }
}
