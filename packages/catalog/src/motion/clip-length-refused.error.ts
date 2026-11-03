import { InvalidArgumentError } from "@rosesfield/kernel"
import { clipPlanLimits } from "#motion/clip-plan"

const lengthTolerance = 0.001

/** Says whether a video of this many seconds is long enough for Motion: 2 seconds or more. A longer one than Motion keeps is trimmed to its first stretch, never refused. */
export function isClipLongEnough(seconds: number): boolean {
  return seconds >= clipPlanLimits.shortestSeconds - lengthTolerance
}

/** A video shorter than 2 seconds, refused before any paid step, in the words the screen uses. */
export class ClipLengthRefusedError extends InvalidArgumentError {
  override readonly code = "MOTION_CLIP_LENGTH"

  constructor(options: { seconds: number }) {
    const runs = Math.round(options.seconds * 10) / 10
    super({
      message: `This clip runs ${runs} seconds. Pick one of ${clipPlanLimits.shortestSeconds} seconds or more.`,
      inputs: ["clip"],
    })
  }
}
