import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppRouteScreen } from "@/screens/app/app-route-screen"
import { readText } from "@/shell/search"

type AppSearch = {
  use?: string
  from?: string
  share?: string
}

export const Route = createFileRoute("/_shell/apps/$appId")({
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    const use = readText(search.use)
    const from = readText(search.from)
    const share = readText(search.share)
    return {
      ...(use === undefined ? {} : { use }),
      ...(from === undefined ? {} : { from }),
      ...(share === undefined ? {} : { share }),
    }
  },
  beforeLoad: ({ params, search }) => {
    if (
      params.appId === "characters" &&
      search.use === undefined &&
      search.from === undefined &&
      search.share === undefined
    ) {
      throw redirect({ to: "/characters/new", search: { mode: "traits" } })
    }
  },
  component: AppRouteScreen,
})
