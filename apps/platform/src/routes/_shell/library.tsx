import { createFileRoute } from "@tanstack/react-router"
import { type OutputKind, outputKinds } from "@/catalog/app-facts"
import { LibraryScreen } from "@/screens/library/library-screen"
import { readOneOf, readText } from "@/shell/search"

type LibrarySearch = {
  q?: string
  kind?: OutputKind
  app?: string
}

export const Route = createFileRoute("/_shell/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const q = readText(search.q)
    const kind = readOneOf(search.kind, outputKinds)
    const app = readText(search.app)
    return {
      ...(q === undefined ? {} : { q }),
      ...(kind === undefined ? {} : { kind }),
      ...(app === undefined ? {} : { app }),
    }
  },
  component: LibraryScreen,
})
