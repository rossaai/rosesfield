import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ToolsKey } from "@/screens/app/tools-key"
import { BottomBar } from "@/shell/bottom-bar"
import { renderAt } from "./shell-router"

afterEach(cleanup)

const openTools = vi.fn()

function barWith(tools: boolean): () => ReactElement {
  return () => (
    <>
      <BottomBar />
      {tools ? <ToolsKey onOpen={openTools} /> : null}
    </>
  )
}

async function barAt(path: string, tools = false): Promise<HTMLElement> {
  renderAt(path, barWith(tools))
  return screen.findByRole("navigation", { name: "Main" })
}

function cellsOf(bar: HTMLElement): string[] {
  const row = bar.querySelector("[data-slot='app-bar-tabs']")
  return [...(row?.children ?? [])].map(
    (cell) => cell.getAttribute("aria-label") ?? cell.textContent ?? ""
  )
}

describe("the bottom bar", () => {
  it("holds Explore, Library, Generate, History and Connect in five cells", async () => {
    const bar = await barAt("/")
    expect(cellsOf(bar)).toEqual([
      "Explore",
      "Library",
      "",
      "History",
      "Connect",
    ])
    const generate = within(bar).getByRole("button", { name: "Generate" })
    expect(generate.textContent).toBe("")
  })

  it("marks the current place by its colour with no badge or count", async () => {
    const bar = await barAt("/library")
    const library = within(bar).getByRole("link", { name: "Library" })
    expect(library.getAttribute("aria-current")).toBe("page")
    expect(library.textContent).toBe("Library")
    const explore = within(bar).getByRole("link", { name: "Explore" })
    expect(explore.getAttribute("aria-current")).toBeNull()
  })

  it("shows on an app page too", async () => {
    const bar = await barAt("/apps/image")
    expect(cellsOf(bar)).toHaveLength(5)
  })

  it("opens the tools of the current app from Generate", async () => {
    openTools.mockClear()
    const bar = await barAt("/apps/image", true)
    fireEvent.click(within(bar).getByRole("button", { name: "Generate" }))
    expect(openTools).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("stands in for the app screen's own tools key", async () => {
    const bar = await barAt("/apps/image", true)
    expect(bar).toBeTruthy()
    expect(document.querySelector("[data-slot='app-tools-key']")).toBeNull()
  })

  it("opens the list of apps from Generate where no app is open", async () => {
    openTools.mockClear()
    const bar = await barAt("/")
    fireEvent.click(within(bar).getByRole("button", { name: "Generate" }))
    const sheet = await screen.findByRole("dialog")
    expect(openTools).not.toHaveBeenCalled()
    const image = within(sheet).getByRole("link", { name: "Image" })
    expect(image.getAttribute("href")).toBe("/apps/image")
  })

  it("presses an app well of the list on the press preset and lays no light over it", async () => {
    const bar = await barAt("/")
    fireEvent.click(within(bar).getByRole("button", { name: "Generate" }))
    const sheet = await screen.findByRole("dialog")
    const image = within(sheet).getByRole("link", { name: "Image" })
    expect(image.className.split(" ")).toContain("motion-press")
    expect(image.className).not.toMatch(/after:/)
  })
})
