import { createFileRoute } from "@tanstack/react-router"
import { ExploreScreen } from "@/screens/explore/explore-screen"

export const Route = createFileRoute("/_shell/")({
  component: ExploreScreen,
})
