import { createFileRoute, Outlet } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { NotFoundScreen } from "@/screens/not-found-screen"
import { readText } from "@/shell/search"
import { ShellFrame } from "@/shell/shell-frame"

type ShellSearch = {
  view?: string
}

function ShellRoute(): ReactElement {
  return (
    <ShellFrame>
      <Outlet />
    </ShellFrame>
  )
}

export const Route = createFileRoute("/_shell")({
  validateSearch: (search: Record<string, unknown>): ShellSearch => {
    const view = readText(search.view)
    return view === undefined ? {} : { view }
  },
  component: ShellRoute,
  notFoundComponent: NotFoundScreen,
})
