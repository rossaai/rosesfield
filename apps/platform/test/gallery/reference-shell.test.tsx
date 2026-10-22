import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { referenceShellEntries } from "@/gallery/entries/reference-shell"
import { TopBar } from "@/shell/top-bar"
import { renderAt } from "../shell/shell-router"

afterEach(cleanup)

type Controls = { balance: string[]; connect: string[]; menu: string[] }

function shapeOf(element: HTMLElement): string[] {
  return [
    element.className,
    ...[...element.children].map((child) => child.tagName.toLowerCase()),
  ]
}

function controlsOf(bar: HTMLElement, menu: string): Controls {
  return {
    balance: shapeOf(within(bar).getByRole("button", { name: "12.5 credits" })),
    connect: shapeOf(within(bar).getByRole("button", { name: "Connect" })),
    menu: shapeOf(within(bar).getByRole("button", { name: menu })),
  }
}

function galleryBar(state: string): Controls {
  const entry = referenceShellEntries.find((item) => item.id === "ref-top-bar")
  const frame = entry?.states.find((item) => item.id === state)
  if (frame === undefined) {
    throw new Error(`no top bar state ${state}`)
  }
  render(frame.render())
  const bar = screen.getByRole("banner", { name: "Rosesfield" })
  const controls = controlsOf(bar, "Areas")
  cleanup()
  return controls
}

async function liveBar(path: string): Promise<Controls> {
  renderAt(path, () => <TopBar />)
  const bar = await screen.findByRole("banner", { name: "Rosesfield" })
  return controlsOf(bar, "Open the menu")
}

describe("the gallery's top bar mark", () => {
  it("shows the light scheme's mark on light and the dark scheme's mark on dark, as the live bar does", async () => {
    const entry = referenceShellEntries.find(
      (item) => item.id === "ref-top-bar"
    )
    const frame = entry?.states.find((item) => item.id === "rest")
    if (frame === undefined) {
      throw new Error("no top bar rest state")
    }
    const picturesOf = (bar: HTMLElement): string[] =>
      [
        ...bar.querySelectorAll<HTMLImageElement>(
          "[data-slot='app-bar-mark'] img"
        ),
      ].map((image) => `${image.getAttribute("src")} ${image.className}`)
    render(frame.render())
    const gallery = picturesOf(
      screen.getByRole("banner", { name: "Rosesfield" })
    )
    cleanup()
    renderAt("/", () => <TopBar />)
    const live = picturesOf(
      await screen.findByRole("banner", { name: "Rosesfield" })
    )
    expect(gallery).toEqual(live)
    expect(gallery.some((picture) => picture.includes("dark:hidden"))).toBe(
      true
    )
  })
})

describe("the gallery's top bar", () => {
  it.each([
    ["rest", "/"],
    ["compact", "/apps/image"],
  ])(
    "draws its balance, Connect and menu as the live bar does, %s",
    async (state, path) => {
      const gallery = galleryBar(state)
      expect(gallery).toEqual(await liveBar(path))
    }
  )
})
