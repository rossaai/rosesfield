import type { EngineFile } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { frameArgsOf, MediaClipFrames } from "#motion/ffmpeg/media-clip-frames"
import {
  type MediaResult,
  type MediaRun,
  MediaTool,
} from "#remake/media-tool.port"

class FramesTool extends MediaTool {
  readonly runs: MediaRun[] = []
  private readonly printed: string

  constructor(printed: string) {
    super()
    this.printed = printed
  }

  override limitMs(): number {
    return 1000
  }

  override async run(run: MediaRun): Promise<MediaResult> {
    this.runs.push(run)
    if (run.args[0] === "ffprobe") {
      return { stdout: this.printed, outputs: new Map() }
    }
    return {
      stdout: "",
      outputs: new Map(
        run.outputs.map((name) => [name, Uint8Array.of(255, 216)])
      ),
    }
  }
}

const clip: EngineFile = {
  assetId: assetIdFormat.parse("1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a"),
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(0, 0, 0, 24),
}

describe("the frames the plan reads on a server that runs ffmpeg", () => {
  it("reads the clip's length, then writes its first frame, two in the middle and its last in one command, each at most 512 px on the long side", async () => {
    const tool = new FramesTool(
      JSON.stringify({ format: { duration: "4.050000" } })
    )
    const frames = await new MediaClipFrames({ tool }).framesOf(clip)
    expect(frames).toEqual(
      Array.from({ length: 4 }, () => ({ mime: "image/jpeg", base64: "/9g=" }))
    )
    const [probe, made] = tool.runs
    expect(probe?.args.slice(0, 1)).toEqual(["ffprobe"])
    expect(made?.args.filter((_, at, all) => all[at - 1] === "-ss")).toEqual([
      "0.000",
      "1.333",
      "2.667",
      "4.000",
    ])
    expect(made?.outputs).toEqual([
      "frame-1.jpg",
      "frame-2.jpg",
      "frame-3.jpg",
      "frame-4.jpg",
    ])
    expect(frameArgsOf("clip", [0]).join(" ")).toContain("min(512,iw)")
  })

  it("refuses a clip whose length ffprobe cannot read, the control", async () => {
    const tool = new FramesTool("{}")
    await expect(
      new MediaClipFrames({ tool }).framesOf(clip)
    ).rejects.toMatchObject({ code: "MOTION_PLAN_UNREADABLE" })
    expect(tool.runs).toHaveLength(1)
  })
})
