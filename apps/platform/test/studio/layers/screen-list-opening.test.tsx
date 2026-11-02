import { asset } from "@rosesfield/contract"
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
import { assetQuery, runQuery, runsQuery, settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { AppScreen } from "@/studio/layers/screen"
import {
  catalog,
  firstLayer,
  layersListing,
  layersRun,
  photo,
  secondLayer,
  seedream,
  splitGraph,
} from "./layers-fixtures"

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

const hostedSplit = layersRun({
  id: "6c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f",
  minute: 5,
  inputs: { mode: "split", model: seedream.id, image: [photo], size: "2K" },
  outputs: [firstLayer, secondLayer],
})

const answer = { models: [...catalog], defaultModel: null, refusal: null }

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
      if (
        list === "unreadable" &&
        url.endsWith(`/api/apps/${layersListing.id}/models`)
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              models: "unreadable",
              defaultModel: null,
              refusal: null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
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

function openReopenedSplit(): QueryClient {
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
    pages: [{ runs: [hostedSplit], next: null }],
    pageParams: [null],
  })
  client.setQueryData(runQuery(hostedSplit.id).queryKey, { run: hostedSplit })
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
              seeds={{ use: photo, from: hostedSplit.id }}
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
  return client
}

async function columnGenerate(): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const button = document.querySelector<HTMLElement>(
      'aside [data-slot="generate-button"]'
    )
    if (button === null) {
      throw new Error("the column shows no Generate button")
    }
    return button
  })
}

async function press(): Promise<string | null> {
  const button = await columnGenerate()
  const busy = button.getAttribute("aria-busy")
  fireEvent.click(button)
  return busy
}

async function pressShortcuts(): Promise<void> {
  const button = await columnGenerate()
  fireEvent.keyDown(button, { key: "Enter", metaKey: true })
  fireEvent.keyDown(button, { key: "Enter", ctrlKey: true })
}

async function settle(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

const priceAsks = (): Call[] =>
  calls.filter((call) =>
    call.url.endsWith(`/api/apps/${layersListing.id}/price`)
  )

const started = (): Call[] =>
  calls.filter(
    (call) =>
      call.method === "POST" &&
      call.url.endsWith(`/api/apps/${layersListing.id}/runs`)
  )

const startedModels = (): unknown[] =>
  started().map(
    (call) => (call.body as { inputs: Record<string, unknown> }).inputs.model
  )

function pickerName(model: { name: string }): string {
  return `${t("model.picker.title")} ${model.name}`
}

describe("Layers' Generate while its model list opens on a reopened run", () => {
  it("is busy, asks no price and starts no run by press or shortcut before the list arrives, then starts the reopened run's model", async () => {
    const client = openReopenedSplit()
    expect(await press()).toBe("true")
    await pressShortcuts()
    await settle(300)
    expect(priceAsks()).toEqual([])
    expect(started()).toEqual([])
    act(() => {
      client.setQueryData(
        modelCatalogQuery(layersListing.id, keyState).queryKey,
        answer
      )
    })
    await screen.findByRole("button", { name: pickerName(seedream) })
    expect(await press()).toBeNull()
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([seedream.id])
  })

  it("control: prices and starts the split graph once the list fails to load, so Generate never stays busy", async () => {
    stubGateway("unreadable")
    openReopenedSplit()
    await vi.waitFor(() => expect(priceAsks()).not.toHaveLength(0))
    expect(await press()).toBeNull()
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([splitGraph.id])
  })
})
