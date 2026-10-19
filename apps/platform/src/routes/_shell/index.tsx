import { createFileRoute, redirect } from "@tanstack/react-router"
import { HomeScreen } from "@/screens/home/home-screen"
import { isLandingPage } from "@/screens/welcome/landing-page"
import { hasSeenWelcome } from "@/screens/welcome/welcome-seen"

export const Route = createFileRoute("/_shell/")({
  beforeLoad: () => {
    if (isLandingPage() || !hasSeenWelcome()) {
      throw redirect({ to: "/welcome" })
    }
  },
  component: HomeScreen,
})
