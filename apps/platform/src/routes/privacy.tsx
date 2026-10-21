import { createFileRoute } from "@tanstack/react-router"
import { PrivacyScreen } from "@/screens/legal/privacy-screen"

export const Route = createFileRoute("/privacy")({
  component: PrivacyScreen,
})
