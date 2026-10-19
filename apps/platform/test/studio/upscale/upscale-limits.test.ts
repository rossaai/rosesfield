import { describe, expect, it } from "vitest"
import {
  type FileFacts,
  fileProblemOf,
  nearestRatioOf,
  readingProblemOf,
  scaleCheckOf,
  sizeOf,
} from "@/studio/upscale/upscale-limits"

const photo = (change: Partial<FileFacts>): FileFacts => ({
  mime: "image/png",
  bytes: 3_000_000,
  width: 1920,
  height: 1080,
  seconds: null,
  ...change,
})

const clip = (change: Partial<FileFacts>): FileFacts => ({
  mime: "video/mp4",
  bytes: 8_000_000,
  width: 1280,
  height: 720,
  seconds: 5,
  ...change,
})

const ratios = ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9"]

describe("the upscale file checks", () => {
  it("passes a PNG of 1920 by 1080 and a clip of 5 seconds", () => {
    expect(fileProblemOf("image", photo({}))).toBeNull()
    expect(fileProblemOf("video", clip({}))).toBeNull()
  })

  it("refuses a file of the other kind and a file over the size limit", () => {
    expect(fileProblemOf("image", clip({}))).toEqual({ kind: "wrongKind" })
    expect(fileProblemOf("image", photo({ bytes: 20_000_001 }))).toEqual({
      kind: "tooLarge",
      bytes: 20_000_001,
      limit: 20_000_000,
    })
  })

  it("refuses an image whose size the browser could not read", () => {
    expect(fileProblemOf("image", photo({ width: null }))).toEqual({
      kind: "unreadable",
    })
  })

  it("refuses a clip whose size or length the browser could not read", () => {
    expect(fileProblemOf("video", clip({ height: null }))).toEqual({
      kind: "unreadable",
    })
    expect(fileProblemOf("video", clip({ seconds: null }))).toEqual({
      kind: "unreadable",
    })
  })

  it("refuses a short side under 64 pixels and passes one of 64", () => {
    expect(fileProblemOf("image", photo({ height: 63 }))).toEqual({
      kind: "tooSmall",
      side: 63,
      min: 64,
    })
    expect(fileProblemOf("image", photo({ height: 64 }))).toBeNull()
  })

  it("names a clip just over 10 seconds as longer than 10 seconds", () => {
    expect(fileProblemOf("video", clip({ seconds: 10 }))).toBeNull()
    expect(fileProblemOf("video", clip({ seconds: 10.04 }))).toEqual({
      kind: "tooLong",
      seconds: 10.1,
      max: 10,
    })
  })

  it("names a clip just under 1 second as shorter than 1 second", () => {
    expect(fileProblemOf("video", clip({ seconds: 1 }))).toBeNull()
    expect(fileProblemOf("video", clip({ seconds: 0.96 }))).toEqual({
      kind: "tooShort",
      seconds: 0.9,
      min: 1,
    })
  })
})

describe("the upscale reading", () => {
  it("waits on a file still being read and refuses one that failed", () => {
    expect(readingProblemOf("image", { state: "none" })).toBeNull()
    expect(readingProblemOf("image", { state: "reading" })).toBeNull()
    expect(readingProblemOf("video", { state: "failed" })).toEqual({
      kind: "unreadable",
    })
  })

  it("checks the facts of a file that was read", () => {
    expect(
      readingProblemOf("video", {
        state: "read",
        facts: clip({ seconds: null }),
      })
    ).toEqual({ kind: "unreadable" })
    expect(
      readingProblemOf("image", { state: "read", facts: photo({}) })
    ).toBeNull()
  })
})

describe("the upscale scale check", () => {
  it("is empty without a size", () => {
    expect(sizeOf(photo({ width: null }))).toBeNull()
    expect(scaleCheckOf(null, "4x")).toEqual({ state: "empty" })
  })

  it("fits 1920 by 1080 at 2x on the 3840 pixel cap", () => {
    expect(scaleCheckOf({ width: 1920, height: 1080 }, "2x")).toEqual({
      state: "fits",
      width: 3840,
      height: 2160,
    })
  })

  it("refuses 1920 by 1080 at 4x and a tall file whose long side passes the cap", () => {
    expect(scaleCheckOf({ width: 1920, height: 1080 }, "4x")).toEqual({
      state: "tooBig",
      width: 7680,
      height: 4320,
      max: 3840,
    })
    expect(scaleCheckOf({ width: 1000, height: 1921 }, "2x")).toEqual({
      state: "tooBig",
      width: 2000,
      height: 3842,
      max: 3840,
    })
  })
})

describe("the upscale shape", () => {
  it.each([
    { width: 1920, height: 1080, ratio: "16:9" },
    { width: 1080, height: 1920, ratio: "9:16" },
    { width: 1000, height: 1000, ratio: "1:1" },
    { width: 3000, height: 2000, ratio: "3:2" },
    { width: 4032, height: 3024, ratio: "4:3" },
    { width: 2560, height: 1080, ratio: "21:9" },
  ])("picks $ratio for $width by $height", ({ width, height, ratio }) => {
    expect(nearestRatioOf(ratios, { width, height })).toBe(ratio)
  })

  it("picks nothing from no options", () => {
    expect(nearestRatioOf([], { width: 10, height: 10 })).toBeNull()
  })
})
