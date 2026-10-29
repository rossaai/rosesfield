import type { EngineFile } from "@rosesfield/generation"
import { z } from "zod"
import { base64Of } from "#media-base64"
import { planFrameSide, planFrameTimesOf } from "#motion/clip-plan"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import type { ClipFrames } from "#motion/comfy/clip-plan-engine"
import type { PlanImage } from "#motion/comfy/clip-plan-turn"
import type { MediaTool } from "#remake/media-tool.port"

const clipName = "clip"

const probed = z.object({
  format: z.object({ duration: z.coerce.number().positive() }),
})

export function frameNameOf(index: number): string {
  return `frame-${index + 1}.jpg`
}

export function durationArgsOf(clip: string): string[] {
  return [
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    clip,
  ]
}

/** One ffmpeg command that seeks the clip to each time and writes that frame, its long side at most 512 px. */
export function frameArgsOf(clip: string, times: readonly number[]): string[] {
  const side = planFrameSide
  const scale = `scale=w='min(${side},iw)':h='min(${side},ih)':force_original_aspect_ratio=decrease`
  return [
    "ffmpeg",
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-y",
    ...times.flatMap((time) => ["-ss", time.toFixed(3), "-i", clip]),
    ...times.flatMap((_, index) => [
      "-map",
      `${index}:v:0`,
      "-frames:v",
      "1",
      "-vf",
      scale,
      "-c:v",
      "mjpeg",
      frameNameOf(index),
    ]),
  ]
}

function durationOf(printed: string): number {
  let json: unknown = null
  try {
    json = JSON.parse(printed)
  } catch {
    json = null
  }
  const parsed = probed.safeParse(json)
  if (!parsed.success) {
    throw new ClipPlanUnreadableError({ cause: "the clip's length" })
  }
  return parsed.data.format.duration
}

/** Reads the 4 frames the plan sees from the clip with ffmpeg, where this server runs it. */
export class MediaClipFrames implements ClipFrames {
  private readonly tool: MediaTool

  constructor(options: { tool: MediaTool }) {
    this.tool = options.tool
  }

  async framesOf(clip: EngineFile): Promise<PlanImage[]> {
    const input = { name: clipName, bytes: clip.bytes }
    const probe = await this.tool.run({
      args: durationArgsOf(clipName),
      inputs: [input],
      outputs: [],
    })
    const times = planFrameTimesOf(durationOf(probe.stdout))
    const names = times.map((_, index) => frameNameOf(index))
    const made = await this.tool.run({
      args: frameArgsOf(clipName, times),
      inputs: [input],
      outputs: names,
    })
    return names.map((name) => {
      const bytes = made.outputs.get(name)
      if (bytes === undefined || bytes.length === 0) {
        throw new ClipPlanUnreadableError({ cause: `ffmpeg wrote no ${name}` })
      }
      return { mime: "image/jpeg", base64: base64Of(bytes) }
    })
  }
}
