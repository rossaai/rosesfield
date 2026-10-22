import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("AppTile", () => {
  it("is one link with a 20 px icon, its name and one line, 130 px tall, in 3 columns 12 px apart that grow to 6 across a wide page", () => {
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
        "@regular:gap-3",
        "@regular:grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_var(--spacing)*15)/6),min(calc((100%_-_var(--spacing)*6)/3),calc((var(--spacing)*336_-_100%)*1000))),1fr))]",
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

  it("is one well tile with 13 px padding, no border and no ring, that presses on the press preset", () => {
    const tile = renderTile(false)
    const classes = tile.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "bg-(--well)",
        "p-s4",
        "rounded-card",
        "motion-press",
      ])
    )
    expect(
      classes.filter((name) => /^(hover:)?border|^p-0/.test(name))
    ).toEqual([])
    expect(tile.className).not.toContain("after:")
  })

  it("draws no media well without media, and holds the media in a clipped frame when given", () => {
    const tile = renderTile(false)
    expect(tile.getAttribute("data-media")).toBe("no")
    expect(tile.querySelector("[data-slot='app-tile-media']")).toBeNull()
    cleanup()
    render(
      <AppTile
        href="/apps/video"
        name="Video"
        line="A photo to a clip"
        icon={<svg />}
        media={<img src="/a.png" alt="" />}
      />
    )
    const withMedia = screen.getByRole("link", { name: /Video/ })
    expect(withMedia.getAttribute("data-media")).toBe("yes")
    expect(
      withMedia.querySelector("[data-slot='app-tile-media'] img")
    ).not.toBeNull()
  })

  it("sets its badge after the name on one line", () => {
    const tile = renderTile(false)
    const badge = tile.querySelector("[data-slot='app-tile-badge']")
    expect(badge?.textContent).toBe("New")
    expect(badge?.previousElementSibling?.textContent).toBe("Video")
  })

  it("carries a Video pill 13 px in from the top right on a tool that makes video, hidden on a phone", () => {
    const tile = renderTile(true)
    const pill = tile.querySelector("[data-slot='app-tile-mode']")
    expect(pill?.textContent).toBe("Video")
    expect(pill?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "top-s4",
        "right-s4",
        "h-button-small",
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
