import { InvalidArgumentError } from "@rosesfield/kernel"

export class FrameShapeUnfitError extends InvalidArgumentError {
  override readonly code = "MOTION_EDITOR_SHAPE_UNFIT"

  constructor() {
    super({
      message:
        "This editor edits only a square, 2:3 or 3:2 video, and this video has another shape",
      inputs: ["model"],
    })
  }
}
