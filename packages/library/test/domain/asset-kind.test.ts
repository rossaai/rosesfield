import { describe, expect, it } from "vitest"
import { kindOfMime } from "#domain/asset-kind"

describe("kindOfMime", () => {
  it.each([
    ["image/webp", "image"],
    ["video/mp4", "video"],
    ["audio/mpeg", "audio"],
    ["text/plain", "text"],
    ["application/pdf", null],
    ["imagery/png", null],
  ])("reads %s as %s", (mime, kind) => {
    expect(kindOfMime(mime)).toBe(kind)
  })
})
