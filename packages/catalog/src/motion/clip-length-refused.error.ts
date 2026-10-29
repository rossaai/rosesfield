import { InvalidArgumentError } from "@rosesfield/kernel"
import { clipPlanLimits } from "#motion/clip-plan"

const lengthTolerance = 0.001

/** Says whether a video of this many seconds is one Motion changes: 2 to 10 seconds. */
export function isClipLengthFit(seconds: number): boolean {
  return (
    seconds >= clipPlanLimits.shortestSeconds - lengthTolerance &&
    seconds <= clipPlanLimits.longestSeconds + lengthTolerance
  )
}

function sentenceOf(seconds: number): string {
  const runs = Math.round(seconds * 10) / 10
  return seconds > clipPlanLimits.longestSeconds
    ? `This clip runs ${runs} seconds. Pick one of ${clipPlanLimits.longestSeconds} seconds or less.`
    : `This clip runs ${runs} seconds. Pick one of ${clipPlanLimits.shortestSeconds} seconds or more.`
}

/** A video shorter than 2 or longer than 10 seconds, refused before any paid step, in the words the screen uses. */
export class ClipLengthRefusedError extends InvalidArgumentError {
  override readonly code = "MOTION_CLIP_LENGTH"

  constructor(options: { seconds: number }) {
    super({ message: sentenceOf(options.seconds), inputs: ["clip"] })
  }
}
