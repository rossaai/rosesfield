import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, type Run, run } from "@rosesfield/contract"
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
import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { bodyOf, defaultsOf, type FormValues } from "@/screens/app/app-form"
import {
  modelCatalogQuery,
  type PriceAsk,
  priceQuery,
} from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
import { bodyAppFor } from "@/studio/ads/ads-rules"
import { AppScreen } from "@/studio/ads/screen"

export const ads = appListing.parse(findApp("ads"))

export const photos = [
  "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d",
  "5e3d2c1b-0a9f-4b7c-9d6e-4f3a2b1c0d9e",
  "6f4e3d2c-1b0a-4c8d-8e7f-5a4b3c2d1e0f",
]

export const character = "7a5f4e3d-2c1b-4d9e-9f8a-6b5c4d3e2f1a"

const keyState = "set"

const settings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: keyState,
    origin: "live",
  },
  lock: "local",
  keyFrom: "server",
  agent: "unknown",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

type Sent = { method?: string; body?: unknown }

function bodyOfCall(body: unknown): unknown {
  return typeof body === "string" ? JSON.parse(body) : null
}

export function stubEngine(): void {
  calls.length = 0
  vi.stubGlobal("fetch", (input: unknown, init?: Sent) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: bodyOfCall(init?.body),
    })
    return new Promise(() => undefined)
  })
}

export function startedRuns(): Call[] {
  return calls.filter(
    (call) =>
      call.method === "POST" && call.url.endsWith(`/api/apps/${ads.id}/runs`)
  )
}

type RunFields = { [Field in keyof Run]?: unknown }

export function adsRun(change: RunFields): Run {
  return run.parse({
    id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a03",
    appId: ads.id,
    status: "done",
    inputs: {},
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T09:00:00.000Z",
    finishedAt: "2026-10-20T09:00:20.000Z",
    ...change,
  })
}

export type Price = readonly [FormValues, number]

export function openingValues(): FormValues {
  return defaultsOf(ads)
}

export function priceAskOf(values: FormValues): PriceAsk {
  return JSON.parse(
    JSON.stringify(bodyOf(bodyAppFor(ads, values.inputs), values))
  )
}

type Open = {
  runs?: readonly Run[]
  prices?: readonly Price[]
  models?: readonly CatalogModel[]
}

export function openAds({
  runs = [],
  prices = [],
  models = [],
}: Open = {}): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(runsQuery(ads.id).queryKey, {
    pages: [{ runs: [...runs], next: null }],
    pageParams: [null],
  })
  if (models.length > 0) {
    client.setQueryData(modelCatalogQuery(ads.id, keyState).queryKey, {
      models: [...models],
      defaultModel: null,
      refusal: null,
    })
  }
  for (const [values, credits] of prices) {
    client.setQueryData(
      priceQuery(ads.id, priceAskOf(values), keyState).queryKey,
      { price: { source: "rates", credits } }
    )
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
    component: () => <AppScreen app={ads} seeds={noSeeds} />,
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

export async function emptyCanvas(): Promise<HTMLElement> {
  fireEvent.click(
    await screen.findByRole("tab", { name: t("app.tab.history") })
  )
  return screen.findByText(tCatalog("ads.empty.title"))
}

export async function recreate(): Promise<void> {
  fireEvent.mouseDown(
    await screen.findByRole("button", { name: t("run.menu") })
  )
  fireEvent.click(
    await screen.findByRole("menuitem", { name: t("run.useInputs") })
  )
}

export function pricedName(credits: number): string {
  return t("run.generate.priced", { amount: formatNumber(credits) })
}

export function bar(): HTMLElement {
  const found = document.querySelector<HTMLElement>("[data-slot=prompt-dock]")
  if (found === null) {
    throw new Error("no docked bar")
  }
  return found
}

export function prompt(): HTMLTextAreaElement {
  const field = bar().querySelector("textarea")
  if (field === null) {
    throw new Error("no prompt in the bar")
  }
  return field
}

export function generate(): void {
  const button = bar().querySelector<HTMLElement>(
    "[data-bar=prompt] [data-slot=generate-button]"
  )
  if (button === null) {
    throw new Error("no Generate in the bar")
  }
  fireEvent.click(button)
}

export function attachTile(): HTMLElement {
  const tile = bar().querySelector<HTMLElement>(
    `[aria-label="${t("bar.attach")}"]`
  )
  if (tile === null) {
    throw new Error("no attach button in the bar")
  }
  return tile
}
