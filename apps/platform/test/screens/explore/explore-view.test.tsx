import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { settingsQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { exploreListQuery } from "@/screens/explore/explore-list"
import { ExploreScreen } from "@/screens/explore/explore-screen"
import { exploreApps } from "@/screens/explore/explore-sections"
import { exploreCellsOf } from "@/screens/explore/explore-view"
import { accountQuery } from "@/screens/settings/account-query"
import { ViewerProvider } from "@/viewer/viewer-context"
import { account, ownerSettings } from "../../shell/shell-router"

const feedWidth = 1408

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  vi.stubGlobal("innerWidth", 1440)
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
    feedWidth
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

function renderExplore(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(settingsQuery.queryKey, ownerSettings)
  client.setQueryData(accountQuery.queryKey, account)
  client.setQueryData(exploreListQuery.queryKey, [])
  const root = createRootRoute({ component: ExploreScreen })
  const page = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ViewerProvider>
          <RouterProvider router={router} />
        </ViewerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

function regionOf(name: string): HTMLElement | null {
  return screen.queryByRole("region", { name })
}

async function appsRegion(): Promise<HTMLElement> {
  return screen.findByRole("region", { name: t("explore.apps.label") })
}

function appCellWidths(apps: HTMLElement): string[] {
  return [...apps.querySelectorAll<HTMLElement>("[data-slot='app-card']")].map(
    (card) => card.style.width
  )
}

function showcase(): HTMLElement {
  const feed = regionOf(t("explore.showcase.title"))
  if (feed === null) {
    throw new Error("the showcase feed is shown")
  }
  return feed
}

function stacksOf(feed: HTMLElement): HTMLElement[] {
  return [
    ...feed.querySelectorAll<HTMLElement>("[data-slot='media-feed-stack']"),
  ]
}

async function openView(): Promise<HTMLElement> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "View" }))
  })
  return screen.findByRole("slider", { hidden: true })
}

function search(words: string): void {
  if (screen.queryByRole("searchbox") === null) {
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
  }
  fireEvent.change(
    screen.getByRole("searchbox", { name: t("explore.search.label") }),
    { target: { value: words } }
  )
}

describe("Explore's view", () => {
  it("opens at the second size, its app cards and example columns 228 px wide", async () => {
    renderExplore()
    const apps = await appsRegion()
    const widths = appCellWidths(apps)
    expect(widths.length).toBeGreaterThan(0)
    expect(new Set(widths)).toEqual(new Set(["228px"]))
    const cells = [
      ...apps.querySelectorAll<HTMLElement>("[data-slot='media-feed-cell']"),
    ]
    expect(cells.every((cell) => cell.style.width === "228px")).toBe(true)
    const items = showcase().querySelector("[data-slot='media-feed-items']")
    expect(items?.getAttribute("data-cell")).toBe("228")
    expect(stacksOf(showcase())).toHaveLength(6)
    const slider = await openView()
    expect(slider.getAttribute("value")).toBe("1")
  })

  it("shows the size alone in its View menu, with no layout group", async () => {
    renderExplore()
    await appsRegion()
    await openView()
    expect(screen.queryByRole("menuitemradio", { name: "Grid" })).toBeNull()
    expect(screen.queryByRole("menuitemradio", { name: "List" })).toBeNull()
  })

  it("resizes the app cards and the example columns when you change the size, and keeps it", async () => {
    renderExplore()
    await appsRegion()
    const slider = await openView()
    await act(async () => {
      fireEvent.keyDown(slider, { key: "End" })
    })
    const apps = await appsRegion()
    await vi.waitFor(() =>
      expect(new Set(appCellWidths(apps))).toEqual(new Set(["464px"]))
    )
    expect(stacksOf(showcase())).toHaveLength(3)
    expect(
      JSON.parse(window.localStorage.getItem("rosesfield.view.explore") ?? "{}")
    ).toEqual({ layout: "grid", size: 3 })
    cleanup()
    renderExplore()
    expect(new Set(appCellWidths(await appsRegion()))).toEqual(
      new Set(["464px"])
    )
  })

  it("keeps the apps whose name and the examples whose prompt, app or model hold every word, and hides a section the words leave empty", async () => {
    renderExplore()
    await appsRegion()
    const first = exploreApps()[0]
    if (first === undefined) {
      throw new Error("Explore lists an app")
    }
    const allStills = showcase().querySelectorAll("[data-slot='media']").length
    search(appName(first).toUpperCase())
    const apps = await appsRegion()
    const names = [...apps.querySelectorAll("[data-slot='app-card'] h3")].map(
      (name) => name.textContent ?? ""
    )
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      expect(name.toLowerCase()).toContain(appName(first).toLowerCase())
    }
    search("portrait woman")
    await vi.waitFor(() => expect(regionOf(t("explore.apps.label"))).toBeNull())
    const stills = showcase().querySelectorAll("[data-slot='media']").length
    expect(stills).toBeGreaterThan(0)
    expect(stills).toBeLessThan(allStills)
    expect(screen.getByRole("searchbox")).toBe(document.activeElement)
  })

  it("shows Library's no-match state when nothing holds the words, and Show everything brings Explore back", async () => {
    renderExplore()
    await appsRegion()
    search("zebra quasar")
    expect(await screen.findByText(t("library.filterEmpty.title"))).toBeTruthy()
    expect(regionOf(t("explore.apps.label"))).toBeNull()
    expect(regionOf(t("explore.showcase.title"))).toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: t("library.filterEmpty.action") })
    )
    await appsRegion()
    expect(screen.queryByText(t("library.filterEmpty.title"))).toBeNull()
  })
})

describe("Explore's cells", () => {
  it("take the step's width on a wide window, and the step's phone columns on a phone", () => {
    expect(exploreCellsOf(1408, 1, true)).toEqual({ card: 228, feed: 228 })
    expect(exploreCellsOf(343, 1, false)).toEqual({ card: 228, feed: 168 })
    expect(exploreCellsOf(343, 0, false)).toEqual({ card: 160, feed: 109 })
    expect(exploreCellsOf(343, 3, false)).toEqual({ card: 343, feed: 343 })
  })
})
