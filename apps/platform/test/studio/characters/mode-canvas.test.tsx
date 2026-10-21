import { findApp } from "@rosesfield/catalog"
import type { Mode } from "@rosesfield/catalog/characters"
import {
  appListing,
  characterPhotoLimit,
  type Run,
  run,
} from "@rosesfield/contract"
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

function characterWith(references: readonly string[]) {
  return {
    id: characterId,
    name: "Mara",
    references: [...references],
    notes: "",
    createdAt: "2026-10-17T09:00:00.000Z",
  }
}

function stubGateway(): void {
  calls.length = 0
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      const body =
        typeof init?.body === "string" ? JSON.parse(init.body) : null
      calls.push({ url, method, body })
      const isUpdate =
        method === "PATCH" && url.endsWith(`/api/characters/${characterId}`)
      if (isUpdate) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ character: characterWith(body.references) }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      }
      return new Promise(() => undefined)
    }
  )
}

function runOf(
  inputs: Run["inputs"],
  outputs: readonly string[],
  id = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d"
): Run {
  return run.parse({
    id,
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

function openCanvas(
  mode: Mode,
  shown: Run | readonly Run[],
  references: readonly string[] = [photo]
): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(runsQuery(characters.id).queryKey, {
    pages: [{ runs: [shown].flat(), next: null }],
    pageParams: [null],
  })
  client.setQueryData(characterQuery(characterId).queryKey, {
    character: characterWith(references),
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
  return client
}

const viewsRun = (): Run =>
  runOf(
    {
      mode: "angles",
      count: "4",
      character: [characterId],
      angleSet: "turnaround",
    },
    views
  )

function photoCountOf(client: QueryClient): number | undefined {
  return client.getQueryData(characterQuery(characterId).queryKey)?.character
    .references.length
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
  it("adds the view after the character's photos, and the character's photo count rises by 1", async () => {
    const client = openCanvas("angles", viewsRun())
    expect(photoCountOf(client)).toBe(1)
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
    await vi.waitFor(() => expect(photoCountOf(client)).toBe(2))
    expect(
      await screen.findByRole("button", {
        name: tCatalog("characters.studio.added"),
      })
    ).toBeDefined()
    expect(
      screen.getAllByText(tCatalog("characters.view.front")).length
    ).toBeGreaterThan(0)
  })

  it("adds no view to a character that holds the most photos a character keeps", async () => {
    const full = Array.from(
      { length: characterPhotoLimit },
      (_, index) => `0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c${31 + index}`
    )
    openCanvas("angles", viewsRun(), full)
    const buttons = await screen.findAllByRole("button", {
      name: t("characters.detail.addToCharacter"),
    })
    expect(buttons.map((button) => button.hasAttribute("disabled"))).toEqual(
      views.map(() => true)
    )
    expect(characterPhotoLimit).toBe(10)
  })
})

const turnaround = ["front", "right", "back", "left"]

const viewRunIds = [
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c01",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c02",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c03",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c04",
]

describe("the caption of each view", () => {
  it("names each hosted view, one output per run, by the view its run asked for", async () => {
    const hosted = turnaround.map((view, index) =>
      runOf(
        {
          mode: "angles",
          character: [characterId],
          angleSet: "turnaround",
          view,
        },
        views.slice(index, index + 1),
        viewRunIds[index]
      )
    )
    openCanvas("angles", hosted)
    for (const view of turnaround) {
      expect(
        await screen.findByText(tCatalog(`characters.view.${view}`))
      ).toBeDefined()
    }
  })

  it("names each view of one graph run by its place in the angle set", async () => {
    openCanvas("angles", viewsRun())
    for (const view of turnaround) {
      expect(
        await screen.findByText(tCatalog(`characters.view.${view}`))
      ).toBeDefined()
    }
  })
})
