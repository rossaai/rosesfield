import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type GridItem, ResultGrid } from "@/screens/library/result-grid"
import { ViewerProvider } from "@/viewer/viewer-context"
import { renderAt } from "../../shell/shell-router"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  vi.stubGlobal("innerWidth", 1024)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function itemsOf(count: number): GridItem[] {
  return Array.from({ length: count }, (_, index) => ({
    assetId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    run: null,
    aspect: { width: 1, height: 1 },
  }))
}

async function columnsAt(count: number, size: number): Promise<HTMLElement[]> {
  renderAt("/library", () => (
    <TooltipProvider>
      <ViewerProvider>
        <ResultGrid items={itemsOf(count)} size={size} />
      </ViewerProvider>
    </TooltipProvider>
  ))
  return vi.waitFor(() => {
    const columns = [
      ...document.querySelectorAll<HTMLElement>("[data-slot='result-column']"),
    ]
    if (columns.length === 0) {
      throw new Error("the grid has not rendered")
    }
    return columns
  })
}

describe("the result grid", () => {
  it("fills the row with equal columns when the items fill it", async () => {
    const columns = await columnsAt(12, 1)
    expect(columns).toHaveLength(4)
    for (const column of columns) {
      expect(column.className.split(" ")).toContain("flex-1")
    }
  })

  it("keeps one item at the row's start at its tile size, with no empty column", async () => {
    const columns = await columnsAt(1, 1)
    expect(columns).toHaveLength(1)
    expect(columns[0]?.className.split(" ")).toContain("w-57")
    expect(columns[0]?.className.split(" ")).not.toContain("flex-1")
    expect(columns[0]?.parentElement?.className).toContain("justify-start")
  })

  it("widens a short row's tiles as the size grows", async () => {
    const columns = await columnsAt(1, 4)
    expect(columns).toHaveLength(1)
    expect(columns[0]?.className.split(" ")).toContain("w-105")
  })
})
