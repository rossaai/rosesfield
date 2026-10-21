import { createFileRoute } from "@tanstack/react-router"
import { TermsScreen } from "@/screens/legal/terms-screen"

export const Route = createFileRoute("/terms")({
  component: TermsScreen,
})
