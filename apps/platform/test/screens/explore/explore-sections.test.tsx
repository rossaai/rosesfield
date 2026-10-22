import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { showcaseEntries } from "@/screens/explore/explore-entries"
import { feedExamples, Reveal } from "@/screens/explore/explore-sections"
import { exampleGroupOf, showcaseItems } from "@/showcase/showcase"
import { showcaseRows } from "@/showcase/showcase-rows"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Explore's examples", () => {
  it("lists every example once, clips and app results included, and leaves out a clip made from another clip", () => {
    const examples = feedExamples(showcaseEntries(showcaseItems))
    const files = examples.map((entry) => entry.key)
    expect(new Set(files).size).toBe(files.length)
    const fromClips = showcaseRows.filter(
      (row) => row.from?.endsWith(".mp4") === true
    )
    expect(fromClips.length).toBeGreaterThan(0)
    for (const row of fromClips) {
      expect(files).not.toContain(`showcase-${row.file}`)
    }
    expect(examples.filter((entry) => entry.kind === "video").length).toBe(
      showcaseRows.filter(
        (row) => row.kind === "video" && row.from?.endsWith(".mp4") !== true
      ).length
    )
    expect(examples).toHaveLength(showcaseRows.length - fromClips.length)
  })

  it("keeps an example a full row away from the still it was made from, so no two neighbours show the same person", () => {
    const examples = feedExamples(showcaseEntries(showcaseItems))
    const groups = examples.map((entry) => exampleGroupOf(entry.run.id))
    groups.forEach((group, at) => {
      expect(groups.slice(Math.max(0, at - 5), at)).not.toContain(group)
    })
    expect(examples[0]?.aspect.height).toBeGreaterThan(
      examples[0]?.aspect.width ?? 0
    )
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
