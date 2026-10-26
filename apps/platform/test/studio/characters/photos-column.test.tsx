import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  CharacterTabs,
  type MakeMode,
} from "@/studio/characters/character-tabs"
import { PhotosColumn } from "@/studio/characters/photos-column"

afterEach(cleanup)

function openPhotos(onChange: (mode: MakeMode) => void): void {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <PhotosColumn
          label={t("characters.new.title")}
          tabs={<CharacterTabs mode="photos" onChange={onChange} />}
        />
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/characters/new"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe("Add a character from photos", () => {
  it("is a mode of one tab row at the column's top, with no segment that swaps the screen", async () => {
    const chosen = vi.fn()
    openPhotos(chosen)
    const tabs = await screen.findByRole("tablist", {
      name: t("characters.new.mode.label"),
    })
    const panel = screen.getByRole("region", {
      name: t("characters.new.title"),
    })
    expect(panel.contains(tabs)).toBe(true)
    expect(screen.queryByRole("radiogroup")).toBeNull()
    fireEvent.click(
      screen.getByRole("tab", { name: t("characters.new.mode.traits") })
    )
    expect(chosen).toHaveBeenCalledWith("traits")
  })

  it("asks for the name and the photos in the column, and saves from its foot", async () => {
    openPhotos(() => undefined)
    const panel = await screen.findByRole("region", {
      name: t("characters.new.title"),
    })
    expect(panel.textContent).toContain(t("characters.new.name.label"))
    expect(panel.textContent).toContain(t("characters.new.photos.label"))
    fireEvent.click(
      screen.getByRole("button", { name: t("characters.new.save") })
    )
    expect(
      await screen.findByText(t("characters.new.name.required"))
    ).toBeDefined()
  })
})
