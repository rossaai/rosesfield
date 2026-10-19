import { createFileRoute } from "@tanstack/react-router"
import { WelcomeScreen } from "@/screens/welcome/welcome-screen"

export const Route = createFileRoute("/welcome")({
  component: WelcomeScreen,
})
