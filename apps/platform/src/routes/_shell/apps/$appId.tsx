import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppRouteScreen } from "@/screens/app/app-route-screen"
import { type StageTab, stageTabs } from "@/screens/app/app-stage"
import { readOneOf, readText } from "@/shell/search"
import { oldAddressOf } from "@/studio/recast/old-address"

type AppSearch = {
  use?: string
  from?: string
  share?: string
  tab?: StageTab
}

export const Route = createFileRoute("/_shell/apps/$appId")({
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    const use = readText(search.use)
    const from = readText(search.from)
    const share = readText(search.share)
    const tab = readOneOf(search.tab, stageTabs)
    return {
      ...(use === undefined ? {} : { use }),
      ...(from === undefined ? {} : { from }),
      ...(share === undefined ? {} : { share }),
      ...(tab === undefined ? {} : { tab }),
    }
  },
  beforeLoad: ({ params, search }) => {
    const moved = oldAddressOf(params.appId, search)
    if (moved !== null) {
      throw redirect(moved)
    }
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
