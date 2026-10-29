import { InvalidArgumentError } from "@rosesfield/kernel"

export class ClipPlanNoTargetError extends InvalidArgumentError {
  override readonly code = "MOTION_NOTHING_TO_CHANGE"

  constructor() {
    super({
      message: "Nothing in the clip matches the photos or the sentence",
      inputs: ["photos", "clip"],
    })
  }
}
