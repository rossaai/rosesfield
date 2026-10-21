import type { AppListing, Run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
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
import { vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { bodyOf, defaultsOf } from "@/screens/app/app-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { type AppSeeds, noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/remake/screen"
import { servedAppsQuery } from "@/studio/remake/use-closed-key"
import { remake } from "./remake-fixtures"

const settings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: "set",
    origin: "live",
  },
  lock: "local",
  agent: "unknown",
  agentModel: null,
  retentionDays: null,
}

type Call = { url: string; method: string }

export type Served = {
  runs: Map<string, { run: Run }>
  started: Run | null
}

export const calls: Call[] = []

export const served: Served = { runs: new Map(), started: null }

function answer(body: unknown, status: number): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  )
}

function respond(url: string, method: string): Promise<Response> {
  const path = new URL(url, "http://localhost").pathname
  if (method === "POST" && path === `/api/apps/${remake.id}/runs`) {
    return served.started === null
      ? new Promise(() => undefined)
      : answer({ run: served.started }, 202)
  }
  const runMatch = /^\/api\/runs\/([^/]+)$/.exec(path)
  const record =
    method === "GET" && runMatch !== null
      ? served.runs.get(runMatch[1] ?? "")
      : undefined
  if (record !== undefined) {
    return answer({ run: record.run }, 200)
  }
  return new Promise(() => undefined)
}

export function stubGateway(): void {
  calls.length = 0
  served.runs.clear()
  served.started = null
  vi.stubGlobal("fetch", (input: unknown, init?: { method?: string }) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    calls.push({ url, method })
    return respond(url, method)
  })
}

const runPath = /^\/api\/runs\/[^/]+$/

export function runReads(): Call[] {
  return calls.filter(
    (call) =>
      call.method === "GET" &&
      runPath.test(new URL(call.url, "http://localhost").pathname)
  )
}

export function startedRuns(): Call[] {
  return calls.filter(
    (call) =>
      call.method === "POST" && call.url.endsWith(`/api/apps/${remake.id}/runs`)
  )
}

export function openRemake({
  runs = [],
  seeds = noSeeds,
  credits = null,
  listed = null,
}: {
  runs?: readonly Run[]
  seeds?: AppSeeds
  credits?: number | null
  listed?: AppListing | null
} = {}): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  if (listed !== null) {
    client.setQueryData(servedAppsQuery.queryKey, { apps: [listed] })
  }
  client.setQueryData(runsQuery(remake.id).queryKey, {
    pages: [{ runs: [...runs], next: null }],
    pageParams: [null],
  })
  if (credits !== null) {
    const ask = JSON.parse(JSON.stringify(bodyOf(remake, defaultsOf(remake))))
    const key = priceQuery(remake.id, ask, settings.engine.key).queryKey
    client.setQueryData(key, { price: { source: "rates", credits } })
  }
  const root = createRootRoute({
    component: () => (
      <ToastProvider>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </ToastProvider>
    ),
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <AppScreen app={remake} seeds={seeds} />,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return client
}
