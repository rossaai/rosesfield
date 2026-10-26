import { asset, type Run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import { vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { assetQuery, runQuery, runsQuery, settingsQuery } from "@/api/queries"
import { AppScreen } from "@/studio/layers/screen"
import {
  catalog,
  firstLayer,
  layersListing,
  photo,
  secondLayer,
} from "./layers-fixtures"

const settings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: "set",
    origin: "live",
  },
  lock: "local",
  keyFrom: "server",
  agent: "unknown",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

export function openLayers(options: {
  runs: readonly Run[]
  use?: string
  from?: Run
  isFromFetched?: boolean
  hasCatalog?: boolean
}): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  for (const layer of [firstLayer, secondLayer]) {
    client.setQueryData(["layers-size", layer], { width: 1024, height: 768 })
  }
  client.setQueryData(runsQuery(layersListing.id).queryKey, {
    pages: [{ runs: [...options.runs], next: null }],
    pageParams: [null],
  })
  if (options.hasCatalog === true) {
    vi.stubGlobal("fetch", answerGateway)
  }
  if (options.from !== undefined && options.isFromFetched !== false) {
    client.setQueryData(runQuery(options.from.id).queryKey, {
      run: options.from,
    })
  }
  client.setQueryData(assetQuery(photo).queryKey, {
    asset: asset.parse({
      id: photo,
      kind: "image",
      mime: "image/png",
      bytes: 2_000_000,
      width: 1024,
      height: 768,
      durationSeconds: null,
      sourceRunId: null,
      createdAt: "2026-10-20T09:00:00.000Z",
    }),
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen
              app={layersListing}
              seeds={{ use: options.use, from: options.from?.id }}
            />
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/apps/layers"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export const catalogPath = `/api/apps/${layersListing.id}/models`

export const asked: string[] = []

export const served: Run[] = []

function bodyOf(pathname: string): unknown {
  if (pathname === catalogPath) {
    return { models: [...catalog], defaultModel: null, refusal: null }
  }
  const run = served.find((one) => pathname === `/api/runs/${one.id}`)
  return run === undefined ? undefined : { run }
}

function answerGateway(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(String(input), "http://localhost")
  asked.push(url.pathname)
  const body = bodyOf(url.pathname)
  if (body === undefined) {
    return new Promise(() => undefined)
  }
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  )
}
