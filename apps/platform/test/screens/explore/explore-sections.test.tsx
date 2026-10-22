import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { showcaseEntries } from "@/screens/explore/explore-entries"
import { heldStills, Reveal } from "@/screens/explore/explore-sections"
import { showcaseItems } from "@/showcase/showcase"
import { showcaseRows } from "@/showcase/showcase-rows"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Explore's held stills", () => {
  it("lists every held still once and leaves out each result made from another", () => {
    const stills = heldStills(showcaseEntries(showcaseItems))
    const files = stills.map((entry) => entry.key)
    expect(new Set(files).size).toBe(files.length)
    const derived = showcaseRows.filter((row) => row.from !== undefined)
    expect(derived.length).toBeGreaterThan(0)
    for (const row of derived) {
      expect(files).not.toContain(`showcase-${row.file}`)
    }
    const kept = showcaseRows.filter(
      (row) => row.from === undefined && row.kind === "image"
    )
    expect(stills).toHaveLength(kept.length)
  })

  it("orders the stills tallest first, so the shortest-stack packing ends the columns close together", () => {
    const tallness = heldStills(showcaseEntries(showcaseItems)).map(
      (entry) => entry.aspect.height / entry.aspect.width
    )
    expect(tallness).toEqual([...tallness].sort((a, b) => b - a))
  })
})

type Watch = (entries: Array<{ isIntersecting: boolean }>) => void

function stubObserver(): { fire: (isIntersecting: boolean) => void } {
  let watch: Watch = () => undefined
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Watch) {
        watch = callback
      }
      observe = vi.fn()
      disconnect = vi.fn()
    }
  )
  return { fire: (isIntersecting) => watch([{ isIntersecting }]) }
}

describe("a section's reveal", () => {
  it("waits out of view, arrives once it enters, and stays when it leaves", () => {
    const observer = stubObserver()
    render(
      <Reveal>
        <p>Section</p>
      </Reveal>
    )
    const box = screen.getByText("Section").parentElement
    expect(box?.getAttribute("data-arrival")).toBe("waiting")
    expect(box?.className.split(" ")).toContain("motion-enter")
    act(() => observer.fire(true))
    expect(box?.getAttribute("data-arrival")).toBe("shown")
    act(() => observer.fire(false))
    expect(box?.getAttribute("data-arrival")).toBe("shown")
  })
})
