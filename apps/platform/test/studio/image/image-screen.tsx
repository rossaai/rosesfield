import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, type Run, run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { inputCaption } from "@/screens/app/fields/input-copy"
import {
  modelCatalogQuery,
  type PriceAsk,
  priceQuery,
} from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/image/screen"

export const image = appListing.parse(findApp("image"))

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
  agent: "unknown",
  agentModel: null,
  retentionDays: null,
}

function graph(id: string, name: string): CatalogModel {
  return {
    id,
    kind: "graph",
    maker: "comfy-cloud",
    name,
    nameKey: null,
    task: "text-to-image",
    tags: [{ kind: "open-weights" }],
    form: null,
  }
}

export const zImage = graph("z-image-turbo", "Z-Image Turbo")
export const qwen = graph("qwen-image-2512", "Qwen Image 2512")

export const flux: CatalogModel = {
  id: "bfl/flux-3-image",
  kind: "hosted",
  maker: "Black Forest Labs",
  name: "FLUX 3 Image",
  nameKey: null,
  task: "text-to-image",
  tags: [],
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
      options: ["1:1", "16:9"],
      default: "1:1",
    },
    {
      kind: "choice",
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["1k", "2k"],
      default: "1k",
    },
    {
      kind: "number",
      name: "seed",
      path: "seed",
      required: false,
      min: 0,
      max: 4_294_967_295,
      integer: true,
      default: null,
    },
  ],
}

export const reference = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

export const openingAsk = (count: number): PriceAsk => ({
  inputs: { prompt: "", model: zImage.id, resolution: "1k" },
  count,
  aspectRatio: "1:1",
})

type Call = { url: string; method: string }

export const calls: Call[] = []

export function stubEngine(): void {
  calls.length = 0
  vi.stubGlobal("fetch", (input: unknown, init?: { method?: string }) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" })
    return new Promise(() => undefined)
  })
}

type RunFields = { [Field in keyof Run]?: unknown }

export function runOf(change: RunFields): Run {
  return run.parse({
    id: "d05cd6d3-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: "image",
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

export function openImage(
  runs: readonly Run[],
  prices: readonly (readonly [PriceAsk, number])[]
): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(modelCatalogQuery(image.id, keyState).queryKey, {
    models: [zImage, qwen, flux],
    defaultModel: zImage.id,
    refusal: null,
  })
  client.setQueryData(runsQuery(image.id).queryKey, {
    pages: [{ runs: [...runs], next: null }],
    pageParams: [null],
  })
  for (const [ask, credits] of prices) {
    client.setQueryData(priceQuery(image.id, ask, keyState).queryKey, {
      price: { source: "rates", credits },
    })
  }
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={image} seeds={noSeeds} />
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export function pricedName(credits: number): string {
  return t("run.generate.priced", { amount: formatNumber(credits) })
}

export function startedRuns(): Call[] {
  return calls.filter(
    (call) =>
      call.method === "POST" && call.url.endsWith(`/api/apps/${image.id}/runs`)
  )
}

export function settingChip(label: string): HTMLElement {
  const chip = screen
    .getAllByRole("combobox")
    .find((one) => one.textContent?.startsWith(`${label} `) === true)
  if (chip === undefined) {
    throw new Error(`no ${label} chip`)
  }
  return chip
}

export function chipValue(label: string): string | null | undefined {
  return settingChip(label).querySelector('[data-slot="select-value"]')
    ?.textContent
}

export function chipValues(): (string | null | undefined)[] {
  return screen
    .getAllByRole("combobox")
    .map(
      (chip) => chip.querySelector('[data-slot="select-value"]')?.textContent
    )
}

export function inputCaptionOf(name: string): string {
  const input = image.inputs.find((one) => one.name === name)
  if (input === undefined) {
    throw new Error(`no ${name} input`)
  }
  return inputCaption(input)
}

export async function recreate(): Promise<void> {
  fireEvent.mouseDown(
    await screen.findByRole("button", { name: t("run.menu") })
  )
  fireEvent.click(
    await screen.findByRole("menuitem", { name: t("run.useInputs") })
  )
}
