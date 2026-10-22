import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { showcaseEntries } from "@/screens/explore/explore-entries"
import {
  bannerPortraits,
  ShowcaseFeed,
} from "@/screens/explore/explore-sections"
import { showcaseItems } from "@/showcase/showcase"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

const entries = showcaseEntries(showcaseItems)

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
  it("lays every bundled example in the masonry at its own shape", async () => {
    const feed = await renderShowcase()
    expect(feed.getAttribute("data-layout")).toBe("masonry")
    const tiles = [...feed.querySelectorAll<HTMLElement>("[data-slot=media]")]
    expect(tiles).toHaveLength(showcaseItems.length)
    expect(tiles.map((tile) => tile.style.aspectRatio)).toEqual(
      showcaseItems.map((item) => `${item.width} / ${item.height}`)
    )
  })

  it("loops each clip muted, and names the app and the model with Recreate on hover", async () => {
    const feed = await renderShowcase()
    const clips = [...feed.querySelectorAll("video")]
    expect(clips).toHaveLength(
      showcaseItems.filter((item) => item.kind === "video").length
    )
    for (const clip of clips) {
      expect(clip.muted).toBe(true)
      expect(clip.loop).toBe(true)
    }
    const veils = [...feed.querySelectorAll("[data-slot=media-veil]")].map(
      (veil) => veil.textContent
    )
    expect(veils).toContain("Image · Z-Image Turbo")
    expect(veils).toContain("Image · Qwen Image 2512")
    expect(veils).toContain("Effects · LTX 2.5")
    expect(
      screen.getAllByRole("button", { name: t("explore.tile.recreateName") })
    ).toHaveLength(showcaseItems.length)
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
