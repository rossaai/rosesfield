import { findApp } from "@rosesfield/catalog"
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
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { characterQuery, runsQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { ModeCanvas } from "@/studio/characters/mode-canvas"
import type { Mode } from "../../../../../packages/catalog/src/characters/traits"

const characters = appListing.parse(findApp("characters"))

const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"
const photo = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"
const portraits = [
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c11",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c12",
]
const views = [
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c21",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c22",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c23",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c24",
]

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

function stubGateway(): void {
  calls.length = 0
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      })
      return new Promise(() => undefined)
    }
  )
}

function runOf(inputs: Run["inputs"], outputs: readonly string[]): Run {
  return run.parse({
    id: "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
    appId: characters.id,
    status: "done",
    inputs,
    count: outputs.length,
    aspectRatio: null,
    seed: 12,
    outputs: [...outputs],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T10:00:00.000Z",
    finishedAt: "2026-10-17T10:00:03.000Z",
  })
}

function openCanvas(mode: Mode, shown: Run): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(runsQuery(characters.id).queryKey, {
    pages: [{ runs: [shown], next: null }],
    pageParams: [null],
  })
  client.setQueryData(characterQuery(characterId).queryKey, {
    character: {
      id: characterId,
      name: "Mara",
      references: [photo],
      notes: "",
      createdAt: "2026-10-17T09:00:00.000Z",
    },
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <ModeCanvas
              app={characters}
              mode={mode}
              shows={["traits", "angles"]}
              onUseInputs={() => undefined}
              emptyAction={null}
            />
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

function sent(method: string, path: string): unknown[] {
  return calls
    .filter((call) => call.method === method && call.url.endsWith(path))
    .map((call) => call.body)
}

beforeEach(stubGateway)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Save as character on the portraits you keep", () => {
  it("creates the character under the name you give, with the portraits you kept as its photos", async () => {
    openCanvas("traits", runOf({ mode: "traits" }, portraits))
    fireEvent.click(
      await screen.findByRole("button", {
        name: t("characters.new.saveOutputs"),
      })
    )
    const dialog = await screen.findByRole("dialog")
    const [, second] = within(dialog).getAllByRole("button", {
      name: t("library.tile.select"),
    })
    if (second === undefined) {
      throw new Error("the dialog shows one portrait")
    }
    fireEvent.click(second)
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: " Mara " },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: t("characters.new.save") })
    )
    await vi.waitFor(() =>
      expect(sent("POST", "/api/characters")).toEqual([
        { name: "Mara", references: [portraits[0]], notes: "" },
      ])
    )
  })
})

describe("Add to character on a view", () => {
  it("adds the view after the character's photos, one photo more", async () => {
    openCanvas(
      "angles",
      runOf(
        {
          mode: "angles",
          count: "4",
          character: [characterId],
          angleSet: "turnaround",
        },
        views
      )
    )
    const [first] = await screen.findAllByRole("button", {
      name: t("characters.detail.addToCharacter"),
    })
    if (first === undefined) {
      throw new Error("no view offers Add to character")
    }
    fireEvent.click(first)
    await vi.waitFor(() =>
      expect(sent("PATCH", `/api/characters/${characterId}`)).toEqual([
        { references: [photo, views[0]] },
      ])
    )
    expect(
      screen.getAllByText(tCatalog("characters.view.front")).length
    ).toBeGreaterThan(0)
  })
})
