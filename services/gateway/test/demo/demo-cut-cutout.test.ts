import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  cut,
  ffmpeg,
  makeMedia,
  ownerManifest,
  ownerTake,
  pixelAt,
  writeTake,
} from "./demo-take"

describe("bun run demo:cut --local", () => {
  it("draws a transparent result on the dark canvas, never in the colors its cut-out pixels still hold", async () => {
    const at = await mkdtemp(join(tmpdir(), "rosesfield-demo-cutout-"))
    await makeMedia(at)
    await ffmpeg(at, [
      ...["-f", "lavfi", "-i", "color=c=0x884422@0:size=480x640,format=rgba"],
      ...["-frames:v", "1", "media/cutout.png"],
    ])
    const cutout = {
      ...ownerTake,
      appId: "background-removal",
      appName: "Background removal",
      output: { file: "media/cutout.png", kind: "image" },
      model: "BiRefNet",
      credits: 0.68,
      screen: null,
    }
    await writeTake(at, ownerManifest({ apps: [cutout] }))

    const done = await cut(at, "--local", "--draft")
    const pixel = await pixelAt(
      join(at, "apps/background-removal-local.mp4"),
      3,
      { x: 700, y: 100 }
    )
    await rm(at, { recursive: true, force: true })

    expect(done.error).toBe("")
    expect(pixel).toHaveLength(3)
    for (const level of pixel) {
      expect(level).toBeLessThan(32)
    }
  }, 120_000)
})
