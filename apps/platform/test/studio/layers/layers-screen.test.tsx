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
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { assetQuery, runQuery, runsQuery, settingsQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
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
  keyFrom: "server",
  agent: "unknown",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

function openLayers(options: {
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

const catalogPath = `/api/apps/${layersListing.id}/models`

const asked: string[] = []

const served: Run[] = []

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

function pickerNamed(name: string): Promise<HTMLElement> {
  return screen.findByRole("button", {
    name: `${t("model.picker.title")} ${name}`,
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  asked.length = 0
  served.length = 0
  cleanup()
  resetFrames()
  vi.unstubAllGlobals()
})

describe("Layers before any run", () => {
  it("shows the empty title, what Layers does and one act, Add an image, with no example", async () => {
    openLayers({ runs: [] })
    expect(
      await screen.findByRole("tab", {
        name: t("app.tab.how"),
        selected: true,
      })
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("tab", { name: t("app.tab.history") }))
    const title = await screen.findByText(tCatalog("layers.empty.title"))
    expect(title).not.toBeNull()
    expect(screen.getByText(tCatalog("layers.empty.body"))).not.toBeNull()
    const empty = title.closest<HTMLElement>("[data-slot='state-view']")
    if (empty === null) {
      throw new Error("the empty title sits in no state view")
    }
    expect(
      within(empty).getAllByRole("button", {
        name: tCatalog("layers.empty.action"),
      })
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
        screen.getByRole("tab", {
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

describe("the Layers mode row", () => {
  it("is the one tab row at the column's top, and no mode segment sits in the column", async () => {
    openLayers({ runs: [], hasCatalog: true })
    await pickerNamed(splitGraph.name)
    const label = tCatalog("layers.input.mode.label")
    const tabs = screen.getByRole("tablist", { name: label })
    expect(tabs.querySelectorAll("[role=tab]").length).toBe(4)
    expect(screen.queryByRole("radiogroup", { name: label })).toBeNull()
  })
})

describe("the Layers column on Split", () => {
  it("shows the image, then the model once, then the quality and the count, with the seed closed under Advanced", async () => {
    openLayers({ runs: [], hasCatalog: true })
    const model = await pickerNamed(splitGraph.name)
    const [image] = screen.getAllByText(tCatalog("layers.input.source.label"))
    const quality = screen.getByText(tCatalog("layers.input.quality.label"))
    const [count] = screen.getAllByText(tCatalog("layers.input.count.label"))
    const advanced = screen.getByRole("button", { name: t("field.advanced") })
    const after = (first: Element | undefined, second: Element): boolean =>
      first !== undefined &&
      (first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
        0
    expect(after(image, model)).toBe(true)
    expect(after(model, quality)).toBe(true)
    expect(after(quality, count ?? quality)).toBe(true)
    expect(after(count, advanced)).toBe(true)
    expect(screen.queryByText(tCatalog("layers.input.seed.label"))).toBeNull()
  })
})

describe("Use these inputs on a hosted split run in History", () => {
  const hostedSplit = layersRun({
    id: "6c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f",
    minute: 5,
    inputs: { mode: "split", model: seedream.id, image: [photo], size: "2K" },
    outputs: [firstLayer, secondLayer],
  })

  it("fills the image and the model and shows that run's stack", async () => {
    openLayers({ runs: [hostedSplit], from: hostedSplit, hasCatalog: true })
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    ).not.toBeNull()
    expect(
      screen.getAllByRole("list", { name: tCatalog("layers.stack.title") })
    ).not.toHaveLength(0)
  })
})

describe("Use these inputs on a run History already holds", () => {
  const heldSplit = layersRun({
    id: "8e2f3041-5b6c-4d7e-9f80-a12b3c4d5e6f",
    minute: 5,
    inputs: { mode: "split", model: seedream.id, image: [photo], size: "2K" },
    outputs: [firstLayer, secondLayer],
  })

  it("fills the form from the held run and never asks for it again", async () => {
    openLayers({
      runs: [heldSplit],
      from: heldSplit,
      isFromFetched: false,
      hasCatalog: true,
    })
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    ).not.toBeNull()
    expect(asked).toContain(catalogPath)
    expect(asked.filter((path) => path.includes(heldSplit.id))).toEqual([])
  })

  it("control: asks for a run History does not hold", async () => {
    served.push(heldSplit)
    openLayers({
      runs: [],
      from: heldSplit,
      isFromFetched: false,
      hasCatalog: true,
    })
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    ).not.toBeNull()
    expect(asked).toContain(`/api/runs/${heldSplit.id}`)
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

describe("the open stack", () => {
  it("shows its canvas first, with the run's facts over it and no caption line above it", async () => {
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
    const canvas = await screen.findByRole("figure", {
      name: tCatalog("layers.canvas.label"),
    })
    expect(
      canvas.querySelector("[data-slot='run-facts']")?.textContent
    ).not.toBe("")
    const section = canvas.closest("section")
    expect(section?.querySelectorAll("[data-slot='run-facts']")).toHaveLength(1)
    expect(section?.querySelector("[data-slot='run-prompt']")).toBeNull()
  })
})
