import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("AppTile", () => {
  it("is one link with a 20 px icon, its name and one line, 130 px tall, in 3 columns 12 px apart", () => {
    render(
      <AppTileGrid label="Apps">
        <AppTile
          href="/apps/image"
          name="Image"
          line="Words to a picture"
          icon={<svg />}
        />
      </AppTileGrid>
    )
    const tile = screen.getByRole("link", { name: /Image/ })
    expect(tile.getAttribute("href")).toBe("/apps/image")
    expect(tile.querySelectorAll("a, button")).toHaveLength(0)
    expect(tile.className.split(" ")).toEqual(
      expect.arrayContaining(["@regular:h-32.5", "h-33.5"])
    )
    const grid = screen.getByRole("navigation", {
      name: "Apps",
    }).firstElementChild
    expect(grid?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "grid-cols-2",
        "gap-2",
        "@regular:grid-cols-3",
        "@regular:gap-3",
      ])
    )
  })
})

describe("AppTileGrid", () => {
  it("reads the page's container and sets none of its own, so 3 columns hold at 1440 px", () => {
    render(
      <AppTileGrid label="Apps">
        <AppTile href="/apps/image" name="Image" line="Words" icon={<svg />} />
      </AppTileGrid>
    )
    const nav = screen.getByRole("navigation", { name: "Apps" })
    expect(nav.className.split(" ")).not.toContain("@container")
  })
})

describe("AppTile's shells", () => {
  function renderTile(withMode: boolean) {
    render(
      <AppTile
        href="/apps/video"
        name="Video"
        line="A photo to a clip"
        icon={<svg />}
        badge={<span>New</span>}
        {...(withMode ? { mode: { label: "Video", icon: <svg /> } } : {})}
      />
    )
    return screen.getByRole("link", { name: /Video/ })
  }

  it("holds an inner panel inside a 1 px border and 2 px padding, and opens the ring on hover without moving the panel's content", () => {
    const tile = renderTile(false)
    expect(tile.className.split(" ")).toEqual(
      expect.arrayContaining([
        "border",
        "border-(--line)",
        "p-0.5",
        "hover:border-transparent",
        "hover:p-0",
      ])
    )
    expect(tile.className).not.toContain("after:")
    const panel = tile.querySelector("[data-slot='app-tile-panel']")
    expect(panel?.className.split(" ")).toEqual(
      expect.arrayContaining(["p-3.5", "group-hover/app:p-4", "bg-(--well)"])
    )
  })

  it("slants its badge 6 px after the name, and sets it at the top right on a phone", () => {
    const tile = renderTile(false)
    const badge = tile.querySelector("[data-slot='app-tile-badge']")
    expect(badge?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "-skew-x-12",
        "absolute",
        "top-3",
        "right-3",
        "@regular:static",
        "@regular:ms-0.5",
      ])
    )
    expect(badge?.textContent).toBe("New")
    const line = tile.querySelector("[data-slot='preset-tile-line']")
    expect(line?.className.split(" ")).toEqual(
      expect.arrayContaining(["text-body", "@regular:text-label"])
    )
  })

  it("carries a Video pill 12 px in from the top right on a tool that makes video, hidden on a phone", () => {
    const tile = renderTile(true)
    const pill = tile.querySelector("[data-slot='app-tile-mode']")
    expect(pill?.textContent).toBe("Video")
    expect(pill?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "top-3",
        "right-3",
        "h-7.5",
        "rounded-full",
        "hidden",
        "@regular:flex",
      ])
    )
    cleanup()
    expect(
      renderTile(false).querySelector("[data-slot='app-tile-mode']")
    ).toBeNull()
  })
})
