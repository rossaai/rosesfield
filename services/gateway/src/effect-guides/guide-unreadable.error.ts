import { DependencyError } from "@rosesfield/kernel"

type GuideUnreadableErrorOptions = {
  file: string
  reason: string
}

export class GuideUnreadableError extends DependencyError {
  override readonly code = "EFFECT_GUIDE_UNREADABLE"

  constructor(options: GuideUnreadableErrorOptions) {
    super({
      message: `The preset guide ${options.file} ${options.reason}`,
    })
  }
}
