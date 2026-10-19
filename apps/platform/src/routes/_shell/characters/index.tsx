import { createFileRoute } from "@tanstack/react-router"
import { CharactersScreen } from "@/screens/characters/characters-screen"

export const Route = createFileRoute("/_shell/characters/")({
  component: CharactersScreen,
})
