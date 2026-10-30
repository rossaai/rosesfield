import { templates } from "@rosesfield/catalog/ai-influencer"
import { approvedExamples } from "@rosesfield/catalog/motion"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { showcaseEntries } from "@/screens/explore/explore-entries"
import { feedExamples, Reveal } from "@/screens/explore/explore-sections"
import {
  exampleGroupOf,
  exampleRowsOf,
  showcaseItems,
  templateRowsOf,
} from "@/showcase/showcase"
import { showcaseRows as listedRows } from "@/showcase/showcase-rows"

const showcaseRows = [
  ...exampleRowsOf(approvedExamples),
  ...listedRows,
  ...templateRowsOf(templates),
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Explore's examples", () => {
  it("lists every example once, clips and app results included, and leaves out a clip made from another clip and a still another example was made from", () => {
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
    const rowFiles = new Set(showcaseRows.map((row) => row.file))
    const sources = new Set(
      showcaseRows.flatMap((row) =>
        row.from?.endsWith(".mp4") === true
          ? []
          : [row.from, row.input?.file].filter(
              (file): file is string => file !== undefined && rowFiles.has(file)
            )
      )
    )
    const banners = showcaseRows.filter(
      (row) => row.banner !== undefined && !sources.has(row.file)
    )
    expect(examples).toHaveLength(
      showcaseRows.length - fromClips.length - sources.size - banners.length
    )
  })

  it("shows only the after of a before and after pair, never the source still beside its result", () => {
    const files = feedExamples(showcaseEntries(showcaseItems)).map(
      (entry) => entry.key
    )
    for (const source of [
      "perfume-roses.webp",
      "camper-van.webp",
      "goose-throne.webp",
      "hose-garden.webp",
    ]) {
      expect(files).not.toContain(`showcase-${source}`)
    }
    for (const after of [
      "jaguar-relit.webp",
      "perfume-cutout.webp",
      "grab-and-run.mp4",
    ]) {
      expect(files).toContain(`showcase-${after}`)
    }
  })

  it("keeps an example a full row away from the still it was made from, so no two neighbours show the same person", () => {
    const examples = feedExamples(showcaseEntries(showcaseItems))
    const groups = examples.map((entry) => exampleGroupOf(entry.run.id))
    groups.forEach((group, at) => {
      expect(groups.slice(Math.max(0, at - 5), at)).not.toContain(group)
    })
  })

  it("leaves the banner's pair to the banner, so no subject shows twice", () => {
    const files = feedExamples(showcaseEntries(showcaseItems)).map(
      (entry) => entry.key
    )
    expect(files).not.toContain("showcase-hose-flowers.webp")
  })

  it("alternates an example that stops a visitor with one a person wants to make, from Grab and run on, and ends on AI Influencer's four characters", () => {
    const files = feedExamples(showcaseEntries(showcaseItems)).map((entry) =>
      entry.key.replace(/^showcase-/, "")
    )
    expect(files).toEqual([
      "grab-and-run.mp4",
      "perfume-cutout.webp",
      "goose-throne.mp4",
      "sunflower-wide.webp",
      "flamingo-bus-stop.webp",
      "jaguar-relit.webp",
      "hare-laundromat.webp",
      "chameleon-1536.webp",
      "camper-van-cake.webp",
      "bee-poppy.mp4",
      "ai-influencer-capybara.webp",
      "ai-influencer-absurd-man.webp",
      "ai-influencer-frog.webp",
      "ai-influencer-mantis.webp",
    ])
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
