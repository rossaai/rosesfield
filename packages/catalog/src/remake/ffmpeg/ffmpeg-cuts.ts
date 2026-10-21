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

export function middleFrameArgsOf(options: {
  reference: string
  frame: number
  output: string
}): string[] {
  return [
    "ffmpeg",
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-y",
    "-i",
    options.reference,
    "-vf",
    `fps=${remakeLimits.framesPerSecond},select='eq(n,${options.frame})'`,
    "-frames:v",
    "1",
    "-c:v",
    "mjpeg",
    "-f",
    "image2",
    options.output,
  ]
}
