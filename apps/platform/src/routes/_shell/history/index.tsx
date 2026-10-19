import { createFileRoute } from "@tanstack/react-router"
import { type OutputKind, outputKinds } from "@/catalog/app-facts"
import { HistoryScreen } from "@/screens/history/history-screen"
import { readOneOf, readText } from "@/shell/search"

type RunState = "working" | "failed"

const states: readonly RunState[] = ["working", "failed"]

type HistorySearch = {
  app?: string
  state?: RunState
  kind?: OutputKind
}

export const Route = createFileRoute("/_shell/history/")({
  validateSearch: (search: Record<string, unknown>): HistorySearch => {
    const app = readText(search.app)
    const state = readOneOf(search.state, states)
    const kind = readOneOf(search.kind, outputKinds)
    return {
      ...(app === undefined ? {} : { app }),
      ...(state === undefined ? {} : { state }),
      ...(kind === undefined ? {} : { kind }),
    }
  },
  component: HistoryScreen,
})
