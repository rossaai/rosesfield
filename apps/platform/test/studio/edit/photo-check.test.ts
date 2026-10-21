import { afterEach, describe, expect, it, vi } from "vitest"
import { formatBytes, formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import {
  fileFactsOf,
  largestPhotoBytes,
  nearestRatio,
  photoRefusalOf,
  photoRefusalText,
  shortestPhotoSide,
} from "@/studio/edit/photo-check"

const photo = { mime: "image/png", bytes: 2_000_000 }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the photo Edit takes", () => {
  it("takes a PNG of 2 MB that is 480 pixels on its short side", () => {
    expect(
      photoRefusalOf({ ...photo, size: { width: 720, height: 480 } })
    ).toBeNull()
  })

  it("refuses a file that is not an image, and says which files it takes", () => {
    const refusal = photoRefusalOf({
      mime: "application/pdf",
      bytes: 1000,
      size: null,
    })
    expect(refusal).toEqual({ kind: "format" })
    expect(refusal === null ? "" : photoRefusalText(refusal)).toBe(
      t("field.asset.wrongKind", { kinds: "PNG, JPEG or WebP" })
    )
  })

  it("refuses an image file that does not open as an image", () => {
    expect(photoRefusalOf({ ...photo, size: null })).toEqual({
      kind: "format",
    })
  })

  it("refuses a file over 20 MB, and names its size and the limit", () => {
    const bytes = largestPhotoBytes + 1
    const refusal = photoRefusalOf({ ...photo, bytes, size: null })
    expect(refusal).toEqual({ kind: "bytes", bytes })
    expect(refusal === null ? "" : photoRefusalText(refusal)).toBe(
      t("field.asset.tooLarge", {
        size: formatBytes(bytes),
        limit: formatBytes(20_000_000),
      })
    )
  })

  it("refuses an image under 480 pixels on its shorter side, and names the 480", () => {
    const refusal = photoRefusalOf({
      ...photo,
      size: { width: 1200, height: shortestPhotoSide - 1 },
    })
    expect(refusal).toEqual({ kind: "small", side: 479 })
    const text = refusal === null ? "" : photoRefusalText(refusal)
    expect(text).toContain(formatNumber(480))
    expect(
      photoRefusalOf({ ...photo, size: { width: 479, height: 1200 } })
    ).toEqual({ kind: "small", side: 479 })
  })
})

describe("reading a picked file", () => {
  it("reads the size of an image file and skips the read for a file that is not one", async () => {
    const read = vi.fn(async () => ({
      width: 640,
      height: 960,
      close: () => undefined,
    }))
    vi.stubGlobal("createImageBitmap", read)
    const image = new File([new Uint8Array(10)], "a.png", {
      type: "image/png",
    })
    const text = new File(["x"], "a.txt", { type: "text/plain" })
    expect(await fileFactsOf(image)).toEqual({
      mime: "image/png",
      bytes: 10,
      size: { width: 640, height: 960 },
    })
    expect(await fileFactsOf(text)).toEqual({
      mime: "text/plain",
      bytes: 1,
      size: null,
    })
    expect(read).toHaveBeenCalledTimes(1)
  })
})

describe("the output ratio nearest a photo", () => {
  it("picks 3:4 for a 900 by 1200 photo", () => {
    expect(
      nearestRatio(["1:1", "4:3", "3:4", "16:9"], { width: 900, height: 1200 })
    ).toBe("3:4")
  })
})
