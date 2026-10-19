import { ConflictError } from "@rosesfield/kernel"

type ConversationBusyErrorOptions = {
  conversationId: string
}

export class ConversationBusyError extends ConflictError {
  override readonly code = "CONVERSATION_BUSY"

  constructor(options: ConversationBusyErrorOptions) {
    super({
      message: `The agent still answers the last message of conversation ${options.conversationId}`,
    })
  }
}
