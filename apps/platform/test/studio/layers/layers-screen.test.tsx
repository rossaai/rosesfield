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
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { assetQuery, runsQuery, settingsQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { AppScreen } from "@/studio/layers/screen"
import { asPhone, resetFrames } from "../../screens/app/frame-render"
import {
  catalog,
  editGraph,
  fillGraph,
  firstLayer,
  layersListing,
  layersRun,
  photo,
  relightGraph,
  secondLayer,
  seedream,
  splitGraph,
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
  agent: "unknown",
  agentModel: null,
  retentionDays: null,
}

function openLayers(options: {
  runs: readonly Run[]
  use?: string
  hasCatalog?: boolean
}): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(runsQuery(layersListing.id).queryKey, {
    pages: [{ runs: [...options.runs], next: null }],
    pageParams: [null],
  })
  if (options.hasCatalog === true) {
    client.setQueryData(modelCatalogQuery(layersListing.id, "set").queryKey, {
      models: [...catalog],
      defaultModel: null,
      refusal: null,
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
              seeds={{ use: options.use, from: undefined }}
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

function pickerNamed(name: string): Promise<HTMLElement> {
  return screen.findByRole("button", {
    name: `${t("model.picker.title")} ${name}`,
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  resetFrames()
  vi.unstubAllGlobals()
})

describe("Layers before any run", () => {
  it("shows the empty title, what Layers does and one act, Add an image, with no example", async () => {
    openLayers({ runs: [] })
    const title = await screen.findByText(tCatalog("layers.empty.title"))
    expect(title).not.toBeNull()
    expect(screen.getByText(tCatalog("layers.empty.body"))).not.toBeNull()
    expect(
      screen.getAllByRole("button", { name: tCatalog("layers.empty.action") })
    ).toHaveLength(1)
    expect(document.querySelector("img")).toBeNull()
  })
})

describe("the model of each Layers mode", () => {
  it("opens Split, Edit, Relight and Fill each on its own graph", async () => {
    openLayers({ runs: [], hasCatalog: true })
    expect(await pickerNamed(splitGraph.name)).not.toBeNull()
    const modes = [
      ["edit", editGraph.name],
      ["relight", relightGraph.name],
      ["fill", fillGraph.name],
      ["split", splitGraph.name],
    ] as const
    for (const [mode, name] of modes) {
      fireEvent.click(
        screen.getByRole("radio", {
          name: tCatalog(`layers.choice.mode.${mode}`),
        })
      )
      expect(await pickerNamed(name)).not.toBeNull()
    }
  })

  it("hides the count when you pick a split model whose schema takes none", async () => {
    openLayers({ runs: [], hasCatalog: true, use: photo })
    const label = tCatalog("layers.input.count.label")
    expect(await screen.findAllByText(label)).not.toHaveLength(0)
    fireEvent.click(await pickerNamed(splitGraph.name))
    fireEvent.click(await screen.findByRole("option", { name: seedream.name }))
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(screen.queryAllByText(label)).toHaveLength(0)
  })
})

describe("Layers on a phone", () => {
  it("fills the stage with the canvas and puts the layer strip at its bottom edge", async () => {
    asPhone()
    openLayers({
      runs: [
        layersRun({
          id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
          minute: 0,
          inputs: { mode: "split" },
          outputs: [firstLayer, secondLayer],
        }),
      ],
    })
    const strip = await screen.findByRole("list", {
      name: tCatalog("layers.stack.title"),
    })
    const stack = strip.closest("[data-slot='layers-phone-stack']")
    expect(stack).not.toBeNull()
    expect(stack?.lastElementChild?.contains(strip)).toBe(true)
    expect(
      stack?.querySelector("[data-slot='layers-phone-canvas']")
    ).not.toBeNull()
    expect(
      screen.getAllByRole("list", { name: tCatalog("layers.stack.title") })
    ).toHaveLength(1)
  })
})
