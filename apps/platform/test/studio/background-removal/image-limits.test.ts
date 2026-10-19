import { describe, expect, it } from "vitest"
import {
  canStartWith,
  type ImageFacts,
  imageCheckOf,
  imageProblemOf,
  maxBytes,
  maxLongSide,
  minShortSide,
  nearestRatioOf,
} from "@/studio/background-removal/image-limits"

const ratios = ["1:1", "4:3", "3:4", "16:9", "9:16"]

function facts(next: Partial<ImageFacts>): ImageFacts {
  return {
    mime: "image/png",
    bytes: 1_000_000,
    width: 1024,
    height: 768,
    ...next,
  }
}

const retry = () => undefined

describe("the Remove background image limits", () => {
  it("states the limits the app sets", () => {
    expect([maxLongSide, minShortSide, maxBytes]).toEqual([
      4096, 64, 20_000_000,
    ])
  })

  it("takes a long side of 4096 and refuses 4097", () => {
    expect(imageProblemOf(facts({ width: 4096, height: 2048 }))).toBeNull()
    expect(imageProblemOf(facts({ width: 2048, height: 4097 }))).toEqual({
      kind: "tooBig",
      width: 2048,
      height: 4097,
      max: 4096,
    })
  })

  it("takes a short side of 64 and refuses 63", () => {
    expect(imageProblemOf(facts({ width: 64, height: 640 }))).toBeNull()
    expect(imageProblemOf(facts({ width: 640, height: 63 }))).toEqual({
      kind: "tooSmall",
      width: 640,
      height: 63,
      min: 64,
    })
  })

  it("takes 20,000,000 bytes and refuses 20,000,001", () => {
    expect(imageProblemOf(facts({ bytes: 20_000_000 }))).toBeNull()
    expect(imageProblemOf(facts({ bytes: 20_000_001 }))).toEqual({
      kind: "tooLarge",
      bytes: 20_000_001,
      limit: 20_000_000,
    })
  })

  it("takes PNG, JPEG and WebP and refuses GIF", () => {
    for (const mime of ["image/png", "image/jpeg", "image/webp"]) {
      expect(imageProblemOf(facts({ mime }))).toBeNull()
    }
    expect(imageProblemOf(facts({ mime: "image/gif" }))).toEqual({
      kind: "wrongKind",
    })
  })

  it("names the kind first, then the bytes, then the long side, then the short side", () => {
    const everything = facts({
      mime: "image/gif",
      bytes: 30_000_000,
      width: 5000,
      height: 48,
    })
    expect(imageProblemOf(everything)?.kind).toBe("wrongKind")
    expect(imageProblemOf({ ...everything, mime: "image/png" })?.kind).toBe(
      "tooLarge"
    )
    expect(
      imageProblemOf({ ...everything, mime: "image/png", bytes: 1 })?.kind
    ).toBe("tooBig")
    expect(
      imageProblemOf({
        ...everything,
        mime: "image/png",
        bytes: 1,
        width: 4000,
      })?.kind
    ).toBe("tooSmall")
  })

  it("refuses 5,000 by 3,000 and 48 by 48", () => {
    expect(imageProblemOf(facts({ width: 5000, height: 3000 }))?.kind).toBe(
      "tooBig"
    )
    expect(imageProblemOf(facts({ width: 48, height: 48 }))?.kind).toBe(
      "tooSmall"
    )
  })
})

describe("the nearest ratio of an image", () => {
  it("picks 16:9 for a wide image and 9:16 for a tall one", () => {
    expect(nearestRatioOf(ratios, { width: 1920, height: 1080 })).toBe("16:9")
    expect(nearestRatioOf(ratios, { width: 1080, height: 1920 })).toBe("9:16")
  })

  it("picks 4:3 for 1024 by 768 and 1:1 for a square", () => {
    expect(nearestRatioOf(ratios, { width: 1024, height: 768 })).toBe("4:3")
    expect(nearestRatioOf(ratios, { width: 900, height: 900 })).toBe("1:1")
  })

  it("compares ratios on a log scale, so 1350 by 1000 is nearer 16:9 than 1:1", () => {
    expect(nearestRatioOf(["1:1", "16:9"], { width: 1300, height: 1000 })).toBe(
      "1:1"
    )
    expect(nearestRatioOf(["1:1", "16:9"], { width: 1350, height: 1000 })).toBe(
      "16:9"
    )
  })

  it("returns nothing when the app lists no ratio", () => {
    expect(nearestRatioOf([], { width: 10, height: 10 })).toBeNull()
  })
})

describe("the Remove background image check", () => {
  it("holds Generate while the size is unknown", () => {
    const check = imageCheckOf({
      state: "reading",
      stored: { mime: "image/png", bytes: 1000 },
    })
    expect(check).toEqual({ state: "pending" })
    expect(canStartWith(check)).toBe(false)
  })

  it("refuses a wrong kind or a large file before the size is known", () => {
    expect(
      imageCheckOf({
        state: "reading",
        stored: { mime: "image/gif", bytes: 1000 },
      })
    ).toEqual({ state: "refused", problem: { kind: "wrongKind" } })
    expect(
      imageCheckOf({
        state: "failed",
        stored: { mime: "image/png", bytes: 20_000_001 },
        retry,
      })
    ).toMatchObject({ state: "refused", problem: { kind: "tooLarge" } })
  })

  it("offers a retry when the size could not be read, and holds Generate", () => {
    const check = imageCheckOf({ state: "failed", stored: null, retry })
    expect(check).toEqual({ state: "unreadable", retry })
    expect(canStartWith(check)).toBe(false)
  })

  it("refuses a measured image out of bounds and holds Generate", () => {
    const check = imageCheckOf({
      state: "read",
      facts: facts({ width: 5000, height: 3000 }),
    })
    expect(check).toMatchObject({
      state: "refused",
      problem: { kind: "tooBig" },
    })
    expect(canStartWith(check)).toBe(false)
  })

  it("lets Generate start on a measured image in bounds", () => {
    const check = imageCheckOf({ state: "read", facts: facts({}) })
    expect(check).toEqual({
      state: "valid",
      size: { width: 1024, height: 768 },
    })
    expect(canStartWith(check)).toBe(true)
  })

  it("leaves an empty well to the form, which asks for the image", () => {
    const check = imageCheckOf({ state: "none" })
    expect(check).toEqual({ state: "empty" })
    expect(canStartWith(check)).toBe(true)
  })
})
