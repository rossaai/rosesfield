import { describe, expect, it } from "vitest"
import { InvalidAspectRatioError } from "#error/invalid-aspect-ratio.error"
import { AspectRatio } from "#value/aspect-ratio.value-object"
import { thrownBy } from "../thrown-by"

describe("AspectRatio", () => {
  it.each([
    { text: "16:9", width: 16, height: 9 },
    { text: "21:9", width: 21, height: 9 },
    { text: "1:1", width: 1, height: 1 },
  ])("reads $text as $width by $height", ({ text, width, height }) => {
    const ratio = AspectRatio.parse(text)
    expect(ratio.width).toBe(width)
    expect(ratio.height).toBe(height)
    expect(ratio.toString()).toBe(text)
  })

  it.each(["0:9", "16:0", "16x9", "1.5:1", "100:1", " 16:9", "16:9 ", ""])(
    "refuses %j",
    (text) => {
      expect(AspectRatio.isValid(text)).toBe(false)
      const error = thrownBy(() => AspectRatio.parse(text))
      expect(error).toBeInstanceOf(InvalidAspectRatioError)
      expect(error).toMatchObject({ code: "INVALID_ASPECT_RATIO", status: 400 })
    }
  )
})

describe("the ratio of a size", () => {
  it.each([
    { width: 768, height: 1152, ratio: "2:3" },
    { width: 1080, height: 1920, ratio: "9:16" },
    { width: 1080, height: 1350, ratio: "4:5" },
    { width: 1000, height: 1001, ratio: "1:1" },
  ])("reads $ratio from $width by $height", ({ width, height, ratio }) => {
    expect(AspectRatio.ofSize(width, height)?.toString()).toBe(ratio)
  })

  it("reads no ratio from an empty size, the control", () => {
    expect(AspectRatio.ofSize(0, 1080)).toBeNull()
    expect(AspectRatio.ofSize(Number.NaN, 1080)).toBeNull()
  })
})
