import { findApp } from "@rosesfield/catalog"
import { type CatalogModel, factsOf } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
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
import { runsQuery, settingsQuery } from "@/api/queries"
import { formatWholeCredits } from "@/copy/format"
import { t } from "@/copy/t"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
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
  ],
}

const catalog = {
  models: [zImage, qwenEdit, gptImage],
  defaultModel: zImage.id,
  refusal: null,
}

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

type ListAnswer = "held" | "unreadable"

function stubGateway(list: ListAnswer): void {
  calls.length = 0
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      const url = String(input)
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
      calls.push({ url, method: init?.method ?? "GET", body })
      const json = (value: unknown): Promise<Response> =>
        Promise.resolve(
          new Response(JSON.stringify(value), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      if (url.endsWith(`/api/apps/${app.id}/price`)) {
        return json({ price: { source: "rates", credits } })
      }
      if (list === "unreadable" && url.endsWith(`/api/apps/${app.id}/models`)) {
        return json({ models: "unreadable", defaultModel: null, refusal: null })
      }
      return new Promise(() => undefined)
    }
  )
}

beforeEach(() => stubGateway("held"))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

function openInfluencer(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(runsQuery(app.id).queryKey, {
    pages: [{ runs: [], next: null }],
    pageParams: [null],
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={app} seeds={noSeeds} />
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

function pricedName(): string {
  return t("run.generate.priced", { amount: formatWholeCredits(credits) })
}

async function press(name: string): Promise<string | null> {
  const [button] = await screen.findAllByRole("button", { name })
  if (button === undefined) {
    throw new Error(`no ${name} button`)
  }
  const busy = button.getAttribute("aria-busy")
  fireEvent.click(button)
  return busy
}

const started = (): Call[] =>
  calls.filter(
    (call) =>
      call.method === "POST" && call.url.endsWith(`/api/apps/${app.id}/runs`)
  )

const startedModels = (): unknown[] =>
  started().map((call) =>
    typeof call.body === "object" &&
    call.body !== null &&
    "inputs" in call.body &&
    typeof call.body.inputs === "object" &&
    call.body.inputs !== null &&
    "model" in call.body.inputs
      ? call.body.inputs.model
      : null
  )

describe("AI Influencer's Generate while its model list opens", () => {
  it("is busy and starts no run before the list arrives, then starts the model the screen opens on", async () => {
    const client = openInfluencer()
    expect(await press(t("run.generate"))).toBe("true")
    await act(async () => undefined)
    act(() => {
      client.setQueryData(modelCatalogQuery(app.id, keyState).queryKey, catalog)
    })
    expect(await press(pricedName())).toBeNull()
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([gptImage.id])
  })

  it("control: prices and starts the app's own model once the list fails to load, so Generate never stays busy", async () => {
    stubGateway("unreadable")
    openInfluencer()
    expect(await press(pricedName())).toBeNull()
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([zImage.id])
  })
})
