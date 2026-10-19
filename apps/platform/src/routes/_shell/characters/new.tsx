import { createFileRoute } from "@tanstack/react-router"
import { NewCharacterScreen } from "@/screens/characters/new-character-screen"
import { readOneOf } from "@/shell/search"

type Mode = "photos" | "traits"

const modes: readonly Mode[] = ["photos", "traits"]

type NewCharacterSearch = {
  mode?: Mode
}

export const Route = createFileRoute("/_shell/characters/new")({
  validateSearch: (search: Record<string, unknown>): NewCharacterSearch => {
    const mode = readOneOf(search.mode, modes)
    return mode === undefined ? {} : { mode }
  },
  component: NewCharacterScreen,
})
