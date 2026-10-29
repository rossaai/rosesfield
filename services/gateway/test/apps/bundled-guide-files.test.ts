import { describe, expect, it } from "vitest"
import { bundledGuideFiles } from "#effect-guides/bundled-guide-files"

describe("the guides the Worker bundles", () => {
  it("reads a bundled guide's bytes by its file name", async () => {
    const files = bundledGuideFiles({
      "grab-and-run.mp4": Uint8Array.of(1, 2, 3).buffer,
    })
    expect(await files.read("grab-and-run.mp4")).toEqual(Uint8Array.of(1, 2, 3))
  })

  it("reads nothing for a file it does not bundle, or one that is not bytes, the control", async () => {
    const files = bundledGuideFiles({ "ticket-wipe.mp4": "/path/to/a/file" })
    expect(await files.read("ticket-wipe.mp4")).toBeNull()
    expect(await files.read("another.mp4")).toBeNull()
  })
})
