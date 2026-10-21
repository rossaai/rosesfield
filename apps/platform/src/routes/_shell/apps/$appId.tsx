import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppRouteScreen } from "@/screens/app/app-route-screen"
import { type StageTab, stageTabs } from "@/screens/app/app-stage"
import { readOneOf, readText } from "@/shell/search"
import { movedAppOf } from "@/studio/audio/audio-address"
import { oldAddressOf } from "@/studio/recast/old-address"

type AppSearch = {
  use?: string
  from?: string
  share?: string
  tab?: StageTab
  mode?: string
}

export const Route = createFileRoute("/_shell/apps/$appId")({
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    const use = readText(search.use)
    const from = readText(search.from)
    const share = readText(search.share)
    const tab = readOneOf(search.tab, stageTabs)
    const mode = readText(search.mode)
    return {
      ...(use === undefined ? {} : { use }),
      ...(from === undefined ? {} : { from }),
      ...(share === undefined ? {} : { share }),
      ...(tab === undefined ? {} : { tab }),
      ...(mode === undefined ? {} : { mode }),
    }
  },
  beforeLoad: ({ params, search }) => {
    const moved = movedAppOf(params.appId)
    if (moved !== null) {
      throw redirect({
        to: "/apps/$appId",
        params: { appId: moved.appId },
        search,
        hash: moved.hash,
        replace: true,
      })
    }
    const old = oldAddressOf(params.appId, search)
    if (old !== null) {
      throw redirect(old)
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
