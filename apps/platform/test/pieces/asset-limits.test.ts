import { describe, expect, it } from "vitest"
import { assetLimitsText } from "@/pieces/asset-limits"

describe("assetLimitsText", () => {
  it("names the formats and the largest size in one short line", () => {
    expect(
      assetLimitsText({
        formats: ["image/png", "image/jpeg", "image/webp"],
        bytes: 20_000_000,
      })
    ).toBe("PNG, JPEG or WebP, up to 20 MB")
  })

  it("adds a clip's length range and the pixel bounds in the same pattern", () => {
    expect(
      assetLimitsText({
        formats: ["video/mp4", "video/quicktime", "video/webm"],
        bytes: 100_000_000,
        seconds: { min: 2, max: 5 },
        shortSide: 64,
      })
    ).toBe(
      "MP4, MOV or WebM, 2 to 5 seconds, up to 100 MB, at least 64 pixels on the short side"
    )
  })
})
