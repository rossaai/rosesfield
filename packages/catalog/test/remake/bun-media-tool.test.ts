import { RunFailedError } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { BunMediaTool } from "#remake/ffmpeg/bun-media-tool"
import { probeOf } from "#remake/ffmpeg/ffmpeg-probe"

describe("the media tool Remake runs ffmpeg through", () => {
  const tool = new BunMediaTool({ timeoutMs: 5000 })

  it("runs only ffmpeg and ffprobe", async () => {
    await expect(
      tool.run({ args: ["rm", "-rf", "."], inputs: [], outputs: [] })
    ).rejects.toBeInstanceOf(RunFailedError)
  })

  it("writes and reads files only inside its own folder", async () => {
    await expect(
      tool.run({
        args: ["ffprobe", "-version"],
        inputs: [{ name: "../escape.mp4", bytes: Uint8Array.of(1) }],
        outputs: [],
      })
    ).rejects.toBeInstanceOf(RunFailedError)
  })

  it("reads the picture size and whether the reference has sound", () => {
    const printed = JSON.stringify({
      streams: [
        { codec_type: "video", width: 1920, height: 1080 },
        { codec_type: "audio" },
      ],
    })
    expect(probeOf(printed)).toEqual({
      width: 1920,
      height: 1080,
      hasSound: true,
    })
  })

  it("control: a reference with a picture and no audio stream reads as silent", () => {
    const printed = JSON.stringify({
      streams: [{ codec_type: "video", width: 640, height: 360 }],
    })
    expect(probeOf(printed).hasSound).toBe(false)
    expect(probeOf("not json")).toEqual({
      width: null,
      height: null,
      hasSound: false,
    })
  })
})
