import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { MEDIA_FEED } from "@rosesfield/ui/contracts/media-feed.generated"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function renderFeed(layout: "masonry" | "row") {
  render(
    <MediaFeed
      label="Shared results"
      layout={layout}
      header={<h2>Shared results</h2>}
      viewAll={<ViewAll href="/explore/all">View all</ViewAll>}
    >
      <span>one</span>
      <span>two</span>
    </MediaFeed>
  )
  return screen.getByRole("region", { name: "Shared results" })
}

function classesOf(feed: HTMLElement, slot: string): string[] {
  return (
    feed
      .querySelector(`[data-slot='media-feed-${slot}']`)
      ?.className.split(" ") ?? []
  )
}

describe("MediaFeed", () => {
  it("holds its contract's header, items and View all", () => {
    const feed = renderFeed("masonry")
    for (const slot of MEDIA_FEED.slots) {
      expect(
        feed.querySelector(`[data-slot='media-feed-${slot}']`)
      ).not.toBeNull()
    }
  })

  it("lays a masonry of 6 columns, 1 on a phone, 8 px apart in a 1024 px window", () => {
    const feed = renderFeed("masonry")
    expect(classesOf(feed, "items")).toEqual(
      expect.arrayContaining([
        "columns-1",
        "@regular:columns-6",
        "gap-2",
        "*:mb-2",
      ])
    )
    expect(classesOf(feed, "window")).toContain("max-h-256")
  })

  it("lays a model's row in 4 columns, 2 on a phone, in an 896 px window", () => {
    const feed = renderFeed("row")
    expect(classesOf(feed, "items")).toEqual(
      expect.arrayContaining(["columns-2", "@regular:columns-4"])
    )
    expect(classesOf(feed, "window")).toContain("max-h-224")
  })

  it("ends in a 208 px fade with View all 48 px tall, 36 px above its foot", () => {
    const feed = renderFeed("masonry")
    expect(classesOf(feed, "fade")).toEqual(
      expect.arrayContaining(["h-52", "pb-9", "pointer-events-none"])
    )
    const viewAll = screen.getByRole("link", { name: "View all" })
    expect(viewAll.className.split(" ")).toEqual(
      expect.arrayContaining(["h-12", "px-3", "gap-2"])
    )
    expect(classesOf(feed, "header")).toContain("mb-5")
  })
})
