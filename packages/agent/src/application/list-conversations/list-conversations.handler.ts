import type { Conversation } from "#agent.contract"
import type { AgentHarness } from "#domain/agent-harness.port"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type ListConversationsOutput = {
  conversations: Conversation[]
}

type ListConversationsHandlerOptions = {
  agent: AgentHarness | null
}

export class ListConversationsHandler {
  private readonly agent: AgentHarness | null

  constructor(options: ListConversationsHandlerOptions) {
    this.agent = options.agent
  }

  async execute(): Promise<ListConversationsOutput> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    return { conversations: await this.agent.listConversations() }
  }
}
