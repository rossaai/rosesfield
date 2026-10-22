import {
  MediaFeed,
  packStacks,
  ViewAll,
} from "@rosesfield/ui/components/media-feed"
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

  it("lays a masonry of 6 column stacks, 2 columns on a phone, 7 px apart in the feed window token", () => {
    const feed = renderFeed("masonry", "media", 8)
    expect(classesOf(feed, "items")).toEqual(
      expect.arrayContaining([
        "columns-2",
        "gap-s2",
        "@regular:grid",
        "@regular:grid-cols-6",
      ])
    )
    const stacks = feed.querySelectorAll("[data-slot='media-feed-stack']")
    expect(stacks).toHaveLength(6)
    expect(stacks[0]?.textContent).toBe("item 0item 6")
    expect(stacks[5]?.textContent).toBe("item 5")
    expect(classesOf(feed, "window")).toEqual(
      expect.arrayContaining([
        "max-h-[calc(var(--spacing-feed-window)+var(--spacing-focus-ring)*4)]",
        "-m-[calc(var(--spacing-focus-ring)*2)]",
        "p-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
  })

  it("places each tile in the shortest stack, so every column ends within one tile of the others", () => {
    const tall = { width: 9, height: 16 }
    const wide = { width: 16, height: 9 }
    const ratios = [tall, wide, tall, wide, tall, wide]
    const stacks = packStacks(
      ratios.map((ratio) => ratio.height / ratio.width),
      2
    )
    const bottoms = stacks.map((places) =>
      places.reduce((sum, place) => {
        const ratio = ratios[place]
        return ratio === undefined ? sum : sum + ratio.height / ratio.width
      }, 0)
    )
    expect(stacks).toEqual([
      [0, 3, 4],
      [1, 2, 5],
    ])
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(
      tall.height / tall.width
    )
  })

  it("reads each tile's own ratio when it packs a feed of result tiles", () => {
    const tall = { width: 9, height: 16 }
    const wide = { width: 16, height: 9 }
    render(
      <MediaFeed label="Packed">
        {[tall, wide, wide, wide].map((aspect, index) => (
          <ResultTile
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed test list
            key={index}
            kind="image"
            src={`${index}.png`}
            alt={`Result ${index}`}
            aspect={aspect}
            app="Image"
            openLabel={`Open ${index}`}
            expandLabel="Expand"
            moreLabel="More"
            recreateLabel="Recreate"
            recreateName="Recreate this result"
            onOpen={() => undefined}
            onRecreate={() => undefined}
          />
        ))}
      </MediaFeed>
    )
    const stacks = screen
      .getByRole("region", { name: "Packed" })
      .querySelectorAll("[data-slot='media-feed-stack']")
    expect(stacks[0]?.querySelectorAll("[data-slot='media']")).toHaveLength(1)
  })

  it("lays a row as one sideways scroller showing three whole tiles and part of a fourth, with an edge fade and glass steps", () => {
    render(
      <MediaFeed
        label="Row"
        layout="row"
        rowLabels={{ previous: "Previous", next: "Next" }}
      >
        <span>a</span>
        <span>b</span>
      </MediaFeed>
    )
    const feed = screen.getByRole("region", { name: "Row" })
    const items = classesOf(feed, "items")
    expect(items).toEqual(
      expect.arrayContaining([
        "flex",
        "overflow-x-auto",
        "*:w-[calc((100%-var(--spacing-s2)*3)/3.4)]",
        "*:snap-start",
      ])
    )
    const next = screen.getByRole("button", { name: "Next" })
    expect(next.className.split(" ")).toEqual(
      expect.arrayContaining(["material-thin", "size-icon", "border"])
    )
    expect(
      feed.querySelector("[data-slot='media-feed-next']")?.className
    ).toContain("@regular:flex")
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

  it("ends in the feed fade token with one 40 px View all pill", () => {
    const feed = renderFeed("masonry")
    expect(classesOf(feed, "fade")).toEqual(
      expect.arrayContaining(["h-feed-fade", "pointer-events-none"])
    )
    const viewAll = screen.getByRole("link", { name: "View all" })
    expect(viewAll.className.split(" ")).toEqual(
      expect.arrayContaining(["h-field", "rounded-full", "motion-press"])
    )
    expect(screen.getAllByRole("link", { name: "View all" })).toHaveLength(1)
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
