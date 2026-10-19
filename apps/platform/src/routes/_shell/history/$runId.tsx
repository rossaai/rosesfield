import { createFileRoute } from "@tanstack/react-router"
import { RunScreen } from "@/screens/history/run-screen"

export const Route = createFileRoute("/_shell/history/$runId")({
  component: RunScreen,
})
