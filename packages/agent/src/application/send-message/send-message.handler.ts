import type { AgentHarness, AnswerStream } from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"

export type SendMessageInput = {
  conversationId: string
  text: string
}

export type SendMessageOutput = {
  answer: AnswerStream
}

type SendMessageHandlerOptions = {
  agent: AgentHarness | null
}

export class SendMessageHandler {
  private readonly agent: AgentHarness | null

  constructor(options: SendMessageHandlerOptions) {
    this.agent = options.agent
  }

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    if (this.agent === null) {
      throw new AgentModelMissingError()
    }
    const answer = await this.agent.send({
      conversationId: conversationIdFormat.parse(input.conversationId),
      text: input.text,
    })
    return { answer }
  }
}
