import { describe, expect, it } from "vitest"
import { catalogCopy } from "@/catalog/catalog-copy"

const videoStrings = Object.entries(catalogCopy).filter(([key]) =>
  key.startsWith("video.")
)

describe("the words Video shows", () => {
  it("names no engine in a string a person reads", () => {
    expect(videoStrings.length).toBeGreaterThan(0)
    expect(
      videoStrings.filter(([, text]) => /comfy/i.test(text)).map(([key]) => key)
    ).toEqual([])
  })
})
