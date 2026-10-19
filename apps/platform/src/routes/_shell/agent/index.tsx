import { createFileRoute } from "@tanstack/react-router"
import { AgentStartScreen } from "@/screens/agent/agent-start-screen"

export const Route = createFileRoute("/_shell/agent/")({
  component: AgentStartScreen,
})
