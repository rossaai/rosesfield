import { PreconditionFailedError } from "@rosesfield/kernel"

export class ShareKeyRequiredError extends PreconditionFailedError {
  override readonly code = "SHARE_KEY_REQUIRED"

  constructor() {
    super({ message: "Sharing a run needs the Comfy key that made it" })
  }
}
