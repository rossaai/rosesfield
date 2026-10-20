import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, type Run, run } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import {
  modelCatalogQuery,
  type PriceAsk,
  priceQuery,
} from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/image/screen"

const image = appListing.parse(findApp("image"))

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

const zImage = graph("z-image-turbo", "Z-Image Turbo")
const qwen = graph("qwen-image-2512", "Qwen Image 2512")

const flux: CatalogModel = {
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

const reference = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

const openingAsk = (count: number): PriceAsk => ({
  inputs: { prompt: "", model: zImage.id, resolution: "1k" },
  count,
  aspectRatio: "1:1",
})

type Call = { url: string; method: string }

const calls: Call[] = []

beforeEach(() => {
  calls.length = 0
  vi.stubGlobal("fetch", (input: unknown, init?: { method?: string }) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" })
    return new Promise(() => undefined)
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function runOf(change: Partial<Run>): Run {
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

function openImage(
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
        <TooltipProvider>
          <AppScreen app={image} seeds={noSeeds} />
        </TooltipProvider>
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

function pricedName(credits: number): string {
  return t("run.generate.priced", { amount: formatNumber(credits) })
}

function startedRuns(): Call[] {
  return calls.filter(
    (call) =>
      call.method === "POST" && call.url.endsWith(`/api/apps/${image.id}/runs`)
  )
}

async function recreate(): Promise<void> {
  fireEvent.mouseDown(
    await screen.findByRole("button", { name: t("run.menu") })
  )
  fireEvent.click(
    await screen.findByRole("menuitem", { name: t("run.useInputs") })
  )
}

describe("Image opens on its bar", () => {
  it("chooses the catalog's open-weights default and shows its format, size and count chips and Generate with its price, without attach", async () => {
    openImage([], [[openingAsk(1), 4.5]])
    expect(
      await screen.findAllByLabelText(
        `${t("model.picker.title")} ${modelNameOf(zImage)}`
      )
    ).toHaveLength(1)
    expect(
      await screen.findByRole("button", { name: pricedName(4.5) })
    ).toBeDefined()
    expect(
      screen.getByRole("combobox", {
        name: new RegExp(t("field.aspect.label")),
      })
    ).toBeDefined()
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("1/4")
    expect(screen.queryByLabelText(t("bar.attach"))).toBeNull()
  })
})

describe("the price on Generate", () => {
  it("follows the count before you press Generate, at 3 times one image for a count of 3", async () => {
    openImage(
      [],
      [
        [openingAsk(1), 4.5],
        [openingAsk(3), 13.5],
      ]
    )
    await screen.findByRole("button", { name: pricedName(4.5) })
    const more = screen.getByRole("button", { name: t("bar.count.more") })
    fireEvent.click(more)
    fireEvent.click(more)
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("3/4")
    expect(
      await screen.findByRole("button", { name: pricedName(13.5) })
    ).toBeDefined()
    expect(startedRuns()).toEqual([])
  })
})

describe("a run of 4 on the Image canvas", () => {
  it("shows four working tiles at once", async () => {
    openImage(
      [
        runOf({
          status: "running",
          inputs: { model: zImage.id, prompt: "a paper boat" },
          count: 4,
          aspectRatio: "16:9",
          finishedAt: null,
        }),
      ],
      []
    )
    await waitFor(() =>
      expect(
        [1, 2, 3, 4].map(
          (index) =>
            screen.queryByRole("status", {
              name: t("run.working", { index, count: 4 }),
            }) !== null
        )
      ).toEqual([true, true, true, true])
    )
  })

  it("puts each image in its own tile as it lands while the run still works", async () => {
    const landed = [
      "7b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d01",
      "7b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d02",
    ]
    openImage(
      [
        runOf({
          status: "running",
          inputs: { model: flux.id, prompt: "a paper boat" },
          count: 4,
          aspectRatio: "16:9",
          outputs: landed,
          finishedAt: null,
        }),
      ],
      []
    )
    await waitFor(() =>
      expect(
        [1, 2, 3, 4].map(
          (index) =>
            screen.queryByRole("status", {
              name: t("run.working", { index, count: 4 }),
            }) !== null
        )
      ).toEqual([false, false, true, true])
    )
    const row = document.querySelector('[data-slot="output-row"]')
    expect(row?.children.length).toBe(4)
    await waitFor(() =>
      expect(
        landed.map((assetId) =>
          calls.some((call) => call.url.endsWith(`/api/assets/${assetId}`))
        )
      ).toEqual([true, true])
    )
  })
})

describe("Recreate on a run in History", () => {
  it("fills a graph run's prompt, model, size, count, format and seed and starts no run", async () => {
    openImage(
      [
        runOf({
          inputs: {
            model: qwen.id,
            prompt: "a red door",
            resolution: "1k",
            seed: 12345,
          },
          count: 2,
          aspectRatio: "16:9",
          seed: 12345,
        }),
      ],
      [
        [openingAsk(1), 4.5],
        [
          {
            inputs: {
              prompt: "a red door",
              model: qwen.id,
              resolution: "1k",
              seed: 12345,
            },
            count: 2,
            aspectRatio: "16:9",
          },
          8.25,
        ],
      ]
    )
    await recreate()
    expect(
      await screen.findByRole("button", { name: pricedName(8.25) })
    ).toBeDefined()
    expect(
      screen.getByRole("textbox", { name: t("home.prompt.label") })
    ).toHaveProperty("value", "a red door")
    expect(
      screen.getByLabelText(`${t("model.picker.title")} ${modelNameOf(qwen)}`)
    ).toBeDefined()
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("2/4")
    expect(startedRuns()).toEqual([])
  })

  it("fills a hosted run's references, format, size and seed and starts no run", async () => {
    openImage(
      [
        runOf({
          inputs: {
            model: flux.id,
            prompt: "a blue chair",
            images: [reference],
            aspectRatio: "16:9",
            resolution: "2k",
            seed: 7,
          },
          seed: 7,
        }),
      ],
      [
        [openingAsk(1), 4.5],
        [
          {
            inputs: {
              model: flux.id,
              prompt: "a blue chair",
              images: [reference],
              aspectRatio: "16:9",
              resolution: "2k",
              seed: 7,
            },
          },
          30.17,
        ],
      ]
    )
    await recreate()
    expect(
      await screen.findByRole("button", { name: pricedName(30.17) })
    ).toBeDefined()
    expect(
      screen.getByRole("textbox", { name: t("home.prompt.label") })
    ).toHaveProperty("value", "a blue chair")
    expect(screen.getByLabelText(t("bar.attach"))).toBeDefined()
    expect(startedRuns()).toEqual([])
  })
})
