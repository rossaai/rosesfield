import type { FrameScore } from "#remake/cut-finder"
import { remakeLimits } from "#remake/shot-plan"

const frameLine = /^frame:(\d+)\s/
const scoreLine = /^lavfi\.scene_score=([0-9.]+)\s*$/

export function sceneScoreArgsOf(reference: string): string[] {
  return [
    "ffmpeg",
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-i",
    reference,
    "-map",
    "0:v:0",
    "-vf",
    `fps=${remakeLimits.framesPerSecond},select='gte(scene,0)',metadata=print:file=-`,
    "-f",
    "null",
    "-",
  ]
}

export type SceneScores = {
  scores: FrameScore[]
  frameCount: number
}

export function sceneScoresOf(printed: string): SceneScores {
  const scores: FrameScore[] = []
  let frame: number | null = null
  let frameCount = 0
  for (const line of printed.split(/\r?\n/)) {
    const framed = frameLine.exec(line)
    if (framed !== null) {
      frame = Number(framed[1])
      frameCount = Math.max(frameCount, frame + 1)
      continue
    }
    const scored = scoreLine.exec(line)
    if (scored !== null && frame !== null) {
      scores.push({ frame, score: Number(scored[1]) })
      frame = null
    }
  }
  return { scores, frameCount }
}

export const planFrameLongestSide = 768

export function planFrameNameOf(index: number): string {
  return `frame-${index + 1}.jpg`
}

export function middleFramesArgsOf(options: {
  reference: string
  frames: readonly number[]
}): string[] {
  const side = planFrameLongestSide
  const picked = options.frames.map((frame) => `eq(n,${frame})`).join("+")
  return [
    "ffmpeg",
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-y",
    "-i",
    options.reference,
    "-map",
    "0:v:0",
    "-vf",
    `fps=${remakeLimits.framesPerSecond},select='${picked}',scale=w='min(${side},iw)':h='min(${side},ih)':force_original_aspect_ratio=decrease`,
    "-fps_mode",
    "passthrough",
    "-frames:v",
    String(options.frames.length),
    "-c:v",
    "mjpeg",
    "-f",
    "image2",
    "frame-%d.jpg",
  ]
}
