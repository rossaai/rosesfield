import { createFileRoute } from "@tanstack/react-router"
import { UnlockScreen } from "@/screens/unlock/unlock-screen"
import { readSamePath } from "@/shell/search"

type UnlockSearch = {
  next?: string
}

export const Route = createFileRoute("/unlock")({
  validateSearch: (search: Record<string, unknown>): UnlockSearch => {
    const next = readSamePath(search.next)
    return next === undefined ? {} : { next }
  },
  component: UnlockScreen,
})
