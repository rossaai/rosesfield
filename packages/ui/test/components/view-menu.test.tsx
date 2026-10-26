import { ViewMenu } from "@rosesfield/ui/components/view-menu"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

const base = {
  label: "View",
  layoutLabel: "Layout",
  listLabel: "List",
  gridLabel: "Grid",
  layout: "grid" as const,
}

describe("ViewMenu", () => {
  it("opens from a quiet 33 px trigger with the grid glyph and no border", () => {
    render(<ViewMenu {...base} onLayoutChange={() => undefined} />)
    const trigger = screen.getByRole("button", { name: "View" })
    expect(trigger.getAttribute("data-slot")).toBe("view-menu")
    expect(trigger.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-button-dense",
        "rounded-full",
        "bg-transparent",
        "data-popup-open:bg-(--tint)",
      ])
    )
    expect(trigger.className).not.toMatch(/\bborder\b/)
    expect(trigger.querySelector(".lucide-layout-grid")).not.toBeNull()
  })

  it("stands as the grid glyph alone, still named View, in its icon form", () => {
    render(
      <ViewMenu {...base} trigger="icon" onLayoutChange={() => undefined} />
    )
    const trigger = screen.getByRole("button", { name: "View" })
    expect(trigger.textContent).toBe("")
    expect(trigger.getAttribute("data-slot")).toBe("view-menu")
    expect(trigger.className.split(" ")).toContain("size-icon-dense")
    expect(trigger.querySelector(".lucide-layout-grid")).not.toBeNull()
  })

  it("chooses List or Grid, and shows no slider without size steps", async () => {
    const onLayout = vi.fn()
    render(<ViewMenu {...base} onLayoutChange={onLayout} />)
    fireEvent.click(screen.getByRole("button", { name: "View" }))
    const list = await screen.findByRole("menuitemradio", { name: "List" })
    expect(document.querySelector("[data-slot='view-menu-size']")).toBeNull()
    fireEvent.click(list)
    expect(onLayout).toHaveBeenCalledWith("list")
  })

  it("shows the size slider only when the caller passes size steps", async () => {
    render(
      <ViewMenu
        {...base}
        onLayoutChange={() => undefined}
        size={{
          label: "Size",
          value: 3,
          min: 2,
          max: 6,
          onValueChange: () => undefined,
        }}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "View" }))
    await screen.findByRole("menuitemradio", { name: "List" })
    const size = document.querySelector("[data-slot='view-menu-size']")
    expect(size?.textContent).toBe("Size")
    expect(size?.querySelector("input[type='range']")).not.toBeNull()
    const slider = size?.querySelector("[data-slot='slider']")
    expect(slider?.className.split(" ")).toEqual(
      expect.arrayContaining(["min-w-32", "flex-1"])
    )
  })

  it("draws the size alone, with no layout group, for a place with one layout", async () => {
    const onSize = vi.fn()
    render(
      <ViewMenu
        label="View"
        size={{
          label: "Size",
          value: 1,
          min: 0,
          max: 3,
          onValueChange: onSize,
        }}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "View" }))
    const slider = await screen.findByRole("slider", { hidden: true })
    const size = document.querySelector("[data-slot='view-menu-size']")
    expect(size?.textContent).toBe("Size")
    expect(slider.getAttribute("max")).toBe("3")
    expect(screen.queryAllByRole("menuitemradio")).toHaveLength(0)
    expect(screen.queryByText("Layout")).toBeNull()
  })

  it("holds each filter as a submenu inside the menu, with the chosen option checked", async () => {
    const onKind = vi.fn()
    render(
      <ViewMenu
        {...base}
        onLayoutChange={() => undefined}
        filterLabel="Filter"
        facets={[
          {
            id: "kind",
            label: "Kind",
            value: "all",
            options: [
              { value: "all", label: "All" },
              { value: "video", label: "Video" },
            ],
            onValueChange: onKind,
          },
        ]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "View" }))
    const kind = await screen.findByRole("menuitem", { name: /Kind/ })
    expect(kind.getAttribute("data-slot")).toBe("dropdown-menu-sub-trigger")
    expect(kind.textContent).toContain("All")
    fireEvent.click(kind)
    const video = await screen.findByRole("menuitemradio", { name: "Video" })
    fireEvent.click(video)
    expect(onKind).toHaveBeenCalledWith("video")
  })
})
