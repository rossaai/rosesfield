import { PreconditionFailedError } from "@rosesfield/kernel"

/** This host runs no tool that reads a video, so your own video changes only in the app, which reads it in the browser. */
export class OwnVideoInAppError extends PreconditionFailedError {
  override readonly code = "MOTION_OWN_VIDEO_IN_APP"

  constructor() {
    super({
      message:
        "This host cannot read a video for the agent. Open Motion in the app to use your own video.",
    })
  }
}
