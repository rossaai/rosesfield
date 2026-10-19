import { createFileRoute } from "@tanstack/react-router"
import { type OutputKind, outputKinds } from "@/catalog/app-facts"
import { AppsScreen } from "@/screens/apps/apps-screen"
import { readOneOf, readText } from "@/shell/search"

type AppsSearch = {
  q?: string
  kind?: OutputKind
}

export const Route = createFileRoute("/_shell/apps/")({
  validateSearch: (search: Record<string, unknown>): AppsSearch => {
    const q = readText(search.q)
    const kind = readOneOf(search.kind, outputKinds)
    return {
      ...(q === undefined ? {} : { q }),
      ...(kind === undefined ? {} : { kind }),
    }
  },
  component: AppsScreen,
})
