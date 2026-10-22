import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { MEDIA_FEED } from "@rosesfield/ui/contracts/media-feed.generated"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function renderFeed(
  layout: "masonry" | "row",
  content: "media" | "presets" = "media",
  count = 2
) {
  render(
    <MediaFeed
      label="Shared results"
      layout={layout}
      content={content}
      header={<h2>Shared results</h2>}
      viewAll={<ViewAll href="/explore/all">View all</ViewAll>}
    >
      {Array.from({ length: count }, (_, index) => `item ${index}`).map(
        (name) => (
          <span key={name}>{name}</span>
        )
      )}
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

  it("lays a masonry of 6 column stacks, 1 column on a phone, 8 px apart in a 1024 px window", () => {
    const feed = renderFeed("masonry", "media", 8)
    expect(classesOf(feed, "items")).toEqual(
      expect.arrayContaining([
        "columns-1",
        "gap-2",
        "@regular:grid",
        "@regular:grid-cols-6",
      ])
    )
    const stacks = feed.querySelectorAll("[data-slot='media-feed-stack']")
    expect(stacks).toHaveLength(6)
    expect(stacks[0]?.textContent).toBe("item 0item 6")
    expect(stacks[5]?.textContent).toBe("item 5")
    expect(stacks[0]?.className.split(" ")).toEqual(
      expect.arrayContaining(["contents", "*:mb-2", "@regular:gap-2"])
    )
    expect(classesOf(feed, "window")).toEqual(
      expect.arrayContaining([
        "max-h-[calc(--spacing(256)+var(--spacing-focus-ring)*4)]",
        "-m-[calc(var(--spacing-focus-ring)*2)]",
        "p-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
  })

  it("stands a model's row in 4 column stacks of 352 px, each tile 8 px inside its column, 2 columns on a phone, in an 896 px window", () => {
    const feed = renderFeed("row", "media", 6)
    expect(classesOf(feed, "items")).toEqual(
      expect.arrayContaining([
        "columns-2",
        "gap-2",
        "@regular:grid",
        "@regular:grid-cols-4",
        "@regular:gap-0",
      ])
    )
    const stacks = feed.querySelectorAll("[data-slot='media-feed-stack']")
    expect(stacks).toHaveLength(4)
    expect(stacks[0]?.textContent).toBe("item 0item 4")
    expect(stacks[1]?.textContent).toBe("item 1item 5")
    expect(stacks[0]?.className.split(" ")).toEqual(
      expect.arrayContaining(["contents", "@regular:flex", "@regular:pe-2"])
    )
    expect(classesOf(feed, "window")).toContain(
      "max-h-[calc(--spacing(224)+var(--spacing-focus-ring)*4)]"
    )
  })

  it("draws a row's clip at 125 percent from the foot, and a masonry's at its own size", () => {
    const tile = (
      <ResultTile
        kind="image"
        src="a.png"
        alt="A rose"
        aspect={{ width: 9, height: 16 }}
        app="Image"
        openLabel="Open"
        expandLabel="Expand"
        moreLabel="More"
        recreateLabel="Recreate"
        recreateName="Recreate this result"
        onOpen={() => undefined}
        onRecreate={() => undefined}
      />
    )
    render(
      <MediaFeed label="Row" layout="row">
        {tile}
      </MediaFeed>
    )
    const stack = screen
      .getByRole("region", { name: "Row" })
      .querySelector("[data-slot='media-feed-stack']")
    expect(stack?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "[&_[data-slot=media]>[data-slot=media-tile]]:origin-bottom",
        "[&_[data-slot=media]>[data-slot=media-tile]]:scale-125",
      ])
    )
    expect(
      stack?.querySelector("[data-slot=media]>[data-slot=media-tile]")
    ).not.toBeNull()
    cleanup()
    render(
      <MediaFeed label="Masonry" layout="masonry">
        {tile}
      </MediaFeed>
    )
    const masonry = screen.getByRole("region", { name: "Masonry" })
    expect(masonry.innerHTML).not.toContain("scale-125")
  })

  it("stands presets in 5 column stacks of 274 px, 8 px apart and centred, 2 on a phone", () => {
    const feed = renderFeed("row", "presets", 12)
    expect(classesOf(feed, "items")).toEqual(
      expect.arrayContaining([
        "columns-2",
        "@regular:grid-cols-[repeat(5,minmax(0,--spacing(68.5)))]",
        "@regular:justify-center",
        "@regular:gap-x-2",
      ])
    )
    const stacks = feed.querySelectorAll("[data-slot='media-feed-stack']")
    expect(stacks).toHaveLength(5)
    expect([...stacks].map((stack) => stack.childElementCount)).toEqual([
      3, 3, 2, 2, 2,
    ])
  })

  it("shows every item, with no window, when no View all leads to the rest", () => {
    render(
      <MediaFeed label="Examples">
        <span>item</span>
      </MediaFeed>
    )
    const feed = screen.getByRole("region", { name: "Examples" })
    const window = feed.querySelector("[data-slot='media-feed-window']")
    expect(window?.className).not.toContain("max-h-")
    expect(feed.querySelector("[data-slot='media-feed-fade']")).toBeNull()
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

describe("ViewAll raise", () => {
  it("rises to z-index 1 on hover and on focus, over the fade it sits in", () => {
    const feed = renderFeed("row")
    expect(classesOf(feed, "viewAll")).toEqual(
      expect.arrayContaining(["relative", "hover:z-1", "focus-visible:z-1"])
    )
  })
})
