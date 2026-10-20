import { describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { appTileCount, tileApps } from "@/screens/explore/explore-sections"

describe("Explore's app tiles", () => {
  it("take apps from every media area in turn, each with its own icon", () => {
    const tiles = tileApps()
    const kinds = new Set(tiles.map(({ app }) => app.category))

    expect(tiles).toHaveLength(appTileCount)
    expect(kinds).toEqual(new Set(["image", "video", "audio"]))
    expect(tiles.every(({ icon }) => icon !== null)).toBe(true)
    expect(new Set(tiles.map(({ app }) => app.id)).size).toBe(tiles.length)
  })

  it("show no tile for an area with no app", () => {
    const images = catalogApps.filter((app) => app.category === "image")

    expect(tileApps(images).map(({ app }) => app.category)).toEqual(
      images.slice(0, appTileCount).map(() => "image")
    )
  })
})
