import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { examplesOf } from "@/catalog/app-examples"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { AppLibrary } from "@/screens/app/app-library"

afterEach(cleanup)

function showLibrary(appId = "motion") {
  const app = findCatalogApp(appId)
  if (app === null) {
    throw new Error(`no ${appId} app`)
  }
  const root = createRootRoute({
    component: () => (
      <>
        <AppLibrary app={app} examples={examplesOf(appId)} />
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
    history: createMemoryHistory({ initialEntries: [`/apps/${appId}`] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

describe("Motion's Library", () => {
  it("shows each approved example playing its result, with its name, its need and Remix", async () => {
    showLibrary()
    const list = await screen.findByRole("list", { name: "Library" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(1)
    expect(within(list).getAllByText("Grab and run").length).toBeGreaterThan(0)
    expect(list.querySelector("video")?.getAttribute("src")).not.toMatch(
      /guides/
    )
    const remix = within(list).getByRole("link", { name: /Remix$/ })
    expect(remix.getAttribute("href")).toBe("/apps/motion?example=grab-and-run")
  })

  it("opens Motion on the example when you press Remix", async () => {
    const router = showLibrary()
    const list = await screen.findByRole("list", { name: "Library" })
    fireEvent.click(within(list).getByRole("link", { name: /Remix$/ }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        example: "grab-and-run",
      })
    )
  })
})

describe("AI Influencer's Library", () => {
  it("shows each template as its still, with its name, the model that made it and Remix", async () => {
    showLibrary("ai-influencer")
    const list = await screen.findByRole("list", { name: "Library" })
    expect(within(list).getAllByRole("listitem")).toHaveLength(4)
    expect(list.querySelectorAll("img")).toHaveLength(4)
    expect(list.querySelector("video")).toBeNull()
    expect(
      within(list).getAllByText("Red beehive mantis").length
    ).toBeGreaterThan(0)
    expect(
      within(list).getAllByText("Made with GPT Image 2.5 Sunburst")
    ).toHaveLength(1)
    expect(
      within(list)
        .getAllByRole("link", { name: /Remix$/ })
        .map((link) => link.getAttribute("href"))
    ).toEqual([
      "/apps/ai-influencer?example=capybara",
      "/apps/ai-influencer?example=absurd-man",
      "/apps/ai-influencer?example=frog",
      "/apps/ai-influencer?example=mantis",
    ])
  })

  it("opens AI Influencer on the template when you press Remix", async () => {
    const router = showLibrary("ai-influencer")
    const list = await screen.findByRole("list", { name: "Library" })
    const [, absurd] = within(list).getAllByRole("link", { name: /Remix$/ })
    if (absurd === undefined) {
      throw new Error("no second Remix")
    }
    fireEvent.click(absurd)
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ example: "absurd-man" })
    )
  })
})
