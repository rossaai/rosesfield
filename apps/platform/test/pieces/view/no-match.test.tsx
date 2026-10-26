import { findApp } from "@rosesfield/catalog"
import { appListing } from "@rosesfield/contract"
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
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppStage } from "@/screens/app/app-stage"
import { withClient } from "../../screens/app/frame-render"
import { assetOf, renderPlace, runOf } from "../../screens/place-screens"

const door = runOf("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01", "a red door", [
  "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01",
])
const boat = runOf("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02", "a blue boat", [
  "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02",
])
const seeds = {
  runs: [door, boat],
  assets: [
    assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01", door.id),
    assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02", boat.id),
  ],
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  vi.stubGlobal("innerWidth", 1440)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

function gridItems(): number {
  return document.querySelectorAll(
    "[data-slot='result-grid'] [data-slot='grid-item']"
  ).length
}

function openAppPage(): void {
  const app = appListing.parse(findApp(door.appId))
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <AppStage app={app} kind="bar">
          <AppCanvas app={app} onUseInputs={() => undefined} />
        </AppStage>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/apps/image"] }),
  })
  render(withClient(<RouterProvider router={router} />, app, [door, boat]))
}

const places = [
  {
    name: "Library",
    label: "library.search.label",
    open: () => renderPlace("/library", seeds),
  },
  {
    name: "History",
    label: "history.search.label",
    open: () => renderPlace("/history", seeds),
  },
  { name: "an app page", label: "app.search.label", open: openAppPage },
] as const

describe.each(places)("the no-match state on $name", (place) => {
  it("names that nothing matches, and Show everything brings every result back", async () => {
    place.open()
    await waitFor(() => expect(gridItems()).toBe(2))
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    fireEvent.change(
      await screen.findByRole("searchbox", { name: t(place.label) }),
      { target: { value: "door boat" } }
    )
    await screen.findByText(t("library.filterEmpty.title"))
    expect(gridItems()).toBe(0)
    fireEvent.click(
      screen.getByRole("button", { name: t("library.filterEmpty.action") })
    )
    await waitFor(() => expect(gridItems()).toBe(2))
  })
})
