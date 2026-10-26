import { findApp } from "@rosesfield/catalog"
import { appListing, type Run, run } from "@rosesfield/contract"
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
import { t } from "@/copy/t"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppStage } from "@/screens/app/app-stage"
import { useCanvasView } from "@/screens/app/canvas-view"
import { AudioCanvas } from "@/studio/audio/audio-canvas"
import { ThreeDCanvas } from "@/studio/three-d/three-d-canvas"
import { audioListing } from "../../studio/audio/audio-app"
import {
  image,
  resetFrames,
  stubFetch,
  video,
  withClient,
} from "./frame-render"

beforeEach(() => {
  stubFetch()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  resetFrames()
  window.localStorage.clear()
})

function promptRun(appId: string, index: number, prompt: string): Run {
  return run.parse({
    id: `93e9078d-0000-4000-8000-00000000010${index}`,
    appId,
    status: "done",
    inputs: { prompt },
    count: 1,
    aspectRatio: null,
    seed: index,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    finishedAt: "2026-10-20T10:00:03.000Z",
  })
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
    history: createMemoryHistory({ initialEntries: ["/apps/image"] }),
  })
  return <RouterProvider router={router} />
}

function Probe(): ReactElement {
  const view = useCanvasView()
  return (
    <output data-testid="probe">{`${view.layout}:${view.size}:${view.columns}`}</output>
  )
}

function keepView(layout: "list" | "grid", size: number): void {
  window.localStorage.setItem(
    "rosesfield.view.app",
    JSON.stringify({ layout, size })
  )
}

function slider(): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>(
    "[data-slot='view-menu-size'] input[type='range']"
  )
  if (found === null) {
    throw new Error("the View menu holds the size slider")
  }
  return found
}

async function openView(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: t("app.canvas.view") }))
  await screen.findByRole("menuitemradio", { name: t("library.view.list") })
}

function probe(): string | null {
  return screen.getByTestId("probe").textContent
}

describe("an app page's view", () => {
  it.each([
    ["a column app", video, "column" as const],
    ["a bar app", image, "bar" as const],
  ])(
    "opens on Grid at the second of four steps on %s and keeps a changed size across a remount",
    async (_, app, kind) => {
      const page = (): ReactElement =>
        withClient(
          <AppStage app={app} kind={kind}>
            <Probe />
          </AppStage>,
          app,
          [promptRun(app.id, 1, "a red fox")]
        )
      render(page())
      expect(probe()).toBe("grid:1:2")
      await openView()
      expect(slider().getAttribute("min")).toBe("0")
      expect(slider().getAttribute("max")).toBe("3")
      expect(slider().getAttribute("value")).toBe("1")
      fireEvent.keyDown(slider(), { key: "ArrowRight" })
      await waitFor(() => expect(probe()).toBe("grid:2:1"))
      cleanup()
      render(page())
      expect(probe()).toBe("grid:2:1")
    }
  )

  it("lays the run cards out three, two, one and one across in List", async () => {
    keepView("list", 1)
    render(
      withClient(
        inRouter(
          <AppStage app={image} kind="bar">
            <AppCanvas app={image} onUseInputs={() => undefined} />
          </AppStage>
        ),
        image,
        [
          promptRun(image.id, 1, "a red fox"),
          promptRun(image.id, 2, "a blue whale"),
          promptRun(image.id, 3, "a green frog"),
        ]
      )
    )
    const columns = (): string | null | undefined =>
      document
        .querySelector("[data-slot='run-columns']")
        ?.getAttribute("data-columns")
    await waitFor(() => expect(columns()).toBe("2"))
    await openView()
    const seen: (string | null | undefined)[] = []
    for (const key of ["Home", "ArrowRight", "ArrowRight", "ArrowRight"]) {
      fireEvent.keyDown(slider(), { key })
      await act(async () => undefined)
      seen.push(columns())
    }
    expect(seen).toEqual(["3", "2", "1", "1"])
  })

  it("keeps the runs that hold every word you type, and shows the no-match state when none does", async () => {
    keepView("list", 1)
    render(
      withClient(
        inRouter(
          <AppStage app={image} kind="bar">
            <AppCanvas app={image} onUseInputs={() => undefined} />
          </AppStage>
        ),
        image,
        [
          promptRun(image.id, 1, "a red fox in snow"),
          promptRun(image.id, 2, "a blue whale"),
        ]
      )
    )
    const cards = (): number =>
      document.querySelectorAll(
        "[data-slot='run-columns'] [data-slot='run-card']"
      ).length
    await waitFor(() => expect(cards()).toBe(2))
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    const field = await screen.findByRole("searchbox", {
      name: t("app.search.label"),
    })
    fireEvent.change(field, { target: { value: "fox snow" } })
    await waitFor(() => expect(cards()).toBe(1))
    expect(screen.queryByText("a blue whale")).toBeNull()
    fireEvent.change(field, { target: { value: "fox whale" } })
    await screen.findByText(t("library.filterEmpty.title"))
    expect(cards()).toBe(0)
    fireEvent.click(
      screen.getByRole("button", { name: t("library.filterEmpty.action") })
    )
    await waitFor(() => expect(cards()).toBe(2))
  })
})

describe("the 3D and audio canvases", () => {
  it("read the app page's layout and search", async () => {
    keepView("grid", 2)
    const audio = audioListing()
    render(
      withClient(
        inRouter(
          <AppStage app={audio} kind="column">
            <AudioCanvas
              app={audio}
              onUseInputs={() => undefined}
              emptyAction={null}
            />
          </AppStage>
        ),
        audio,
        [promptRun(audio.id, 1, "rain on a tin roof")]
      )
    )
    await waitFor(() =>
      expect(document.querySelector("[data-slot='result-grid']")).not.toBeNull()
    )
    expect(document.querySelector("[data-slot='run-columns']")).toBeNull()
    cleanup()
    keepView("list", 2)
    render(
      withClient(
        inRouter(
          <AppStage app={audio} kind="column">
            <AudioCanvas
              app={audio}
              onUseInputs={() => undefined}
              emptyAction={null}
            />
          </AppStage>
        ),
        audio,
        [promptRun(audio.id, 1, "rain on a tin roof")]
      )
    )
    await waitFor(() =>
      expect(
        document
          .querySelector("[data-slot='run-columns']")
          ?.getAttribute("data-columns")
      ).toBe("1")
    )
    cleanup()
    keepView("grid", 1)
    const threeD = appListing.parse(findApp("three-d"))
    render(
      withClient(
        inRouter(
          <AppStage app={threeD} kind="column">
            <ThreeDCanvas app={threeD} onUseInputs={() => undefined} />
          </AppStage>
        ),
        threeD,
        [promptRun("three-d", 1, "a clay teapot")]
      )
    )
    await waitFor(() =>
      expect(document.querySelector("[data-slot='result-grid']")).not.toBeNull()
    )
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    fireEvent.change(
      await screen.findByRole("searchbox", { name: t("app.search.label") }),
      { target: { value: "dragon" } }
    )
    await screen.findByText(t("library.filterEmpty.title"))
    expect(document.querySelector("[data-slot='result-grid']")).toBeNull()
  })
})
