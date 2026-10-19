import { createFileRoute, redirect } from "@tanstack/react-router"
import { ExploreScreen } from "@/screens/explore/explore-screen"
import { isLandingPage } from "@/screens/welcome/landing-page"

export const Route = createFileRoute("/_shell/")({
  beforeLoad: () => {
    if (isLandingPage()) {
      throw redirect({ to: "/welcome" })
    }
  },
  component: ExploreScreen,
})
