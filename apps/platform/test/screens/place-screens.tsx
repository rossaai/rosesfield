import { type Asset, asset, type Run, run } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import { assetsQuery, runsQuery, settingsQuery } from "@/api/queries"
import { Route as HistoryRoute } from "@/routes/_shell/history/index"
import { Route as LibraryRoute } from "@/routes/_shell/library"
import { HistoryScreen } from "@/screens/history/history-screen"
import { LibraryScreen } from "@/screens/library/library-screen"
import { ViewerProvider } from "@/viewer/viewer-context"
import { ownerSettings } from "../shell/shell-router"

const made = "2026-10-21T12:00:00.000Z"

export function runOf(id: string, prompt: string, outputs: string[]): Run {
  return run.parse({
    id,
    appId: "image",
    status: "done",
    inputs: { prompt },
    count: outputs.length,
    aspectRatio: "1:1",
    seed: 1,
    outputs,
    progress: 1,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: made,
    finishedAt: made,
  })
}

export function assetOf(id: string, sourceRunId: string | null): Asset {
  return asset.parse({
    id,
    kind: "image",
    mime: "image/png",
    bytes: 1000,
    width: 64,
    height: 64,
    durationSeconds: null,
    sourceRunId,
    createdAt: made,
  })
}

type Seeds = { runs: Run[]; assets?: Asset[] }

export function renderPlace(path: string, seeds: Seeds) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(settingsQuery.queryKey, ownerSettings)
  client.setQueryData(runsQuery(null).queryKey, {
    pages: [{ runs: seeds.runs, next: null }],
    pageParams: [null],
  })
  client.setQueryData(assetsQuery(null).queryKey, {
    pages: [{ assets: seeds.assets ?? [], next: null }],
    pageParams: [null],
  })
  const root = createRootRoute({ component: () => <Outlet /> })
  const shell = createRoute({
    getParentRoute: () => root,
    id: "_shell",
    component: () => <Outlet />,
  })
  const library = createRoute({
    getParentRoute: () => shell,
    path: "/library",
    validateSearch: LibraryRoute.options.validateSearch,
    component: LibraryScreen,
  })
  const history = createRoute({
    getParentRoute: () => shell,
    path: "/history/",
    validateSearch: HistoryRoute.options.validateSearch,
    component: HistoryScreen,
  })
  const router = createRouter({
    routeTree: root.addChildren([shell.addChildren([library, history])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ViewerProvider>
          <RouterProvider router={router} />
        </ViewerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
  return router
}
