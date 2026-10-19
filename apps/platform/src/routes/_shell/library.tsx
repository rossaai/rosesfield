import { createFileRoute } from "@tanstack/react-router"
import { type OutputKind, outputKinds } from "@/catalog/app-facts"
import { LibraryScreen } from "@/screens/library/library-screen"
import { readOneOf, readText } from "@/shell/search"

type LibrarySearch = {
  q?: string
  kind?: OutputKind
}

export const Route = createFileRoute("/_shell/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const q = readText(search.q)
    const kind = readOneOf(search.kind, outputKinds)
    return {
      ...(q === undefined ? {} : { q }),
      ...(kind === undefined ? {} : { kind }),
    }
  },
  component: LibraryScreen,
})
