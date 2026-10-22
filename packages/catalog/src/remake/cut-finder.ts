import { type FoundShot, remakeLimits } from "#remake/shot-plan"

export type FrameScore = {
  frame: number
  score: number
}

export const cutFinder = {
  threshold: 0.3,
  shortestGapFrames: 6,
} as const

function cutFramesOf(
  scores: readonly FrameScore[],
  frameCount: number
): number[] {
  const cuts: number[] = []
  const ordered = [...scores].sort((a, b) => a.frame - b.frame)
  let last = 0
  for (const { frame, score } of ordered) {
    const isInside = frame > 0 && frame < frameCount
    const isApart =
      frame - last >= cutFinder.shortestGapFrames &&
      frameCount - frame >= cutFinder.shortestGapFrames
    if (isInside && isApart && score >= cutFinder.threshold) {
      cuts.push(frame)
      last = frame
    }
  }
  return cuts
}

export function shotsOf(
  scores: readonly FrameScore[],
  frameCount: number
): FoundShot[] {
  if (frameCount <= 0) {
    return []
  }
  const bounds = [0, ...cutFramesOf(scores, frameCount), frameCount]
  return bounds.slice(1).map((end, index) => ({
    number: index + 1,
    startSeconds: (bounds[index] ?? 0) / remakeLimits.framesPerSecond,
    endSeconds: end / remakeLimits.framesPerSecond,
  }))
}
