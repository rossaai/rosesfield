import { describe, expect, it } from "vitest"
import { asset } from "#asset.contract"
import { assetUuid, runUuid } from "./sample"

const upload = {
  id: assetUuid,
  kind: "image",
  mime: "image/png",
  bytes: 48_213,
  width: 1024,
  height: 768,
  durationSeconds: null,
  sourceRunId: null,
  createdAt: "2026-10-17T09:00:00.000Z",
}

describe("asset", () => {
  it("parses an uploaded image with no source run", () => {
    expect(asset.parse(upload).sourceRunId).toBeNull()
  })

  it("parses a video a run made, with its duration", () => {
    const video = asset.parse({
      ...upload,
      kind: "video",
      mime: "video/mp4",
      durationSeconds: 5.04,
      sourceRunId: runUuid,
    })
    expect(video.sourceRunId).toBe(runUuid)
    expect(video.durationSeconds).toBe(5.04)
  })

  it.each(["image/PNG", "text/plain; charset=utf-8", "png"])(
    "refuses the mime type %j",
    (mime) => {
      expect(asset.safeParse({ ...upload, mime }).success).toBe(false)
    }
  )

  it("refuses a negative size and a width of zero", () => {
    expect(asset.safeParse({ ...upload, bytes: -1 }).success).toBe(false)
    expect(asset.safeParse({ ...upload, width: 0 }).success).toBe(false)
  })
})
