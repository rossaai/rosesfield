import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { showcaseEntries } from "@/screens/explore/explore-entries"
import {
  bannerPortraits,
  heldStills,
  ShowcaseFeed,
} from "@/screens/explore/explore-sections"
import { showcaseItems } from "@/showcase/showcase"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

const entries = showcaseEntries(showcaseItems)
const stills = heldStills(entries)

async function renderShowcase(): Promise<HTMLElement> {
  renderAt("/", () => (
    <ShowcaseFeed
      entries={entries}
      onOpen={() => undefined}
      onMore={() => undefined}
    />
  ))
  return screen.findByRole("region", { name: t("explore.showcase.title") })
}

describe("Explore's showcase", () => {
  it("lays every held still once in the masonry at its own shape", async () => {
    const feed = await renderShowcase()
    expect(feed.getAttribute("data-layout")).toBe("masonry")
    const tiles = [...feed.querySelectorAll<HTMLElement>("[data-slot=media]")]
    expect(tiles).toHaveLength(stills.length)
    expect(tiles.map((tile) => tile.style.aspectRatio).sort()).toEqual(
      stills
        .map((entry) => `${entry.aspect.width} / ${entry.aspect.height}`)
        .sort()
    )
    expect(feed.querySelectorAll("video")).toHaveLength(0)
  })

  it("names the app and the model as a pill with Recreate on hover, and keeps one View all in the header", async () => {
    const feed = await renderShowcase()
    const pills = [...feed.querySelectorAll("[data-slot=media-badge]")].map(
      (pill) => pill.textContent
    )
    expect(pills).toContain("Image · Z-Image Turbo")
    expect(pills).toContain("Image · Qwen Image 2512")
    expect(
      screen.getAllByRole("button", { name: t("explore.tile.recreateName") })
    ).toHaveLength(stills.length)
    const actions = feed.querySelector("[data-slot='section-heading-actions']")
    expect(
      [...(actions?.querySelectorAll("a") ?? [])].map(
        (link) => link.textContent
      )
    ).toEqual([t("explore.showcase.viewAll")])
  })

  it("shows nothing when no example is bundled", async () => {
    renderAt("/", () => (
      <>
        <span>Explore</span>
        <ShowcaseFeed
          entries={[]}
          onOpen={() => undefined}
          onMore={() => undefined}
        />
      </>
    ))
    await screen.findByText("Explore")
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("anchors the two examples the rows name to the banner's corners", () => {
    const portraits = bannerPortraits()
    const start = showcaseItems.find((item) => item.banner === "start")
    const end = showcaseItems.find((item) => item.banner === "end")
    expect(portraits).toEqual({ start: start?.src, end: end?.src })
    expect(bannerPortraits([])).toEqual({})
  })
})
