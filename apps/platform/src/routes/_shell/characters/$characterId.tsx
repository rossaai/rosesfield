import { createFileRoute } from "@tanstack/react-router"
import { CharacterScreen } from "@/screens/characters/character-screen"

export const Route = createFileRoute("/_shell/characters/$characterId")({
  component: CharacterScreen,
})
