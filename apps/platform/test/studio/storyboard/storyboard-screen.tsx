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
import { defaultsOf, type FormValues } from "@/screens/app/app-form"
import {
  modelCatalogQuery,
  priceQuery,
} from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/storyboard/screen"
import { keyframeBody } from "@/studio/storyboard/storyboard-model"

export const storyboard = appListing.parse(findApp("storyboard"))

const keyState = "set"

const settings: GatewaySettings = {
  mode: "owner",
  engine: { target: "comfy-cloud", address: null, key: keyState, origin: "live" },
  lock: "local",
  agent: "unknown",
  agentModel: null,
  retentionDays: null,
}

export const qwenEdit: CatalogModel = {
  id: "qwen-image-edit-2511",
  kind: "graph",
  maker: "comfy-cloud",
  name: "Qwen Image Edit 2511",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "open-weights" }],
  form: null,
}

export const fluxImage: CatalogModel = {
  id: "bfl/flux-3-image",
  kind: "hosted",
  maker: "Black Forest Labs",
  name: "FLUX 3 Image",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "references", max: 10 }],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "media",
      name: "images",
      path: "images",
      required: false,
      media: "image",
      min: 1,
      max: 10,
    },
    {
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["1:1", "16:9", "21:9"],
      default: "1:1",
    },
    {
      kind: "choice",
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["0.75k", "1k"],
      default: "1k",
    },
  ],
}

type Call = { url: string; method: string }

export const calls: Call[] = []

export function stubEngine(): void {
  calls.length = 0
  vi.stubGlobal("fetch", (input: unknown, init?: { method?: string }) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" })
    return new Promise(() => undefined)
  })
}

export function startedRuns(): Call[] {
  return calls.filter(
    (call) =>
      call.method === "POST" &&
      call.url.endsWith(`/api/apps/${storyboard.id}/runs`)
  )
}

type RunFields = { [Field in keyof Run]?: unknown }

export function storyboardRun(change: RunFields): Run {
  return run.parse({
    id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a01",
    appId: "storyboard",
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

export type Price = readonly [FormValues, CatalogModel, number]

export function openingValues(): FormValues {
  return defaultsOf(storyboard)
}

type Open = {
  runs?: readonly Run[]
  prices?: readonly Price[]
}

export type Opened = {
  leave: () => Promise<void>
  back: () => void
}

export function openStoryboard({ runs = [], prices = [] }: Open = {}): Opened {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(modelCatalogQuery(storyboard.id, keyState).queryKey, {
    models: [qwenEdit, fluxImage],
    defaultModel: qwenEdit.id,
    refusal: null,
  })
  client.setQueryData(runsQuery(storyboard.id).queryKey, {
    pages: [{ runs: [...runs], next: null }],
    pageParams: [null],
  })
  for (const [values, model, credits] of prices) {
    const ask = JSON.parse(
      JSON.stringify(keyframeBody(storyboard, values, model))
    )
    client.setQueryData(priceQuery(storyboard.id, ask, keyState).queryKey, {
      price: { source: "rates", credits },
    })
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
  const board = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <AppScreen app={storyboard} seeds={noSeeds} />,
  })
  const elsewhere = createRoute({
    getParentRoute: () => root,
    path: "/elsewhere",
    component: () => <p>elsewhere</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([board, elsewhere]),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return {
    leave: () => router.navigate({ to: "/elsewhere" }),
    back: () => router.history.back(),
  }
}

export function pricedName(credits: number): string {
  return t("run.generate.priced", { amount: formatNumber(credits) })
}

export function sceneFields(): HTMLTextAreaElement[] {
  return screen
    .queryAllByPlaceholderText(tCatalog("storyboard.input.scenes.placeholder"))
    .filter(
      (field): field is HTMLTextAreaElement =>
        field instanceof HTMLTextAreaElement
    )
}

export function addScenes(times: number): void {
  for (let pressed = 0; pressed < times; pressed += 1) {
    fireEvent.click(
      screen.getByRole("button", { name: tCatalog("storyboard.scene.add") })
    )
  }
}

export function pickerTriggerName(model: CatalogModel): string {
  return `${t("model.picker.title")} ${model.name}`
}
