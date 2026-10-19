import { type Brand, IdFormat } from "@rosesfield/kernel"

export type ConversationId = Brand<string, "ConversationId">

export const conversationIdFormat: IdFormat<ConversationId> =
  new IdFormat<ConversationId>({
    name: "conversation id",
    pattern: IdFormat.uuidPattern,
  })
