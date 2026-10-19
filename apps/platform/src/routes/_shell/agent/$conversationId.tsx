import { createFileRoute } from "@tanstack/react-router"
import { ConversationScreen } from "@/screens/agent/conversation-screen"

export const Route = createFileRoute("/_shell/agent/$conversationId")({
  component: ConversationScreen,
})
