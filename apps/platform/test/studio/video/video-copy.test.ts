import { describe, expect, it } from "vitest"
import { catalogCopy } from "@/catalog/catalog-copy"
import { tCatalogCount } from "@/copy/t"

const videoStrings = Object.entries(catalogCopy).filter(([key]) =>
  key.startsWith("video.")
)

describe("the words Video shows", () => {
  it("counts the references in the plural form the count needs", () => {
    expect(tCatalogCount("video.well.references.note", 1)).toBe(
      "Up to 1 image. The video keeps what it shows."
    )
    expect(tCatalogCount("video.well.references.note", 4)).toBe(
      "Up to 4 images. The video keeps what they show."
    )
  })

  it("names no engine in a string a person reads", () => {
    expect(videoStrings.length).toBeGreaterThan(0)
    expect(
      videoStrings.filter(([, text]) => /comfy/i.test(text)).map(([key]) => key)
    ).toEqual([])
  })
})
