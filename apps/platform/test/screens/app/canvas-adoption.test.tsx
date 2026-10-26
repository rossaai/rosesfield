import { findApp } from "@rosesfield/catalog"
import {
  type AppListing,
  appListing,
  type Run,
  run,
} from "@rosesfield/contract"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { AppStage, type StageLayouts } from "@/screens/app/app-stage"
import { ModeCanvas } from "@/studio/characters/mode-canvas"
import { RemakeCanvas } from "@/studio/remake/remake-canvas"
import { VideoEditCanvas } from "@/studio/video-edit/video-edit-canvas"
import { openCharacters } from "../../studio/characters/traits-screen"
import { remake } from "../../studio/remake/remake-fixtures"
import {
  openStoryboard,
  storyboardRun,
} from "../../studio/storyboard/storyboard-screen"
import { resetFrames, stubFetch, withClient } from "./frame-render"

const videoEdit = appListing.parse(findApp("video-edit"))
const characters = appListing.parse(findApp("characters"))

beforeEach(() => {
  stubFetch()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  resetFrames()
  window.localStorage.clear()
})

function promptRun(
  appId: string,
  index: number,
  prompt: string,
  promptInput = "prompt"
): Run {
  return run.parse({
    id: `93e9078d-0000-4000-8000-00000000020${index}`,
    appId,
    status: "done",
    inputs: { [promptInput]: prompt },
    count: 1,
    aspectRatio: "9:16",
    seed: index,
    outputs: [`3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f2${index}`],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: `2026-10-20T10:0${index}:00.000Z`,
    finishedAt: `2026-10-20T10:0${index}:30.000Z`,
  })
}

function keepView(layout: "list" | "grid", size: number): void {
  window.localStorage.setItem(
    "rosesfield.view.app",
    JSON.stringify({ layout, size })
  )
}

function inRouter(children: ReactNode): ReactElement {
  const root = createRootRoute({
    component: () => (
      <>
        {children}
        <Outlet />
      </>
    ),
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/apps/remake"] }),
  })
  return <RouterProvider router={router} />
}

type Adopted = {
  name: string
  app: AppListing
  layouts?: StageLayouts
  promptInput: string
  canvas: (app: AppListing) => ReactNode
}

const adopted: readonly Adopted[] = [
  {
    name: "Remake",
    app: remake,
    promptInput: "instructions",
    canvas: (app) => (
      <RemakeCanvas
        app={app}
        onUseInputs={() => undefined}
        emptyAction={null}
      />
    ),
  },
  {
    name: "Video edit",
    app: videoEdit,
    promptInput: "next",
    canvas: (app) => (
      <VideoEditCanvas
        app={app}
        onUseInputs={() => undefined}
        emptyAction={null}
      />
    ),
  },
]

function openCanvas(entry: Adopted, runs: readonly Run[]): void {
  render(
    withClient(
      inRouter(
        <AppStage
          app={entry.app}
          kind="column"
          layouts={entry.layouts ?? "grid-and-list"}
        >
          {entry.canvas(entry.app)}
        </AppStage>
      ),
      entry.app,
      runs
    )
  )
}

function resultGrid(): Element | null {
  return document.querySelector("[data-slot='result-grid']")
}

function runColumns(): string | null | undefined {
  return document
    .querySelector("[data-slot='run-columns']")
    ?.getAttribute("data-columns")
}

function cards(): number {
  return document.querySelectorAll("[data-slot='run-card']").length
}

async function search(words: string): Promise<void> {
  fireEvent.click(
    screen.getByRole("button", { name: t("library.search.open") })
  )
  fireEvent.change(
    await screen.findByRole("searchbox", { name: t("app.search.label") }),
    { target: { value: words } }
  )
}

function twoRuns(appId: string, promptInput: string): Run[] {
  return [
    promptRun(appId, 2, "a red fox in snow", promptInput),
    promptRun(appId, 1, "a blue whale", promptInput),
  ]
}

describe.each(adopted)("the $name canvas", (entry) => {
  it("shows your results through the result grid on Grid, with no run cards", async () => {
    keepView("grid", 1)
    openCanvas(entry, twoRuns(entry.app.id, entry.promptInput))
    await waitFor(() => expect(resultGrid()).not.toBeNull())
    expect(
      resultGrid()?.querySelectorAll("[data-slot='grid-item']")
    ).toHaveLength(2)
    expect(cards()).toBe(0)
  })

  it("lays its own run cards out by the view's columns on List", async () => {
    keepView("list", 0)
    openCanvas(entry, twoRuns(entry.app.id, entry.promptInput))
    await waitFor(() => expect(runColumns()).toBe("3"))
    expect(cards()).toBe(2)
    expect(resultGrid()).toBeNull()
  })

  it("keeps the runs that hold every word, and shows the one no-match state when none does", async () => {
    keepView("list", 1)
    openCanvas(entry, twoRuns(entry.app.id, entry.promptInput))
    await waitFor(() => expect(cards()).toBe(2))
    await search("fox snow")
    await waitFor(() => expect(cards()).toBe(1))
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "fox whale" },
    })
    await screen.findByText(t("library.filterEmpty.title"))
    expect(cards()).toBe(0)
  })
})

describe("the Characters canvas", () => {
  const entry: Adopted = {
    name: "Characters",
    app: characters,
    layouts: "list",
    promptInput: "details",
    canvas: (app) => (
      <ModeCanvas
        app={app}
        mode="traits"
        shows={["traits"]}
        onUseInputs={() => undefined}
        emptyAction={null}
      />
    ),
  }

  it("keeps its run cards on a stage of one layout, sized by the view, even when Grid was chosen elsewhere", async () => {
    keepView("grid", 0)
    openCanvas(entry, twoRuns(characters.id, "details"))
    await waitFor(() => expect(runColumns()).toBe("3"))
    expect(cards()).toBe(2)
    expect(resultGrid()).toBeNull()
    await search("whale")
    await waitFor(() => expect(cards()).toBe(1))
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dragon" },
    })
    await screen.findByText(t("library.filterEmpty.title"))
  })

  it("shows the size alone in the View menu of the Characters page", async () => {
    keepView("grid", 1)
    const client = openCharacters()
    act(() => {
      client.setQueryData(runsQuery(characters.id).queryKey, {
        pages: [{ runs: twoRuns(characters.id, "details"), next: null }],
        pageParams: [null],
      })
    })
    await waitFor(() => expect(cards()).toBe(2))
    expect(resultGrid()).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: t("app.canvas.view") }))
    await waitFor(() =>
      expect(
        document.querySelector("[data-slot='view-menu-size']")
      ).not.toBeNull()
    )
    expect(
      screen.queryByRole("menuitemradio", { name: t("library.view.grid") })
    ).toBeNull()
  })
})

describe("the Storyboard page", () => {
  it("shows no View and no Search, because its boards keep their scene order", async () => {
    openStoryboard({
      runs: [storyboardRun({ inputs: { prompt: "a lighthouse at night" } })],
    })
    await screen.findByRole("tab", { name: t("app.tab.history") })
    await waitFor(() => expect(cards()).toBe(1))
    expect(
      screen.queryByRole("button", { name: t("app.canvas.view") })
    ).toBeNull()
    expect(
      screen.queryByRole("button", { name: t("library.search.open") })
    ).toBeNull()
  })
})
