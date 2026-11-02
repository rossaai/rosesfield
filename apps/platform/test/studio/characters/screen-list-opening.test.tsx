import { type CatalogModel, factsOf } from "@rosesfield/catalog/comfy"
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
import { t } from "@/copy/t"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/characters/screen"
import { flux, zImage } from "../image/image-screen"
import {
  characters,
  fluxCredits,
  graphCredits,
  modelOf,
  pricedName,
  trigger,
} from "./traits-screen"

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

const servedFlux: CatalogModel = { ...flux, facts: factsOf(flux.id) }

const catalog = {
  models: [zImage, servedFlux],
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
      if (url.endsWith(`/api/apps/${characters.id}/price`)) {
        const credits = modelOf(body) === flux.id ? fluxCredits : graphCredits
        return json({ price: { source: "rates", credits } })
      }
      if (
        list === "unreadable" &&
        url.endsWith(`/api/apps/${characters.id}/models`)
      ) {
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

function openCharacters(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(runsQuery(characters.id).queryKey, {
    pages: [{ runs: [], next: null }],
    pageParams: [null],
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={characters} seeds={noSeeds} />
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

async function press(name: string): Promise<string | null> {
  const [button] = await screen.findAllByRole("button", { name })
  if (button === undefined) {
    throw new Error(`no ${name} button`)
  }
  const busy = button.getAttribute("aria-busy")
  fireEvent.click(button)
  return busy
}

function pressShortcuts(): void {
  const generate = document.querySelector<HTMLElement>(
    'aside [data-slot="generate-button"]'
  )
  if (generate === null) {
    throw new Error("the column shows no Generate button")
  }
  fireEvent.keyDown(generate, { key: "Enter", metaKey: true })
  fireEvent.keyDown(generate, { key: "Enter", ctrlKey: true })
}

async function settle(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

const priceAsks = (): Call[] =>
  calls.filter((call) => call.url.endsWith(`/api/apps/${characters.id}/price`))

const started = (): Call[] =>
  calls.filter(
    (call) =>
      call.method === "POST" &&
      call.url.endsWith(`/api/apps/${characters.id}/runs`)
  )

const startedModels = (): unknown[] =>
  started().map((call) => modelOf(call.body))

describe("Characters' Generate while its model list opens", () => {
  it("is busy, asks no price and starts no run by press or shortcut before the list arrives, then starts the model the screen opens on", async () => {
    const client = openCharacters()
    expect(await press(t("run.generate"))).toBe("true")
    pressShortcuts()
    await settle(300)
    expect(priceAsks()).toEqual([])
    expect(started()).toEqual([])
    act(() => {
      client.setQueryData(
        modelCatalogQuery(characters.id, keyState).queryKey,
        catalog
      )
    })
    await screen.findByRole("button", { name: trigger(flux) })
    expect(await press(pricedName(fluxCredits))).toBeNull()
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([flux.id])
  })

  it("control: prices and starts the app's own model once the list fails to load, so Generate never stays busy", async () => {
    stubGateway("unreadable")
    openCharacters()
    expect(await press(pricedName(graphCredits))).toBeNull()
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([zImage.id])
  })
})
