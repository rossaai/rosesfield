import { describe, expect, it } from "vitest"
import { finalPriceOf, priceNoteOf } from "@/studio/motion/chain-price"

describe("the final's price before its yes", () => {
  it("keeps the graph's measured 21.49 at 720p over an estimate, and your own measured run over both", () => {
    expect(finalPriceOf({ source: "estimate", credits: 20 }, "720p")).toEqual({
      credits: 21.49,
      source: "example",
      seconds: 4,
      resolution: "720p",
    })
    expect(finalPriceOf({ source: "measured", credits: 12 }, "720p")).toEqual({
      credits: 12,
      source: "measured",
    })
  })

  it("names an estimate as one at a resolution no run of the graph measured, the control", () => {
    const price = finalPriceOf({ source: "estimate", credits: 9 }, "1080p")
    expect(price).toEqual({ credits: 9, source: "estimate" })
    expect(priceNoteOf(price)).toBe("9 Comfy credits, estimated")
  })

  it("prices the 720p final from the run with the end key every final renders with, never the 15.69 a run with no end key cost", () => {
    const price = finalPriceOf({ source: "unknown", credits: null }, "720p")
    expect(price.credits).not.toBe(15.69)
    expect(price).toEqual({
      credits: 21.49,
      source: "example",
      seconds: 4,
      resolution: "720p",
    })
  })

  it("shows no final price at 480p when the route has none, since no final with its end key was measured at 480p", () => {
    expect(finalPriceOf({ source: "unknown", credits: null }, "480p")).toEqual({
      credits: null,
      source: "unknown",
    })
  })
})
