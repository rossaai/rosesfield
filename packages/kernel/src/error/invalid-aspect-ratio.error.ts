import { InvalidArgumentError } from "#error/project.error"

type InvalidAspectRatioErrorOptions = {
  text: string
}

export class InvalidAspectRatioError extends InvalidArgumentError {
  override readonly code = "INVALID_ASPECT_RATIO"

  constructor(options: InvalidAspectRatioErrorOptions) {
    super({
      message: `${JSON.stringify(options.text.slice(0, 80))} is not an aspect ratio of two whole numbers from 1 to 99, such as 16:9`,
    })
  }
}
