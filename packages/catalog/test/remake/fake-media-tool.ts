import {
  type MediaResult,
  type MediaRun,
  MediaTool,
} from "#remake/media-tool.port"

export function scoresOf(frameCount: number, cuts: readonly number[]): string {
  return Array.from(
    { length: frameCount },
    (_, frame) =>
      `frame:${frame}    pts:${frame}    pts_time:${frame / 24}\n` +
      `lavfi.scene_score=${cuts.includes(frame) ? "0.900000" : "0.010000"}`
  ).join("\n")
}

export class FakeMediaTool extends MediaTool {
  readonly runs: MediaRun[] = []
  private readonly scores: string
  private readonly hasSound: boolean

  constructor(scores: string, hasSound: boolean) {
    super()
    this.scores = scores
    this.hasSound = hasSound
  }

  override limitMs(): number {
    return 1000
  }

  override async run(run: MediaRun): Promise<MediaResult> {
    this.runs.push(run)
    const isScored = run.args.some((arg) => arg.includes("metadata=print"))
    const streams = [
      { codec_type: "video", width: 1920, height: 1080 },
      ...(this.hasSound ? [{ codec_type: "audio" }] : []),
    ]
    const stdout =
      run.args[0] === "ffprobe"
        ? JSON.stringify({ streams })
        : isScored
          ? this.scores
          : ""
    return {
      stdout,
      outputs: new Map(run.outputs.map((name) => [name, Uint8Array.of(7)])),
    }
  }

  joined(): readonly string[] {
    const joined = this.runs.find((run) => run.outputs.includes("remake.mp4"))
    return joined?.args ?? []
  }
}
