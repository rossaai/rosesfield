import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { ToolsKey } from "@/screens/app/tools-key"
import { BottomBar } from "@/shell/bottom-bar"
import { ShellDialogsProvider } from "@/shell/shell-dialogs"
import { renderAt } from "./shell-router"

afterEach(cleanup)

const openTools = vi.fn()

function barWith(tools: boolean): () => ReactElement {
  return () => (
    <ToastProvider>
      <TooltipProvider>
        <ShellDialogsProvider>
          <BottomBar />
          {tools ? <ToolsKey onOpen={openTools} /> : null}
        </ShellDialogsProvider>
      </TooltipProvider>
    </ToastProvider>
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
  it("holds Explore, Library, Generate, History and MCP in five cells, with no Connect", async () => {
    const bar = await barAt("/")
    expect(cellsOf(bar)).toEqual(["Explore", "Library", "", "History", "MCP"])
    expect(within(bar).queryByRole("button", { name: "Connect" })).toBeNull()
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

  it("leads the list of apps with the featured row, the Agent, Motion then AI Influencer, each with its Featured badge, and keeps Motion in Video", async () => {
    const bar = await barAt("/")
    fireEvent.click(within(bar).getByRole("button", { name: "Generate" }))
    const sheet = await screen.findByRole("dialog")
    const pair = sheet.querySelector("[data-slot='featured-pair']")
    const links = [...(pair?.querySelectorAll("a") ?? [])]
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/agent",
      "/apps/motion",
      "/apps/ai-influencer",
    ])
    for (const link of links) {
      expect(link.querySelector("[data-slot='badge']")?.textContent).toBe(
        "Featured"
      )
    }
    const motions = within(sheet).getAllByRole("link", { name: /^Motion/ })
    expect(motions).toHaveLength(2)
    const badges = sheet.querySelectorAll("[data-slot='badge']")
    expect(badges).toHaveLength(4)
  })

  it("opens the MCP dialog from MCP in the bar, with no route change", async () => {
    const bar = await barAt("/library")
    const mcp = within(bar).getByRole("button", { name: "MCP" })
    expect(mcp.getAttribute("href")).toBeNull()
    fireEvent.click(mcp)
    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: t("connect.title") })
    ).toBeTruthy()
    expect(
      bar.querySelector("a[href='/library']")?.getAttribute("aria-current")
    ).toBe("page")
  })

  it("lists MCP in the list of apps right after the 3D apps, and opens its dialog in place of the list", async () => {
    const bar = await barAt("/")
    fireEvent.click(within(bar).getByRole("button", { name: "Generate" }))
    const sheet = await screen.findByRole("dialog")
    const rows = [...sheet.querySelectorAll("li > a, li > button")]
    const last = rows.at(-1)
    expect(last?.textContent).toBe("MCP")
    expect(rows.at(-2)?.getAttribute("href")).toBe("/apps/three-d")
    if (!(last instanceof HTMLElement)) {
      throw new Error("the list holds no MCP")
    }
    fireEvent.click(last)
    const dialog = await screen.findByRole("dialog", {
      name: t("connect.title"),
    })
    expect(within(dialog).getByText(t("connect.claude.step.1"))).toBeTruthy()
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
