import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { StudioShape, studioKindOf } from "@/screens/app/studio-suspense"

afterEach(cleanup)

function part(name: string): Element | null {
  return document.querySelector(`[data-slot='studio-skeleton-${name}']`)
}

function shapesIn(element: Element | null): Element[] {
  return [...(element?.querySelectorAll("[data-slot='skeleton']") ?? [])]
}

describe("a studio screen that is still loading", () => {
  it("shows the shaped skeleton of its input panel beside its canvas on a column screen", () => {
    render(<StudioShape kind="column" />)
    const panel = part("panel")
    const canvas = part("canvas")
    expect(panel?.getAttribute("data-ground")).toBe("surface")
    expect(panel?.className.split(" ")).toEqual(
      expect.arrayContaining(["w-80", "rounded-card", "bg-surface"])
    )
    expect(shapesIn(panel).length).toBeGreaterThan(4)
    expect(
      shapesIn(canvas).some(
        (shape) => shape.getAttribute("data-shape") === "frame"
      )
    ).toBe(true)
    expect(part("dock")).toBeNull()
  })

  it("shows the dock's prompt and generate tile over its canvas on a bar screen", () => {
    render(<StudioShape kind="bar" />)
    const dock = part("dock")
    expect(dock?.className.split(" ")).toEqual(
      expect.arrayContaining(["fixed", "bottom-4", "max-w-220"])
    )
    expect(shapesIn(dock).length).toBeGreaterThan(3)
    expect(part("canvas")).not.toBeNull()
    expect(part("panel")).toBeNull()
  })

  it("runs every shape of the screen on one pulse, never one grey bar", () => {
    render(<StudioShape kind="column" />)
    const group = document.querySelector("[data-slot='skeleton-group']")
    expect(group?.getAttribute("aria-busy")).toBe("true")
    const all = shapesIn(group)
    expect(all.length).toBeGreaterThan(6)
    for (const shape of all) {
      expect(shape.className.split(" ")).not.toContain("motion-pulse")
    }
  })

  it("knows the bar screens from the column screens by the app", () => {
    expect(studioKindOf("image")).toBe("bar")
    expect(studioKindOf("ads")).toBe("bar")
    expect(studioKindOf("edit")).toBe("bar")
    expect(studioKindOf("relight")).toBe("bar")
    expect(studioKindOf("video")).toBe("column")
    expect(studioKindOf("lipsync")).toBe("column")
  })
})
