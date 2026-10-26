import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  type GridItem,
  type GridSelection,
  ResultGrid,
  SoundButton,
} from "@/screens/library/result-grid"
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

async function columnsAt(
  count: number,
  size: number,
  selection?: GridSelection
): Promise<HTMLElement[]> {
  renderAt("/library", () => (
    <TooltipProvider>
      <ViewerProvider>
        <ResultGrid
          items={itemsOf(count)}
          size={size}
          {...(selection === undefined ? {} : { selection })}
        />
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
    const third = await columnsAt(1, 2)
    expect(third[0]?.className.split(" ")).toContain("w-80")
    cleanup()
    const fourth = await columnsAt(1, 3)
    expect(fourth).toHaveLength(1)
    expect(fourth[0]?.className.split(" ")).toContain("w-116")
  })

  it("keeps its columns and their order when Select turns on, and lays a mark over every tile", async () => {
    const shape = (columns: HTMLElement[]): string[] =>
      columns.map((column) => `${column.className}:${column.childElementCount}`)
    const resting = shape(await columnsAt(12, 1))
    cleanup()
    const onToggle = vi.fn<(assetId: string) => void>()
    const picking = await columnsAt(12, 1, {
      selected: [itemsOf(12)[0]?.assetId ?? ""],
      onToggle,
    })
    expect(shape(picking)).toEqual(resting)
    const marks = [
      ...document.querySelectorAll<HTMLElement>("[data-slot='select-mark']"),
    ]
    expect(marks).toHaveLength(12)
    expect(marks.filter((mark) => mark.ariaPressed === "true")).toHaveLength(1)
    fireEvent.click(marks[1] as HTMLElement)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(itemsOf(12).map((item) => item.assetId)).toContain(
      onToggle.mock.calls[0]?.[0]
    )
  })
})

describe("a clip's sound button", () => {
  it("turns its clip's sound on and off", () => {
    render(
      <TooltipProvider>
        <div data-slot="grid-item">
          <video muted />
          <SoundButton />
        </div>
      </TooltipProvider>
    )
    const video = document.querySelector("video")
    if (video === null) {
      throw new Error("no video")
    }
    video.muted = true
    fireEvent.click(screen.getByRole("button", { name: "Turn sound on" }))
    expect(video.muted).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Turn sound off" }))
    expect(video.muted).toBe(true)
  })
})
