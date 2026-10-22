import { type Asset, asset } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { frameAspectOf, mediaAspectOf } from "@/viewer/asset-viewer"

const tall: Asset = asset.parse({
  id: "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a01",
  kind: "video",
  mime: "video/mp4",
  bytes: 4096,
  width: null,
  height: null,
  durationSeconds: 5,
  sourceRunId: null,
  createdAt: "2026-10-21T12:00:00.000Z",
})

const clicked = { kind: "video" as const, width: 1080, height: 1920 }

describe("the shape the asset viewer opens at", () => {
  it("takes the clicked tile's shape before the asset or its media has loaded", () => {
    expect(mediaAspectOf(undefined, null, clicked)).toEqual({
      width: 1080,
      height: 1920,
    })
    expect(mediaAspectOf(tall, null, clicked)).toEqual({
      width: 1080,
      height: 1920,
    })
  })

  it("prefers the stored size, then the measured size, over the tile's", () => {
    expect(
      mediaAspectOf({ ...tall, width: 720, height: 1280 }, null, clicked)
    ).toEqual({ width: 720, height: 1280 })
    expect(mediaAspectOf(tall, { width: 540, height: 960 }, clicked)).toEqual({
      width: 540,
      height: 960,
    })
  })

  it("adds the video's control room from the tile's kind before the asset loads", () => {
    const aspect = mediaAspectOf(undefined, null, clicked)

    expect(frameAspectOf(clicked.kind, aspect, true).height).toBeGreaterThan(
      1920
    )
    expect(frameAspectOf("image", aspect, true)).toEqual(aspect)
  })
})
