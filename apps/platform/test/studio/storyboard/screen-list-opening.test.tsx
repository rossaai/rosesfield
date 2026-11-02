import { findApp } from "@rosesfield/catalog"
import { keyframeTextModel } from "@rosesfield/catalog/storyboard"
import { startRunBodyFor } from "@rosesfield/contract"
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
import { tCatalog } from "@/copy/t"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { AppScreen } from "@/studio/storyboard/screen"
import {
  pickerTriggerName,
  qwenEdit,
  sceneFields,
  storyboard,
  storyboardRun,
  zImage,
} from "./storyboard-screen"

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

const definition = findApp(storyboard.id)

const textModel = keyframeTextModel?.value ?? zImage.id

const firstScene = "the door at dusk"

const secondScene = "the stairs at dusk"

const madeKeyframe = "0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"

const sceneRun = storyboardRun({
  id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4c01",
  count: 1,
  cost: { amount: 0.006, currency: "USD" },
  inputs: {
    model: textModel,
    keyframe: "1",
    sceneCount: "2",
    scene1: firstScene,
    scene2: secondScene,
    look: "dusk",
  },
})

const answer = {
  models: [zImage, qwenEdit],
  defaultModel: qwenEdit.id,
  refusal: null,
}

type Body = { inputs: Record<string, unknown> }

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

type ListAnswer = "held" | "unreadable"

const runsPath = `/api/apps/${storyboard.id}/runs`

function json(value: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  )
}

function stubGateway(list: ListAnswer): void {
  calls.length = 0
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
      calls.push({ url, method, body })
      if (method === "POST" && url.endsWith(runsPath)) {
        const number = calls.filter(
          (call) => call.method === "POST" && call.url.endsWith(runsPath)
        ).length
        return json({
          run: storyboardRun({
            id: `7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4e0${number}`,
            outputs: [madeKeyframe],
          }),
        })
      }
      if (
        list === "unreadable" &&
        url.endsWith(`/api/apps/${storyboard.id}/models`)
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

function openReopenedScene(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(runsQuery(storyboard.id).queryKey, {
    pages: [{ runs: [sceneRun], next: null }],
    pageParams: [null],
  })
  client.setQueryData(runQuery(sceneRun.id).queryKey, { run: sceneRun })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen
              app={storyboard}
              seeds={{ use: undefined, from: sceneRun.id }}
            />
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/apps/storyboard"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return client
}

async function addSecondScene(): Promise<void> {
  await vi.waitFor(() => expect(sceneFields()[0]?.value).toBe(firstScene))
  fireEvent.click(
    await screen.findByRole("button", {
      name: tCatalog("storyboard.scene.add"),
    })
  )
  await vi.waitFor(() => expect(sceneFields()).toHaveLength(2))
  const [, second] = sceneFields()
  if (second === undefined) {
    throw new Error("the form shows no second scene")
  }
  fireEvent.change(second, { target: { value: secondScene } })
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
  calls.filter((call) => call.url.endsWith(`/api/apps/${storyboard.id}/price`))

const started = (): Body[] =>
  calls
    .filter((call) => call.method === "POST" && call.url.endsWith(runsPath))
    .map((call) => call.body as Body)

const startedBy = (keyframe: string): unknown[] =>
  started()
    .filter((body) => body.inputs.keyframe === keyframe)
    .map((body) => body.inputs.model)

function refusedBodies(): Body[] {
  if (definition === null) {
    throw new Error("the catalog holds no Storyboard")
  }
  const check = startRunBodyFor(definition)
  return started().filter((body) => !check.safeParse(body).success)
}

describe("Storyboard's Generate while its model list opens on a reopened scene", () => {
  it("is busy, asks no price and starts no keyframe by press or shortcut before the list arrives, then makes the second scene on the model the screen opens on", async () => {
    const client = openReopenedScene()
    await addSecondScene()
    expect(await press()).toBe("true")
    await pressShortcuts()
    await settle(400)
    expect(priceAsks()).toEqual([])
    expect(started()).toEqual([])
    act(() => {
      client.setQueryData(
        modelCatalogQuery(storyboard.id, keyState).queryKey,
        answer
      )
    })
    await screen.findByRole("button", { name: pickerTriggerName(qwenEdit) })
    expect(await press()).toBeNull()
    await vi.waitFor(() => expect(startedBy("2")).not.toHaveLength(0))
    expect(startedBy("1")).toEqual([textModel])
    expect(startedBy("2")).toEqual([qwenEdit.id])
    expect(refusedBodies()).toEqual([])
  })

  it("control: starts the first keyframe once the list fails to load, so Generate never stays busy", async () => {
    stubGateway("unreadable")
    openReopenedScene()
    await addSecondScene()
    await vi.waitFor(() => expect(priceAsks()).not.toHaveLength(0))
    expect(await press()).toBeNull()
    await vi.waitFor(() => expect(startedBy("1")).not.toHaveLength(0))
    expect(startedBy("1")).toEqual([textModel])
  })
})
