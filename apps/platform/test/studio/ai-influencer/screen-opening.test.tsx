import { findApp } from "@rosesfield/catalog"
import { sheetPrompt } from "@rosesfield/catalog/ai-influencer"
import { type CatalogModel, factsOf } from "@rosesfield/catalog/comfy"
import { appListing, run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runQuery, runsQuery, settingsQuery } from "@/api/queries"
import { formatWholeCredits } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { keepLastUsed } from "@/screens/app/hosted/last-used"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { type AppSeeds, noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/ai-influencer/screen"
import { qwenEdit, zImage } from "../image/image-screen"

const app = appListing.parse(findApp("ai-influencer"))

const keyState = "set"

const credits = 3.33

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

const gptImage: CatalogModel = {
  id: "openai/gpt-image-2.5-sunburst",
  kind: "hosted",
  maker: "OpenAI",
  name: "GPT Image 2.5 Sunburst",
  nameKey: null,
  task: "text-to-image",
  tags: [{ kind: "hosted" }],
  facts: factsOf("openai/gpt-image-2.5-sunburst"),
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
      kind: "choice",
      name: "quality",
      path: "quality",
      required: false,
      options: ["auto", "low", "medium", "high", "xhigh", "max"],
      default: null,
    },
    {
      kind: "choice",
      name: "size",
      path: "size",
      required: false,
      options: ["1024x1024", "1536x1024", "1024x1536", "auto"],
      default: null,
    },
  ],
}

const catalog = {
  models: [zImage, qwenEdit, gptImage],
  defaultModel: zImage.id,
  refusal: null,
}

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

function stubGateway(): void {
  calls.length = 0
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      const url = String(input)
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
      calls.push({ url, method: init?.method ?? "GET", body })
      if (url.endsWith(`/api/apps/${app.id}/price`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ price: { source: "rates", credits } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      }
      return new Promise(() => undefined)
    }
  )
}

beforeEach(stubGateway)

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

type Opening = { seeds?: AppSeeds; isCatalogCold?: boolean }

function openInfluencer({
  seeds = noSeeds,
  isCatalogCold = false,
}: Opening = {}): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  if (!isCatalogCold) {
    client.setQueryData(modelCatalogQuery(app.id, keyState).queryKey, catalog)
  }
  client.setQueryData(runsQuery(app.id).queryKey, {
    pages: [{ runs: [], next: null }],
    pageParams: [null],
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={app} seeds={seeds} />
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
  return client
}

function shownTriggers(model: CatalogModel): Promise<HTMLElement[]> {
  return screen.findAllByRole("button", {
    name: `${t("model.picker.title")} ${modelNameOf(model)}`,
  })
}

function pricedName(): string {
  return t("run.generate.priced", { amount: formatWholeCredits(credits) })
}

async function generate(): Promise<Record<string, unknown>> {
  const [button] = await screen.findAllByRole("button", { name: pricedName() })
  if (button === undefined) {
    throw new Error("no priced Generate")
  }
  fireEvent.click(button)
  const started = (): Call[] =>
    calls.filter(
      (call) =>
        call.method === "POST" && call.url.endsWith(`/api/apps/${app.id}/runs`)
    )
  await vi.waitFor(() => expect(started()).toHaveLength(1))
  const body = started()[0]?.body
  return typeof body === "object" &&
    body !== null &&
    "inputs" in body &&
    typeof body.inputs === "object" &&
    body.inputs !== null
    ? { ...body.inputs }
    : {}
}

const mantis = {
  characterType: "mantis",
  gender: "woman",
  hairstyle: "beehive",
  hairColor: "red",
  accessory: "earrings",
  outfit: "stage",
}

describe("AI Influencer opens", () => {
  it("on the catalog's #1, GPT Image 2.5 Sunburst, at medium, and sends medium and its size closest to 16:9", async () => {
    openInfluencer()
    expect(await shownTriggers(gptImage)).not.toHaveLength(0)
    const inputs = await generate()
    expect(inputs).toMatchObject({
      model: gptImage.id,
      quality: "medium",
      size: "1536x1024",
    })
  })

  it("with one model picker, its quality, and no shape setting, since the run sets the shape", async () => {
    openInfluencer()
    expect(await shownTriggers(gptImage)).toHaveLength(1)
    expect(
      screen.getAllByRole("combobox").map((one) => one.textContent ?? "")
    ).toEqual(expect.arrayContaining([expect.stringContaining("Medium")]))
    expect(screen.queryByText("1024x1024")).toBeNull()
    expect(screen.queryByText("1536x1024")).toBeNull()
  })

  it("on the model and settings you used before, as you left them", async () => {
    keepLastUsed(app.id, {
      model: gptImage.id,
      settings: { quality: "high" },
    })
    openInfluencer()
    expect(await shownTriggers(gptImage)).not.toHaveLength(0)
    expect(await generate()).toMatchObject({
      model: gptImage.id,
      quality: "high",
    })
  })

  it("on the model and quality of a run you recreate", async () => {
    const runId = "6b1e2d3c-4f5a-4b6c-8d7e-9f0a1b2c3d4e"
    const recreated = run.parse({
      id: runId,
      appId: app.id,
      status: "done",
      inputs: {
        ...mantis,
        model: gptImage.id,
        quality: "low",
        size: "1536x1024",
        prompt: sheetPrompt(mantis),
      },
      count: 1,
      aspectRatio: null,
      seed: null,
      outputs: [],
      progress: null,
      engine: {
        adapter: "comfy-router",
        models: [gptImage.id],
        workflowHash: null,
      },
      cost: null,
      origin: "live",
      failure: null,
      createdAt: "2026-10-30T09:00:21.658Z",
      finishedAt: "2026-10-30T09:00:43.039Z",
    })
    openInfluencer({
      seeds: { ...noSeeds, from: runId },
    }).setQueryData(runQuery(runId).queryKey, { run: recreated })
    expect(await generate()).toMatchObject({
      ...mantis,
      model: gptImage.id,
      quality: "low",
    })
  })
})

describe("Remix of a template", () => {
  it("fills the template's traits and leaves the model as it opens, at medium", async () => {
    openInfluencer({ seeds: { ...noSeeds, example: "mantis" } })
    const inputs = await generate()
    expect(inputs).toMatchObject({
      ...mantis,
      model: gptImage.id,
      quality: "medium",
      prompt: sheetPrompt(mantis),
    })
  })

  it("keeps the template's traits when the catalog arrives after them", async () => {
    const client = openInfluencer({
      seeds: { ...noSeeds, example: "mantis" },
      isCatalogCold: true,
    })
    await screen.findAllByRole("button", {
      name: tCatalog("aiInfluencer.studio.shuffle"),
    })
    expect(
      screen.queryAllByRole("button", { name: pricedName() })
    ).toHaveLength(0)
    act(() => {
      client.setQueryData(modelCatalogQuery(app.id, keyState).queryKey, catalog)
    })
    expect(await generate()).toMatchObject({ ...mantis, model: gptImage.id })
  })

  it("keeps the model you used before", async () => {
    keepLastUsed(app.id, { model: zImage.id, settings: {} })
    openInfluencer({ seeds: { ...noSeeds, example: "mantis" } })
    expect(await shownTriggers(zImage)).not.toHaveLength(0)
    const inputs = await generate()
    expect(inputs).toMatchObject({ ...mantis, model: zImage.id })
    expect(inputs.quality).toBeUndefined()
  })
})
