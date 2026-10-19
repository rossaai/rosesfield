import { describe, expect, it } from "vitest"
import { readOneOf, readSamePath, readText } from "@/shell/search"

describe("readSamePath", () => {
  it("keeps a path on this origin with its query", () => {
    expect(readSamePath("/apps/image?from=abc")).toBe("/apps/image?from=abc")
  })

  it("refuses another origin, a protocol-relative path and plain text", () => {
    expect(readSamePath("https://example.com/apps")).toBeUndefined()
    expect(readSamePath("//example.com/apps")).toBeUndefined()
    expect(readSamePath("apps")).toBeUndefined()
    expect(readSamePath(42)).toBeUndefined()
  })
})

describe("search readers", () => {
  it("reads text and refuses blank text", () => {
    expect(readText("lake")).toBe("lake")
    expect(readText("  ")).toBeUndefined()
  })

  it("reads only a listed value", () => {
    expect(readOneOf("video", ["image", "video"])).toBe("video")
    expect(readOneOf("text", ["image", "video"])).toBeUndefined()
  })
})
