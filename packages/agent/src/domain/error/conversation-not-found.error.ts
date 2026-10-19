import { NotFoundError } from "@rosesfield/kernel"

type ConversationNotFoundErrorOptions = {
  conversationId: string
}

export class ConversationNotFoundError extends NotFoundError {
  override readonly code = "CONVERSATION_NOT_FOUND"

  constructor(options: ConversationNotFoundErrorOptions) {
    super({ message: `No conversation has the id ${options.conversationId}` })
  }
}
