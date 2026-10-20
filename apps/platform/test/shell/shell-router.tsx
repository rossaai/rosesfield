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
import type { ReactElement } from "react"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { type Account, accountQuery } from "@/screens/settings/account-query"

export const ownerSettings: GatewaySettings = {
  mode: "owner",
  engine: { target: "comfy-cloud", address: null, key: "set", origin: "live" },
  lock: "local",
  agent: "unknown",
  agentModel: null,
  retentionDays: null,
}

export const account: Account = {
  key: "valid",
  credits: 12.5,
  retentionDays: null,
  cap: null,
}

type Seeds = {
  settings?: GatewaySettings
  account?: Account
}

export function renderAt(
  path: string,
  piece: () => ReactElement,
  seeds: Seeds = { settings: ownerSettings, account }
): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (seeds.settings !== undefined) {
    client.setQueryData(settingsQuery.queryKey, seeds.settings)
  }
  if (seeds.account !== undefined) {
    client.setQueryData(accountQuery.queryKey, seeds.account)
  }
  const root = createRootRoute({
    component: () => (
      <>
        {piece()}
        <Outlet />
      </>
    ),
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
