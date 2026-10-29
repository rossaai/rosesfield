import { InvalidArgumentError } from "@rosesfield/kernel"

/** A photo that is not a PNG, JPEG or WebP file, refused as a photo before the plan runs. */
export class ClipPhotoUnreadableError extends InvalidArgumentError {
  override readonly code = "MOTION_PHOTO_UNREADABLE"

  constructor(options: { number: number }) {
    super({
      message: `Photo ${options.number} is not a PNG, JPEG or WebP file. Pick another photo.`,
      inputs: ["photo"],
    })
  }
}
